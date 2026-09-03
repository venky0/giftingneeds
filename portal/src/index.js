/**
 * Gifting Needs client portal — Worker entry point.
 *
 * Serves the portal at /customer-login, proxies Google Drive so customers
 * download through giftingneeds.org, and takes catalogue access requests
 * from the public site.
 *
 * Access control, in order:
 *   1. Cloudflare Access sits in front of the hostname. An
 *      unauthenticated request never reaches the portal or the file
 *      routes.
 *   2. Access sets Cf-Access-Authenticated-User-Email on what it lets
 *      through. That address decides which folder the caller may read.
 *
 * Two routes are deliberately public and must be excluded from Access by
 * a Bypass application, or the request form on giftingneeds.in cannot
 * reach them and the approve link in the client's email will demand a
 * login the client may not have:
 *
 *   POST /api/request-access
 *   GET|POST /api/approve
 *
 * Everything else stays behind Access.
 */

import { listFolderTree, streamFile } from './drive.js';
import { readRequest, signRequest, verifyToken, grantAccess, emailRequest } from './approval.js';

const PORTAL_PATH = '/customer-login';

/** Origins allowed to post the request form. The public site only. */
const ALLOWED_ORIGINS = new Set([
  'https://giftingneeds.in',
  'https://www.giftingneeds.in',
]);

/** Who may read which Drive folder. Addresses are lower-cased on compare. */
function folderMap(env) {
  try {
    return JSON.parse(env.CUSTOMER_FOLDERS || '{}');
  } catch {
    return {};
  }
}

