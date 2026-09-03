/**
 * "Request catalogue access" — the popup on the public site.
 *
 * Posts to the portal Worker on giftingneeds.org, which emails the
 * request to the client. Nothing is granted here: this form only asks.
 *
 * Self-contained on purpose (markup and styles included) so a page needs
 * one script tag and nothing else. It reuses the site's own custom
 * properties, with fallbacks, so it matches whatever theme is loaded.
 *
 * Triggers:
 *   - any element with [data-request-access]
 *   - once per visitor on the products page, after they have scrolled
 *     far enough to show real interest
 */
(function () {
  'use strict';

  var ENDPOINT   = 'https://giftingneeds.org/api/request-access';
  var WHATSAPP   = '916361054099';
  var SEEN_KEY   = 'gn_catalogue_prompt_seen';
  var SEEN_DAYS  = 30;

  var root = null;          // modal backdrop, null when inline
  var card = null;          // the .gn-ra element itself, either way
  var inline = false;
  var previouslyFocused = null;

  /* ----------------------------------------------------------- styles */

  var CSS = '' +
  '.gn-ra-back{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
    'justify-content:center;padding:1.25rem;background:rgba(13,9,32,.62);' +
    'backdrop-filter:blur(3px);opacity:0;transition:opacity .22s ease}' +
  '.gn-ra-back.is-open{opacity:1}' +
  '.gn-ra{background:var(--bg-card,#FFFDF8);color:var(--text-primary,#221B2E);' +
    'border-radius:16px;max-width:31rem;width:100%;max-height:92vh;overflow-y:auto;' +
    'padding:1.9rem;box-shadow:0 24px 60px rgba(13,9,32,.3);' +
    'transform:translateY(12px) scale(.985);transition:transform .22s ease}' +
  '.gn-ra-back.is-open .gn-ra{transform:none}' +
  '.gn-ra h2{margin:0 0 .5rem;font-size:1.45rem;line-height:1.25;' +
    'color:var(--primary,#3B2F63)}' +
  '.gn-ra p.gn-ra-lead{margin:0 0 1.35rem;color:var(--text-secondary,#5A5068);font-size:.97rem}' +
  '.gn-ra label{display:block;font-size:.78rem;font-weight:700;letter-spacing:.06em;' +
    'text-transform:uppercase;color:var(--text-secondary,#5A5068);margin:.85rem 0 .3rem}' +
  '.gn-ra input{width:100%;box-sizing:border-box;font:inherit;padding:.7rem .85rem;' +
    'border:1px solid var(--border,rgba(201,123,20,.3));border-radius:9px;' +
    'background:var(--bg-primary,#FBF7EE);color:inherit}' +
  '.gn-ra input:focus{outline:2px solid var(--gold,#C97B14);outline-offset:1px}' +
  '.gn-ra-row{display:flex;gap:.75rem}.gn-ra-row>div{flex:1;min-width:0}' +
  '.gn-ra-actions{display:flex;gap:.7rem;margin-top:1.5rem}' +
  '.gn-ra-actions button{font:inherit;font-weight:700;border-radius:10px;cursor:pointer;' +
    'padding:.8rem 1.1rem;border:0}' +
  '.gn-ra-send{flex:1;background:var(--gold,#C97B14);color:#fff}' +
  '.gn-ra-send:hover{background:var(--gold-bright,#E8A33D)}' +
  '.gn-ra-send[disabled]{opacity:.6;cursor:progress}' +
  '.gn-ra-cancel{background:transparent;color:var(--text-secondary,#5A5068);' +
    'border:1px solid var(--border,rgba(201,123,20,.3))!important}' +
  '.gn-ra-note{margin:1.1rem 0 0;font-size:.84rem;color:var(--text-secondary,#5A5068);' +
    'line-height:1.5}' +
  '.gn-ra-err{margin:.9rem 0 0;padding:.7rem .85rem;border-radius:9px;font-size:.9rem;' +
    'background:rgba(168,32,58,.09);border-left:3px solid var(--crimson,#A8203A)}' +
  '.gn-ra-ok{text-align:center;padding:.5rem 0 .25rem}' +
  '.gn-ra-ok .gn-ra-tick{font-size:2.6rem;line-height:1;color:#1F6F43}' +
  '.gn-ra-x{position:absolute;top:.85rem;right:1rem;background:none;border:0;cursor:pointer;' +
    'font-size:1.5rem;line-height:1;color:var(--text-secondary,#5A5068);padding:.25rem}' +
  '.gn-ra-inline{box-shadow:none;max-width:none;padding:0;max-height:none;overflow:visible}' +
  // Hide only the FORM's own heading and lead - the page supplies those.
  // Child combinator matters: the success message puts its heading inside
  // .gn-ra-ok, and hiding that left customers staring at a bare tick with
  // no confirmation that anything had happened.
  '.gn-ra-inline>h2,.gn-ra-inline>p.gn-ra-lead{display:none}' +
  '.gn-ra-inline .gn-ra-ok h2{display:block;margin-top:.5rem}' +
  '@media (max-width:520px){.gn-ra-row{display:block}.gn-ra{padding:1.5rem}}' +
  '@media (prefers-reduced-motion:reduce){.gn-ra-back,.gn-ra{transition:none}}';

  function injectCss() {
    if (document.getElementById('gn-ra-css')) return;
    var s = document.createElement('style');
    s.id = 'gn-ra-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ------------------------------------------------------------ markup */

  function formHtml() {
    return '' +
    '<button class="gn-ra-x" type="button" aria-label="Close">&times;</button>' +
    '<h2 id="gn-ra-title">Request the catalogue library</h2>' +
    '<p class="gn-ra-lead">Our full range sits in a private area. Tell us who you are ' +
      'and we\'ll open it for you — usually the same working day.</p>' +
    '<form novalidate>' +
      '<label for="gn-ra-name">Your name</label>' +
      '<input id="gn-ra-name" name="name" type="text" autocomplete="name" required>' +
      '<label for="gn-ra-company">Company</label>' +
      '<input id="gn-ra-company" name="company" type="text" autocomplete="organization">' +
      '<div class="gn-ra-row">' +
        '<div><label for="gn-ra-email">Work email</label>' +
        '<input id="gn-ra-email" name="email" type="email" autocomplete="email" required></div>' +
        '<div><label for="gn-ra-phone">Phone</label>' +
        '<input id="gn-ra-phone" name="phone" type="tel" autocomplete="tel"></div>' +
      '</div>' +
      '<div class="gn-ra-actions">' +
        '<button type="button" class="gn-ra-cancel">Not now</button>' +
        '<button type="submit" class="gn-ra-send">Request access</button>' +
      '</div>' +
      '<p class="gn-ra-note">Use the address you want to sign in with — the access ' +
        'code is sent there. We don\'t share your details.</p>' +
    '</form>';
  }

  function doneHtml(email) {
    return '' +
    '<button class="gn-ra-x" type="button" aria-label="Close">&times;</button>' +
    '<div class="gn-ra-ok">' +
      '<div class="gn-ra-tick">&#10003;</div>' +
      '<h2 id="gn-ra-title">Request sent</h2>' +
      '<p class="gn-ra-lead">We\'ll email <strong>' + escapeHtml(email) + '</strong> ' +
        'as soon as it\'s approved. Then sign in at ' +
        '<strong>giftingneeds.org/customer-login</strong> — no password needed.</p>' +
      '<div class="gn-ra-actions"><button type="button" class="gn-ra-send gn-ra-cancel" ' +
        'style="flex:1;background:var(--gold,#C97B14);color:#fff;border:0!important">Close</button></div>' +
    '</div>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c];
    });
  }

  /* ------------------------------------------------------------ opening */

  function open() {
    if (root) return;
    injectCss();
    previouslyFocused = document.activeElement;

    root = document.createElement('div');
    root.className = 'gn-ra-back';
    root.innerHTML = '<div class="gn-ra" role="dialog" aria-modal="true" ' +
                     'aria-labelledby="gn-ra-title" style="position:relative">' +
                     formHtml() + '</div>';
    document.body.appendChild(root);
    card = root.querySelector('.gn-ra');
    inline = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(function () { root.classList.add('is-open'); });

    root.addEventListener('click', function (e) { if (e.target === root) close(); });
    root.addEventListener('keydown', onKeydown);
    wire();

    var first = root.querySelector('#gn-ra-name');
    if (first) first.focus();
  }

  function close() {
    if (inline || !root) return;
    var node = root;
    root = null;
    node.classList.remove('is-open');
    document.body.style.overflow = '';
    remember();
    setTimeout(function () { node.remove(); }, 220);
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab' || !root) return;
    // Keep focus inside the dialog while it is open.
    var f = root.querySelectorAll('button, input, [href], select, textarea');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------------------------------------------------------- submitting */

  function wire() {
    if (!card) return;
    var form   = card.querySelector('form');
    var x      = card.querySelector('.gn-ra-x');
    var cancel = card.querySelector('.gn-ra-cancel');
    if (x) x.addEventListener('click', close);
    if (cancel) cancel.addEventListener('click', close);
    if (form) form.addEventListener('submit', submit);
  }

  function showError(box, msg, lead) {
    var old = box.querySelector('.gn-ra-err');
    if (old) old.remove();
    var p = document.createElement('p');
    p.className = 'gn-ra-err';
    p.setAttribute('role', 'alert');
    p.innerHTML = escapeHtml(msg) + (lead
      ? ' <a href="https://wa.me/' + WHATSAPP + '" style="color:inherit;font-weight:700">' +
        'Message us on WhatsApp instead.</a>' : '');
    box.querySelector('form').appendChild(p);
  }

  async function submit(e) {
    e.preventDefault();
    var box  = card;
    if (!box) return;
    var form = box.querySelector('form');
    var send = box.querySelector('.gn-ra-send');

    var data = {
      name:    form.name.value.trim(),
      company: form.company.value.trim(),
      email:   form.email.value.trim(),
      phone:   form.phone.value.trim(),
    };
    if (!data.name)  { showError(box, 'Please tell us your name.'); form.name.focus();  return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
      showError(box, 'That email address does not look right.'); form.email.focus(); return;
    }

    send.disabled = true;
    send.textContent = 'Sending…';
    var errNode = box.querySelector('.gn-ra-err');
    if (errNode) errNode.remove();

    try {
      var res  = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.message || 'That did not go through.');

      remember();
      box.innerHTML = doneHtml(data.email);
      if (inline) {
        // No dialog to dismiss — drop the controls that would try.
        var x = box.querySelector('.gn-ra-x');
        if (x) x.remove();
        var c = box.querySelector('.gn-ra-actions');
        if (c) c.remove();
      } else {
        wire();
        var btn = box.querySelector('.gn-ra-cancel');
        if (btn) btn.focus();
      }
    } catch (err) {
      send.disabled = false;
      send.textContent = 'Request access';
      // A failed fetch surfaces as TypeError("Failed to fetch") — true, and
      // meaningless to a customer. Only messages we wrote are worth showing.
      var msg = (err && err.name === 'TypeError')
        ? 'We could not reach us just now — please check your connection and try again.'
        : (err && err.message) || 'We could not send that just now.';
      showError(box, msg, true);
    }
  }

  /* ------------------------------------------------------------ triggers */

  function remember() {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch (e) { /* private browsing — just show it again next time */ }
  }

  function seenRecently() {
    try {
      var t = Number(localStorage.getItem(SEEN_KEY));
      return t && (Date.now() - t) < SEEN_DAYS * 864e5;
    } catch (e) { return false; }
  }

  /**
   * Opening straight from a link.
   *
   * The client sends customers a button in an email, so there has to be
   * a URL that lands on the form itself — telling someone to open a page
   * and hunt for a button loses most of them. #request works on every
   * page carrying this script, which keeps the emailed link short.
   */
  function openIfHashAsks() {
    if (/^#request(-access)?$/.test(location.hash)) {
      // Let the page paint first, so it is not a modal over a blank screen.
      setTimeout(open, 250);
      return true;
    }
    return false;
  }

  function init() {
    // A page that mounts the form inline handles itself.
    if (document.getElementById('gn-request-inline')) {
      mount(document.getElementById('gn-request-inline'));
      return;
    }
    openIfHashAsks();
    window.addEventListener('hashchange', openIfHashAsks);

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-request-access]');
      if (!t) return;
      e.preventDefault();
      open();
    });

    // One unprompted appearance, and only where someone is clearly
    // browsing the range rather than passing through the home page.
    // The unprompted appearance is separate: an emailed link is an
    // explicit request and must always open, dismissal or not.
    if (!/products\.html$/.test(location.pathname) || seenRecently()) return;
    var fired = false;
    window.addEventListener('scroll', function onScroll() {
      if (fired) return;
      var seen = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (seen < 0.45) return;
      fired = true;
      window.removeEventListener('scroll', onScroll);
      open();
    }, { passive: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /**
   * Render the same form inside a page, with no modal.
   *
   * The shareable landing page needs the form visible on arrival: someone
   * who followed a link because they were unsure whether to trust it is
   * not reassured by a dialog appearing over a page they have not read.
   */
  function mount(container) {
    if (!container) return;
    injectCss();
    container.classList.add('gn-ra', 'gn-ra-inline');
    container.innerHTML = formHtml();
    var x = container.querySelector('.gn-ra-x');
    if (x) x.remove();                       // nothing to close on a page
    var cancel = container.querySelector('.gn-ra-cancel');
    if (cancel) cancel.remove();             // nor to cancel back to
    card = container;
    inline = true;
    root = null;
    wire();
  }

  window.GNRequestAccess = { open: open, close: close, mount: mount };
})();
