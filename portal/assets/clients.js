/**
 * Gifting Needs client portal — front end.
 *
 * This file protects nothing. Cloudflare Access decides who reaches the
 * page; the Worker decides which Drive folder that address may read and
 * streams the bytes. Everything here just draws the result.
 *
 * There is no per-customer HTML and no manifest of customers: one page
 * serves everyone, and the Worker returns only the caller's own files.
 * That removes the risk of one customer reading another's name off a
 * shared file.
 */

const ClientPortal = (() => {

  const LOGOUT_URL = '/cdn-cgi/access/logout';
  const $ = id => document.getElementById(id);

  const esc = s => String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function niceSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    const mb = bytes / 1048576;
    return mb >= 1 ? `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
                   : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function niceDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-IN',
        { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ''; }
  }

  function showStatus(state, email) {
    const el = $('portal-status');
    if (!el) return;
    if (state === 'secure') {
      el.className = 'portal-status portal-status-secure';
      el.innerHTML = `<span>Signed in as <strong>${esc(email)}</strong></span>
        <a class="portal-signout" href="${LOGOUT_URL}">Sign out</a>`;
    } else {
      el.className = 'portal-status portal-status-open';
      el.innerHTML = `<span><strong>This page is not protected yet.</strong>
        Cloudflare Access is not in front of this site, so anyone with the
        link can open it. Do not share it until the Access application is
        live. Setup steps are in CLIENT-PORTAL.md.</span>`;
    }
  }

  function fileRow(f) {
    const meta = [niceSize(f.size), niceDate(f.modified)].filter(Boolean).join(' · ');
    return `
      <li class="portal-file">
        <div class="portal-file-main">
          <span class="portal-file-label">${esc(f.name)}</span>
          ${meta ? `<span class="portal-file-note">${esc(meta)}</span>` : ''}
        </div>
        <a class="btn btn-outline portal-file-dl"
           href="/api/file/${encodeURIComponent(f.id)}">Download</a>
      </li>`;
  }

  function render(data) {
    const root = $('portal-root');
    const groups = data.groups || [];
    const total = groups.reduce((n, g) => n + g.files.length, 0);

    if (!total) {
      root.innerHTML = `<p class="portal-empty">No documents have been shared
        with your account yet. Your account manager will add them shortly.</p>`;
      return;
    }

    root.innerHTML = groups.map(g => `
      <section class="portal-group">
        <h2 class="portal-group-title">${esc(g.label)}
          <span>${g.files.length} ${g.files.length === 1 ? 'file' : 'files'}</span></h2>
        <ul class="portal-files">${g.files.map(fileRow).join('')}</ul>
      </section>`).join('');
  }

  function renderError(msg, detail) {
    $('portal-root').innerHTML = `
      <p class="portal-empty"><strong>${esc(msg)}</strong>
      ${detail ? `<br><span style="font-size:.88rem">${esc(detail)}</span>` : ''}</p>`;
  }

  async function init() {
    const root = $('portal-root');
    if (!root) return;
    root.innerHTML = '<p class="portal-empty">Loading your documents…</p>';

    let res, data;
    try {
      res = await fetch('/api/files', { cache: 'no-store' });
      data = await res.json();
    } catch (err) {
      showStatus('open');
      renderError('Could not reach the document service.', String(err));
      return;
    }

    if (res.status === 401 || !data.email) {
      showStatus('open');
      renderError('Not signed in.',
        'Cloudflare Access is not in front of this site yet.');
      return;
    }

    showStatus('secure', data.email);

    if (data.error) {
      renderError('The document service returned an error.', data.message);
      return;
    }
    render(data);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();

if (typeof window !== 'undefined') window.ClientPortal = ClientPortal;
