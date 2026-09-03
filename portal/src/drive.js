/**
 * Google Drive access for the client portal, via a service account.
 *
 * Why a service account rather than sharing folders with customers:
 * the client should grant access in exactly one place — the Cloudflare
 * Access policy. Sharing each Drive folder with each customer would be a
 * second allowlist to maintain by hand, and a customer without a Google
 * account could not use it at all.
 *
 * So the folders are shared with one service account and nobody else.
 * The Worker holds that account's key, fetches on the customer's behalf,
 * and streams the bytes back through giftingneeds.org. Customers never
 * see Drive and never need a Google login.
 */

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

/* ---------------------------------------------------------------- JWT */

function b64url(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf;
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem) {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = atob(body);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

/**
 * Exchange the service account key for an access token.
 * Tokens last an hour; they are cached in module scope so a burst of
 * requests on one isolate does not mint a new one each time.
 */
let cachedToken = null;

async function getAccessToken(env) {
  if (cachedToken && cachedToken.expires > Date.now() + 60_000) {
    return cachedToken.value;
  }

  let key;
  try {
    key = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT);
  } catch {
    throw new Error('GOOGLE_SERVICE_ACCOUNT is not valid JSON');
  }
  if (!key.client_email || !key.private_key) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT is missing client_email or private_key');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: key.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${b64url(new TextEncoder().encode(JSON.stringify(header)))}.` +
                   `${b64url(new TextEncoder().encode(JSON.stringify(claim)))}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(key.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(unsigned));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${b64url(sig)}`,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google refused the service account: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = { value: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

/* -------------------------------------------------------------- Drive */

const FOLDER_MIME = 'application/vnd.google-apps.folder';

/**
 * Everything under a folder, as groups the portal can render.
 *
 * The client organises some libraries into category subfolders and some
 * as a flat pile of PDFs. Listing only the top level turns the first kind
 * into ten undownloadable rows named after folders, so this walks in.
 *
 * Subfolders become their own group, which keeps the client's categories
 * intact rather than flattening the lot into one long list. Depth and
 * total folders visited are capped: a mis-shared drive should degrade to
 * fewer results, never to a Worker that runs until it is killed.
 */
export async function listFolderTree(env, folderId, label, opts = {}) {
  const maxDepth = opts.maxDepth ?? 2;
  const maxFolders = opts.maxFolders ?? 40;

  const groups = [];
  let visited = 0;

  async function walk(id, name, depth) {
    if (visited >= maxFolders) return;
    visited++;

    const entries = await listFolder(env, id);
    const files = entries.filter(e => e.mimeType !== FOLDER_MIME);
    const subs  = entries.filter(e => e.mimeType === FOLDER_MIME);

    if (files.length) groups.push({ label: name, files });

    if (depth >= maxDepth) return;
    for (const sub of subs) {
      // "Parent — Child" only past the first level, or every group on a
      // one-level library would be needlessly prefixed.
      const childName = depth === 0 ? sub.name : `${name} — ${sub.name}`;
      await walk(sub.id, childName, depth + 1);
    }
  }

  await walk(folderId, label || 'Documents', 0);
  return groups;
}

/** Files directly inside one folder, newest first. */
export async function listFolder(env, folderId) {
  const token = await getAccessToken(env);
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id,name,mimeType,size,modifiedTime)',
    orderBy: 'name',
    pageSize: '1000',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });
  const res = await fetch(`${DRIVE_API}/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Drive list failed: ${res.status} ${await res.text()}`);
  }
  const { files = [] } = await res.json();
  return files;
}

/**
 * Stream one file back to the caller.
 *
 * The body is passed through rather than buffered — some catalogues are
 * over 100 MB and a Worker must not hold those in memory.
 */
export async function streamFile(env, fileId, filename) {
  const token = await getAccessToken(env);
  const res = await fetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    return new Response('File unavailable', { status: res.status === 404 ? 404 : 502 });
  }
  const headers = new Headers();
  headers.set('Content-Type', res.headers.get('Content-Type') || 'application/octet-stream');
  const len = res.headers.get('Content-Length');
  if (len) headers.set('Content-Length', len);
  if (filename) {
    // Quote-escape so a filename with a quote cannot break the header.
    const safe = filename.replace(/["\\]/g, '_');
    headers.set('Content-Disposition',
      `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
  }
  headers.set('Cache-Control', 'private, no-store');
  return new Response(res.body, { status: 200, headers });
}
