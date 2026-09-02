/**
 * Catalogue access requests, and the approval that grants them.
 *
 * A visitor to giftingneeds.in asks for the catalogues. That request is
 * emailed to the client, who clicks one link to approve. The approval
 * adds the address to the Cloudflare Access policy, which is the single
 * place access is granted — so approving is the whole job. Nobody edits
 * Drive sharing, and nobody touches the dashboard.
 *
 * Two things about this file are load-bearing:
 *
 *   1. Approval is a POST, never a GET. The approve link opens a page
 *      with a button on it. Mail clients, security scanners and link
 *      previewers routinely fetch every URL in an email — if a GET
 *      granted access, a scanner would silently approve every request
 *      the moment it landed in the inbox.
 *
 *   2. The token is signed and expiring, and carries the address inside
 *      it. Nothing about who gets approved is taken from the request
 *      that arrives at the approve endpoint, so the link cannot be
 *      edited to admit somebody else.
 */

const CF_API = 'https://api.cloudflare.com/client/v4';
const WEB3FORMS = 'https://api.web3forms.com/submit';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;   // a working week

/* ------------------------------------------------------------ helpers */

const enc = new TextEncoder();

function b64url(bytes) {
  let s = '';
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(s) {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(pad + '='.repeat((4 - pad.length % 4) % 4));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', key, enc.encode(data));
}

/** Constant-time compare, so a wrong signature leaks nothing by timing. */
function sameBytes(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function validEmail(s) {
  return typeof s === 'string' &&
         s.length <= 254 &&
         /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

const clean = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);

/* ------------------------------------------------------------- tokens */

export async function signRequest(env, req) {
  const payload = JSON.stringify({
    e: req.email.toLowerCase(),
    n: req.name,
    c: req.company,
    p: req.phone,
    x: Date.now() + TOKEN_TTL_MS,
  });
  const body = b64url(enc.encode(payload));
  return `${body}.${b64url(await hmac(env.APPROVAL_SECRET, body))}`;
}

export async function verifyToken(env, token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.', 2);

  let expected;
  try {
    expected = new Uint8Array(await hmac(env.APPROVAL_SECRET, body));
  } catch {
    return null;
  }
  let given;
  try {
    given = unb64url(sig);
  } catch {
    return null;
  }
  if (!sameBytes(expected, given)) return null;

  let data;
  try {
    data = JSON.parse(new TextDecoder().decode(unb64url(body)));
  } catch {
    return null;
  }
  if (!data || !validEmail(data.e)) return null;
  if (!data.x || Date.now() > data.x) return { expired: true, email: data.e };

  return { email: data.e, name: data.n, company: data.c, phone: data.p };
}

/* -------------------------------------------------- granting the access */

/**
 * Append one address to the Access policy's include list.
 *
 * Read-modify-write: the whole include array is replaced, so this reads
 * the live policy first rather than assuming what is in it. Losing an
 * existing customer here would lock them out silently.
 */
export async function grantAccess(env, email) {
  const url = `${CF_API}/accounts/${env.CF_ACCOUNT_ID}/access/policies/${env.CF_POLICY_ID}`;
  const auth = { Authorization: `Bearer ${env.CF_API_TOKEN}`, 'Content-Type': 'application/json' };

  const read = await fetch(url, { headers: auth });
  if (!read.ok) throw new Error(`Could not read the access policy (${read.status})`);
  const { result: policy, success } = await read.json();
  if (!success || !policy) throw new Error('Cloudflare returned no policy');

  const include = Array.isArray(policy.include) ? policy.include : [];
  const already = include.some(r => r?.email?.email?.toLowerCase() === email);
  if (already) return { added: false, total: include.length };

  const next = include.concat([{ email: { email } }]);
  const write = await fetch(url, {
    method: 'PUT',
    headers: auth,
    body: JSON.stringify({
      name: policy.name,
      decision: policy.decision,
      include: next,
      exclude: policy.exclude || [],
      require: policy.require || [],
    }),
  });
  if (!write.ok) {
    throw new Error(`Could not update the access policy (${write.status} ${await write.text()})`);
  }
  return { added: true, total: next.length };
}

/* --------------------------------------------------------------- email */

export async function emailRequest(env, req, approveUrl) {
  if (!env.WEB3FORMS_KEY) throw new Error('WEB3FORMS_KEY is not set');

  const lines = [
    `${req.name} has asked for access to the Gifting Needs catalogues.`,
    '',
    `Name:     ${req.name}`,
    `Company:  ${req.company || '(not given)'}`,
    `Email:    ${req.email}`,
    `Phone:    ${req.phone || '(not given)'}`,
    '',
    'To approve, open this link and press the button on the page:',
    approveUrl,
    '',
    'Approving adds this address to the client portal straight away.',
    'They will be able to view and download every catalogue in it,',
    'including any cost and price lists. Only approve addresses you',
    'recognise. The link stops working after 7 days.',
    '',
    'To refuse, ignore this email. Nothing happens without the button.',
  ].join('\n');

  const res = await fetch(WEB3FORMS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: env.WEB3FORMS_KEY,
      subject: `Catalogue access request — ${req.name}${req.company ? ` (${req.company})` : ''}`,
      from_name: 'Gifting Needs portal',
      replyto: req.email,
      message: lines,
    }),
  });
  if (!res.ok) throw new Error(`Email service refused the request (${res.status})`);
  const out = await res.json().catch(() => ({}));
  if (out.success === false) throw new Error(out.message || 'Email service rejected the request');
}

/* ------------------------------------------------------- request intake */

export function readRequest(form) {
  const name    = clean(form.name, 80);
  const company = clean(form.company, 120);
  const email   = clean(form.email, 254).toLowerCase();
  const phone   = clean(form.phone, 40);

  if (!name)              return { error: 'Please tell us your name.' };
  if (!validEmail(email)) return { error: 'That email address does not look right.' };

  return { req: { name, company, email, phone } };
}
