/**
 * Gifting Needs client portal — Worker entry point.
 *
 * Serves the static portal, plus two API routes that proxy Google Drive
 * so customers download through giftingneeds.org and never touch Drive.
 *
 * Access control, in order:
 *   1. Cloudflare Access sits in front of the whole hostname. An
 *      unauthenticated request never reaches this code.
 *   2. Access sets Cf-Access-Authenticated-User-Email on what it lets
 *      through. That address decides which folder the caller may read.
 *
 * Step 2 is what allows one Access policy to serve many customers
 * without any of them seeing each other's documents: the folder mapping
 * lives here, server-side, and is never sent to the browser.
 */

import { listFolder, streamFile } from './drive.js';

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

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ---- who am I, and what may I see ---- */
    if (url.pathname === '/api/me') {
      const { email, folders } = allowedFolders(request, env);
      return json({ email, folderCount: folders.length, gated: Boolean(email) });
    }

    /* ---- list the caller's documents ---- */
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
          const files = await listFolder(env, f.id || f);
          groups.push({
            label: f.label || 'Documents',
            files: files.map(x => ({
              id: x.id,
              name: x.name,
              size: x.size ? Number(x.size) : null,
              modified: x.modifiedTime || null,
            })),
          });
        }
        return json({ email, groups });
      } catch (err) {
        return json({ error: 'drive_error', message: String(err.message || err) }, 502);
      }
    }

    /* ---- download one file ---- */
    if (url.pathname.startsWith('/api/file/')) {
      const { email, folders } = allowedFolders(request, env);
      if (!email) return new Response('Forbidden', { status: 403 });

      const fileId = decodeURIComponent(url.pathname.slice('/api/file/'.length));
      if (!fileId) return new Response('Not found', { status: 404 });

      // A file id alone must not be enough: confirm it sits in a folder
      // this caller is allowed to read, or anyone approved for one
      // customer could pull another customer's document by guessing.
      try {
        let match = null;
        for (const f of folders) {
          const files = await listFolder(env, f.id || f);
          match = files.find(x => x.id === fileId);
          if (match) break;
        }
        if (!match) return new Response('Not found', { status: 404 });
        return await streamFile(env, fileId, match.name);
      } catch (err) {
        return new Response(`Upstream error: ${err.message || err}`, { status: 502 });
      }
    }

    /* ---- everything else is the static portal ---- */
    return env.ASSETS.fetch(request);
  },
};
