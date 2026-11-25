/* Christmas & New Year home page: reveal, quote dialog, catalogue request.
 * Enquiries go through window.LeadDelivery (js/leads.js): email when the
 * Web3Forms key is set, otherwise a pre-filled WhatsApp message. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const WA = '916361054099';

  /* reveal */
  const els = $$('.xh-rev');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach((el) => io.observe(el));
  } else els.forEach((el) => el.classList.add('in'));

  /* dialog */
  const dlg = $('#xh-dlg');
  const form = $('form', dlg);
  const note = $('.xh-dlg-note', dlg);
  const open = (title, product) => {
    $('#xh-dlg-title').textContent = title || 'Request a bulk quote';
    form.elements.productDetails.value = product || '';
    note.textContent = '';
    dlg.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => form.elements.name.focus(), 50);
  };
  const close = () => { dlg.classList.remove('open'); document.body.style.overflow = ''; };
  $$('[data-quote]').forEach((b) => b.addEventListener('click', (e) => {
    e.preventDefault();
    open(b.dataset.quoteTitle, b.dataset.quote === 'general' ? '' : b.dataset.quote);
  }));
  $('.xh-dlg-x', dlg).addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    const lead = {
      name: d.name, company: d.company, email: d.email, phone: d.phone, qty: d.qty,
      timeline: 'Christmas / New Year', productDetails: d.productDetails || 'Christmas & New Year gifting',
      summary: d.budget, message: d.message
    };
    const btn = $('button[type=submit]', form);
    btn.disabled = true; note.textContent = 'Sending…';
    try {
      const res = window.LeadDelivery ? await window.LeadDelivery.send(lead) : null;
      if (res && res.delivered) {
        note.textContent = 'Thank you. Our gifting team will call you within one working day.';
        form.reset();
      } else {
        const url = res ? res.whatsapp : `https://wa.me/${WA}?text=${encodeURIComponent('Christmas & New Year gifting enquiry from ' + d.name + ', ' + d.phone)}`;
        note.textContent = 'Opening WhatsApp with your details. Just press send.';
        window.open(url, '_blank', 'noopener');
      }
    } catch (_) {
      note.textContent = 'Please call +91 63610 54099 and we will help right away.';
    }
    btn.disabled = false;
  });

  /* catalogue request */
  const cf = $('#xh-cat-form');
  if (cf) cf.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = cf.elements.email.value.trim();
    const msg = `Hi Gifting Needs, please send the Christmas & New Year catalogue to ${email}.`;
    $('#xh-cat-note').textContent = 'Opening WhatsApp to confirm your request. Just press send.';
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  });
})();
