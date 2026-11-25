/* Gifting Needs Events — events.html
 * 1. scroll reveal   2. Astral Paints gallery + lightbox   3. enquiry form
 *
 * Enquiries use the same layered delivery as js/leads.js: Web3Forms emails the
 * sales inbox when WEB3FORMS_KEY is filled in; otherwise (or if that fails) the
 * visitor is handed a pre-filled WhatsApp message, so a lead is never lost.
 */
(() => {
  'use strict';

  const WEB3FORMS_KEY = '';                       // paste the key from web3forms.com
  const SALES_WHATSAPP = '916361054099';
  const GALLERY_JSON = 'images/events/astral/gallery.json';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- 1. reveal ---------- */
  const revealEls = $$('.ev-reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- 2. gallery + lightbox ---------- */
  const gal = $('#ev-gallery');
  const lb = $('#ev-lb');
  let items = [];
  let idx = 0;

  const open = (i) => {
    idx = (i + items.length) % items.length;
    $('img', lb).src = items[idx].src;
    $('img', lb).alt = items[idx].alt || 'Live event photo';
    $('.c', lb).textContent = `${idx + 1} / ${items.length}`;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; };

  if (lb) {
    $('.x', lb).addEventListener('click', close);
    $('.p', lb).addEventListener('click', () => open(idx - 1));
    $('.n', lb).addEventListener('click', () => open(idx + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') open(idx - 1);
      if (e.key === 'ArrowRight') open(idx + 1);
    });
  }

  const renderGallery = (list) => {
    items = list;
    if (!list.length) {
      gal.innerHTML = '<div class="ev-gallery-empty"><b>Event highlights are being added</b>Photos from our recent live events will appear here shortly.</div>';
      return;
    }
    gal.innerHTML = '';
    list.forEach((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Open event photo ${i + 1}`);
      const img = document.createElement('img');
      img.src = it.thumb || it.src;
      img.alt = it.alt || 'Astral Paints live event';
      img.loading = 'lazy';
      img.decoding = 'async';
      if (it.w && it.h) { img.width = it.w; img.height = it.h; }
      b.appendChild(img);
      b.addEventListener('click', () => open(i));
      gal.appendChild(b);
    });
  };

  if (gal) {
    fetch(GALLERY_JSON, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => [])
      .then((j) => renderGallery(Array.isArray(j) ? j : []));
  }

  /* ---------- 3. enquiry form ---------- */
  const form = $('#ev-form');
  const note = $('#ev-form-note');
  const typeSel = $('#ev-type');

  // service-card links preselect the event type
  $$('[data-event-type]').forEach((a) => a.addEventListener('click', () => {
    if (typeSel) typeSel.value = a.dataset.eventType;
  }));
  const qType = new URLSearchParams(location.search).get('type');
  if (qType && typeSel) [...typeSel.options].forEach((o) => { if (o.value.toLowerCase() === qType.toLowerCase()) typeSel.value = o.value; });

  const dateInput = $('#ev-date');
  if (dateInput) dateInput.min = new Date().toISOString().slice(0, 10);

  const format = (d) => [
    'New EVENT enquiry (giftingneeds.in/events)',
    '',
    `Name:       ${d.name}`,
    `Company:    ${d.company || '-'}`,
    `Phone:      ${d.phone}`,
    `Email:      ${d.email || '-'}`,
    `Event:      ${d.type}`,
    `City:       ${d.city || '-'}`,
    `Guests:     ${d.guests}`,
    `Date:       ${d.date || 'not fixed yet'}`,
    `Budget:     ${d.budget}`,
    d.message ? `\nDetails:\n${d.message}` : '',
    `\nSent ${new Date().toLocaleString('en-IN')}`
  ].filter((l) => l !== '').join('\n');

  const toWhatsApp = (text) => `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`;

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(form).entries());
      const btn = $('button[type=submit]', form);
      const text = format(d);
      btn.disabled = true;
      note.textContent = 'Sending your enquiry…';

      if (WEB3FORMS_KEY) {
        try {
          const res = await fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
              access_key: WEB3FORMS_KEY,
              subject: `Event enquiry: ${d.type} - ${d.company || d.name}`,
              from_name: 'Gifting Needs Events website',
              replyto: d.email || undefined,
              message: text
            })
          });
          const j = await res.json();
          if (j.success) {
            note.textContent = 'Thank you. Our events team will call you within one working day.';
            form.reset();
            btn.disabled = false;
            return;
          }
        } catch (_) { /* fall through to WhatsApp */ }
      }
      note.textContent = 'Opening WhatsApp with your details. Just press send.';
      window.open(toWhatsApp(text), '_blank', 'noopener');
      btn.disabled = false;
    });
  }
})();
