/**
 * Gifting Needs — client portal
 *
 * IMPORTANT, and worth being blunt about: this file does not protect
 * anything. The site is static, so any check written here runs in the
 * visitor's browser and can be skipped by requesting a file's URL
 * directly. Access is enforced only by Cloudflare Access sitting in
 * front of /clients/*, before a request ever reaches these pages.
 *
 * What this file does is the part a static page legitimately can:
 *   - ask Cloudflare who the visitor is and greet them by name
 *   - render the file list for their folder
 *   - state plainly, and loudly, when Access is NOT yet in front of the
 *     page, so nobody uploads a customer's private files believing the
 *     folder is protected when it is still public
 */

const ClientPortal = (() => {

  // Cloudflare Access publishes the signed-in identity here once an
  // application covers this path. A 404 or a network error means no
  // Access application is in front of this page.
  const IDENTITY_URL = '/cdn-cgi/access/get-identity';
  const LOGOUT_URL = '/cdn-cgi/access/logout';

  const $ = id => document.getElementById(id);

  async function whoAmI() {
    try {
      const res = await fetch(IDENTITY_URL, { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.email ? data : null;
    } catch {
      return null;
    }
  }

  function renderUnprotectedWarning() {
    const el = $('portal-status');
    if (!el) return;
    el.className = 'portal-status portal-status-open';
    el.innerHTML = `
      <span><strong>This page is not protected yet.</strong>
      Cloudflare Access is not in front of this folder, so anyone with the
      link can open the page and download everything in it. Do not place a
      customer's private files here until the Access application is live.
      Setup steps are in CLIENT-PORTAL.md.</span>`;
  }

  function renderSignedIn(identity) {
    const el = $('portal-status');
    if (!el) return;
    el.className = 'portal-status portal-status-secure';
    el.innerHTML = `
      <span>Signed in as <strong>${escapeHtml(identity.email)}</strong></span>
      <a class="portal-signout" href="${LOGOUT_URL}">Sign out</a>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function driveCard(d, identity) {
    if (!d || !d.url) {
      return `<p class="portal-empty">Your folder has not been linked yet.
        Your account manager will share it shortly.</p>`;
    }
    // The portal login and the Drive share are two separate allowlists.
    // Naming the expected address here turns a confusing Google refusal
    // into something the customer can act on.
    const who = identity && identity.email
      ? `<span class="portal-drive-who">Shared with <strong>${escapeHtml(identity.email)}</strong>.
         If Google refuses, you are signed into a different account there.</span>`
      : '';
    return `
      <a class="portal-drive" href="${escapeHtml(d.url)}" target="_blank" rel="noopener">
        <span class="portal-drive-icon" aria-hidden="true">△</span>
        <span class="portal-drive-main">
          <strong>${escapeHtml(d.label || 'Your documents')}</strong>
          ${d.note ? `<span class="portal-drive-note">${escapeHtml(d.note)}</span>` : ''}
          ${who}
        </span>
        <span class="btn btn-gold portal-drive-cta">Open folder</span>
      </a>`;
  }

  function fileRow(f, base) {
    const href = `${base}${encodeURIComponent(f.file)}`;
    return `
      <li class="portal-file">
        <div class="portal-file-main">
          <span class="portal-file-label">${escapeHtml(f.label || f.file)}</span>
          ${f.note ? `<span class="portal-file-note">${escapeHtml(f.note)}</span>` : ''}
        </div>
        <span class="portal-file-kind">${escapeHtml(f.kind || '')}</span>
        <a class="btn btn-outline portal-file-dl" href="${href}" download>Download</a>
      </li>`;
  }

  async function init() {
    // The status strip belongs on every portal page, including the
    // landing page that has no file list — an unprotected folder is
    // exactly as dangerous there.
    const identity = await whoAmI();
    if (identity) renderSignedIn(identity); else renderUnprotectedWarning();

    const root = $('portal-root');
    if (!root) return;

    // Which customer folder is this page for?
    const slug = root.dataset.customer;
    let manifest;
    try {
      const res = await fetch('../manifest.json', { cache: 'no-store' });
      manifest = await res.json();
    } catch {
      root.innerHTML = `<p class="portal-empty">Could not load the file list.
        Please contact your account manager.</p>`;
      return;
    }

    const customer = (manifest.customers || []).find(c => c.slug === slug);
    if (!customer) {
      root.innerHTML = `<p class="portal-empty">No files are listed for this
        account yet. Your account manager will add them shortly.</p>`;
      return;
    }

    const nameEl = $('portal-customer-name');
    if (nameEl) nameEl.textContent = customer.name;

    const files = customer.files || [];
    root.innerHTML =
      driveCard(customer.drive, identity) +
      (files.length
        ? `<ul class="portal-files">${files.map(f => fileRow(f, './')).join('')}</ul>`
        : '');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();

if (typeof window !== 'undefined') window.ClientPortal = ClientPortal;