function identity(request) {
  // Set by Cloudflare Access. Absent means Access is not in front of
  // this hostname — which must never be treated as "allow".
  return (request.headers.get('Cf-Access-Authenticated-User-Email') || '').toLowerCase();
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Which folders this caller may see. Empty array means none. */
function allowedFolders(request, env) {
  const email = identity(request);
  if (!email) return { email: null, folders: [] };
  const map = folderMap(env);

  const entry = map[email] || map['*'];   // '*' = a folder shared with everyone approved
  if (!entry) return { email, folders: [] };
  return { email, folders: Array.isArray(entry) ? entry : [entry] };
}

/* ------------------------------------------------------------ approval UI */

const PAGE_CSS = `
  :root { color-scheme: light; }
  body { margin:0; min-height:100vh; display:flex; align-items:center;
         justify-content:center; background:#FBF7EE; padding:1.5rem;
         font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         color:#2B2440; }
  .card { background:#fff; border:1px solid rgba(201,123,20,.25); border-radius:14px;
          max-width:34rem; width:100%; padding:2rem; box-shadow:0 1px 3px rgba(0,0,0,.06); }
  h1 { font-size:1.4rem; margin:0 0 .75rem; }
  dl { margin:1.25rem 0; padding:1rem; background:#FBF7EE; border-radius:10px; }
  dt { font-size:.75rem; letter-spacing:.08em; text-transform:uppercase; color:#7A6F8E; }
  dd { margin:.15rem 0 .8rem; font-weight:600; word-break:break-word; }
  dd:last-child { margin-bottom:0; }
  .warn { background:#FDF3E3; border-left:3px solid #C97B14; padding:.9rem 1rem;
          border-radius:0 8px 8px 0; font-size:.94rem; }
  button { font:inherit; font-weight:700; cursor:pointer; border:0; border-radius:10px;
           background:#1F6F43; color:#fff; padding:.85rem 1.6rem; width:100%; }
  button:hover { background:#195a36; }
  .muted { color:#7A6F8E; font-size:.9rem; }
`;

const page = (title, inner, status = 200) => new Response(
  `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
   <meta name="viewport" content="width=device-width,initial-scale=1">
   <meta name="robots" content="noindex,nofollow">
   <title>${title} | Gifting Needs</title><style>${PAGE_CSS}</style></head>
   <body><div class="card">${inner}</div></body></html>`,
  { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
);

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ================= public: request catalogue access ================= */

    if (url.pathname === '/api/request-access') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request) });
      }
      if (request.method !== 'POST') {
        return json({ error: 'method_not_allowed' }, 405, corsHeaders(request));
      }

      const cors = corsHeaders(request);
      let form;
      try {
        form = await request.json();
      } catch {
        return json({ error: 'bad_request', message: 'Could not read the form.' }, 400, cors);
      }

      const { req, error } = readRequest(form || {});
      if (error) return json({ error: 'invalid', message: error }, 400, cors);

      try {
        const token = await signRequest(env, req);
        const approveUrl = `${url.origin}/api/approve?t=${encodeURIComponent(token)}`;
        await emailRequest(env, req, approveUrl);
      } catch (err) {
        // Do not surface the reason: it would tell an anonymous caller
        // whether the mail key is configured and what the API said.
        console.error('request-access failed:', err && err.message);
        return json({
          error: 'send_failed',
          message: 'We could not send your request just now. Please call +91 63610 54099.',
        }, 502, cors);
      }

      return json({ ok: true }, 200, cors);
    }

    /* ===================== public: approve a request ==================== */

    if (url.pathname === '/api/approve') {
      const token = request.method === 'POST'
        ? (await request.formData().catch(() => new FormData())).get('t')
        : url.searchParams.get('t');

      const data = await verifyToken(env, token);

      if (!data) {
        return page('Link not valid', `
          <h1>This approval link is not valid</h1>
          <p>It may have been altered in transit, or it was not created by
             this site. Nothing has been changed.</p>
          <p class="muted">Ask the customer to submit the form again at
             giftingneeds.in.</p>`, 400);
      }
      if (data.expired) {
        return page('Link expired', `
          <h1>This approval link has expired</h1>
          <p>Approval links last 7 days. Nothing has been changed, and
             <strong>${esc(data.email)}</strong> has not been given access.</p>
          <p class="muted">Ask them to request access again at giftingneeds.in.</p>`, 410);
      }

      // GET only ever shows the button. Mail scanners and link previewers
      // fetch every URL in an email; if this granted access, access would
      // be granted the moment the message arrived.
      if (request.method !== 'POST') {
        return page('Approve access', `
          <h1>Approve catalogue access?</h1>
          <dl>
            <dt>Name</dt><dd>${esc(data.name)}</dd>
            <dt>Company</dt><dd>${esc(data.company) || '<span class="muted">Not given</span>'}</dd>
            <dt>Email</dt><dd>${esc(data.email)}</dd>
            <dt>Phone</dt><dd>${esc(data.phone) || '<span class="muted">Not given</span>'}</dd>
          </dl>
          <p class="warn">Approving lets this address view and download
             <strong>every catalogue in the portal</strong>, including cost
             and price lists. Only approve someone you recognise.</p>
          <form method="POST" style="margin-top:1.25rem">
            <input type="hidden" name="t" value="${esc(token)}">
            <button type="submit">Approve ${esc(data.email)}</button>
          </form>
          <p class="muted" style="margin-bottom:0">To refuse, just close this page.
             Nothing changes unless you press the button.</p>`);
      }

      try {
        const { added } = await grantAccess(env, data.email);
        return page('Approved', `
          <h1>${added ? 'Access granted' : 'Already had access'}</h1>
          <p><strong>${esc(data.email)}</strong> ${added
            ? 'can now sign in at giftingneeds.org/customer-login.'
            : 'was already on the approved list. Nothing changed.'}</p>
          <p class="muted">They sign in with a six-digit code sent to that
             address — no password, and no account to create.</p>`);
      } catch (err) {
        console.error('approve failed:', err && err.message);
        return page('Could not approve', `
          <h1>That did not go through</h1>
          <p>Cloudflare would not accept the change, so
             <strong>${esc(data.email)}</strong> has <em>not</em> been given access.</p>
          <p class="muted">The link still works — try again in a moment. If it keeps
             failing, add the address by hand in Zero Trust and tell your developer.</p>`, 502);
      }
    }

    /* ==================== behind Access from here down ================== */

    if (url.pathname === '/api/me') {
      const { email, folders } = allowedFolders(request, env);
      return json({ email, folderCount: folders.length, gated: Boolean(email) });
    }

    if (url.pathname === '/api/files') {
      const { email, folders } = allowedFolders(request, env);
      if (!email) {
        return json({ error: 'not_authenticated',
          message: 'Cloudflare Access is not in front of this site.' }, 401);
      }
      if (!folders.length) {
        return json({ email, groups: [] });
      }
      try {
        const groups = [];
        for (const f of folders) {
          // A library may be a flat pile of PDFs or split into category
          // subfolders. Either way this returns groups, so the portal
          // renders the client's own structure instead of flattening it.
          const tree = await listFolderTree(env, f.id || f, f.label || 'Documents');
          for (const g of tree) {
            groups.push({
              label: g.label,
              files: g.files.map(x => ({
                id: x.id,
                name: x.name,
                size: x.size ? Number(x.size) : null,
                modified: x.modifiedTime || null,
              })),
            });
          }
        }
        return json({ email, groups });
      } catch (err) {
        return json({ email, error: 'drive_error', message: String(err.message || err) }, 502);
      }
    }

    if (url.pathname.startsWith('/api/file/')) {
      const { email, folders } = allowedFolders(request, env);
      if (!email) return new Response('Forbidden', { status: 403 });

      const fileId = decodeURIComponent(url.pathname.slice('/api/file/'.length));
      if (!fileId) return new Response('Not found', { status: 404 });

      // A file id alone must not be enough: confirm it sits in a folder
      // this caller is allowed to read, or anyone approved for one
      // customer could pull another customer's document by guessing.
      try {
        // Must walk the same tree the listing does. Checking only the top
        // level would refuse every file sitting in a category subfolder —
        // the customer would see it listed and get a 404 on download.
        let match = null;
        for (const f of folders) {
          const tree = await listFolderTree(env, f.id || f, f.label || 'Documents');
          for (const g of tree) {
            const hit = g.files.find(x => x.id === fileId);
            if (hit) { match = hit; break; }
          }
          if (match) break;
        }
        if (!match) return new Response('Not found', { status: 404 });
        return await streamFile(env, fileId, match.name);
      } catch (err) {
        return new Response(`Upstream error: ${err.message || err}`, { status: 502 });
      }
    }

    /* -------------------------- the portal itself ----------------------- */

    // The portal lives at /customer-login. The root redirects there so an
    // old bookmark still lands somewhere useful.
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return Response.redirect(`${url.origin}${PORTAL_PATH}`, 302);
    }
    if (url.pathname === PORTAL_PATH || url.pathname === `${PORTAL_PATH}/`) {
      return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
    }

    return env.ASSETS.fetch(request);
  },
};
