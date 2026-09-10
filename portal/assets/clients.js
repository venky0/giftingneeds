/**
 * Gifting Needs client portal — front end.
 *
 * This file protects nothing, and neither does anything behind it:
 * the catalogues are open to anyone with the link, by request.
 *
 * There is no per-customer HTML and no manifest of customers: one page
 * serves everyone, and the Worker returns only the caller's own files.
 * That removes the risk of one customer reading another's name off a
 * shared file.
 */

const ClientPortal = (() => {

  // Cloudflare's bare logout endpoint finishes on a black page reading
  // "No Access cookie found. Please login first." — it describes a
  // successful sign-out as a failure, and offers no way back. returnTo
  // lands the customer on our own login screen instead.
  //
  // It must be same-origin: a cross-domain target (giftingneeds.in) is
  // rejected outright with "Invalid redirect URL".
  const LOGOUT_URL = '/cdn-cgi/access/logout?returnTo=' +
    encodeURIComponent(location.origin + '/');
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

    root.innerHTML = groups.map((g, i) => `
      <section class="portal-group">
        <h2 class="portal-group-title">
          <button class="portal-group-toggle" aria-expanded="false" aria-controls="catalogue-files-${i}">
            ${esc(g.label)}
            <span>${g.files.length} ${g.files.length === 1 ? 'file' : 'files'}</span>
          </button>
        </h2>
        <ul class="portal-files" id="catalogue-files-${i}" hidden>${g.files.map(fileRow).join('')}</ul>
      </section>`).join('');

    root.querySelectorAll('.portal-group-toggle').forEach(button => {
      button.addEventListener('click', () => {
        const opening = button.getAttribute('aria-expanded') !== 'true';
        root.querySelectorAll('.portal-group-toggle').forEach(other => {
          const expanded = other === button && opening;
          other.setAttribute('aria-expanded', String(expanded));
          $(other.getAttribute('aria-controls')).hidden = !expanded;
        });
        if (opening) {
          const firstFile = $(button.getAttribute('aria-controls')).firstElementChild;
          firstFile?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start'
          });
        }
      });
    });
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
      renderError('Could not reach the document service.', String(err));
      return;
    }

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
