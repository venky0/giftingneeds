/**
 * Gifting Needs — Diwali 2026 campaign behaviour
 *
 *   1. Order cut-off countdown
 *   2. Hamper matcher (headcount x budget)
 *   3. Sticky quote bar
 *   4. Mobile navigation for the homepage header
 *   5. Catalogue capture
 *
 * Diwali 2026 falls on Sunday 8 November. Branded stock needs roughly
 * three weeks in production and up to eight days in transit for
 * pan-India delivery, so the date that actually governs the campaign
 * is the order cut-off below — not the festival itself.
 */

const Diwali = (() => {

  const CUTOFF = new Date('2026-10-10T23:59:59+05:30');
  const FESTIVAL = new Date('2026-11-08T00:00:00+05:30');
  const WHATSAPP = '916361054099';

  /* ----------------------------------------------------------------
     Hamper catalogue, banded by per-head budget.
     Prices are per unit at the 50-piece minimum order.
     ---------------------------------------------------------------- */
  const HAMPERS = [
    { id: 'appreciation', name: 'Diwali Appreciation Box', low: 599, high: 799,
      img: 'images/diwali_appreciation_box.jpg',
      blurb: 'Sweets, a brass diya and a branded keepsake. Built for large employee counts.' },
    { id: 'essentials', name: 'Festive Essentials Hamper', low: 799, high: 999,
      img: 'images/festive_essentials_hamper.jpg',
      blurb: 'Everyday useful pieces in festive packaging — the safe choice at volume.' },
    { id: 'celebration', name: 'Employee Celebration Box', low: 999, high: 1299,
      img: 'images/employee_celebration_box.jpg',
      blurb: 'A step up in presentation, still costed for whole-team gifting.' },
    { id: 'sustainable', name: 'Sustainable Diwali Box', low: 1199, high: 1499,
      img: 'images/sustainable_diwali_box.jpg',
      blurb: 'Plantable, recycled and zero-waste pieces for ESG-conscious brands.' },
    { id: 'wellness', name: 'Wellness Celebration Hamper', low: 1299, high: 1699,
      img: 'images/wellness_celebration_hamper.jpg',
      blurb: 'Wellbeing-led gifting: teas, wellness kit and a premium drinkware piece.' },
    { id: 'executive', name: 'Executive Diwali Collection', low: 1899, high: 3200,
      img: 'images/executive_gift_sets.jpg',
      blurb: 'Leather, crystal and copper for clients, partners and senior leadership.' },
    { id: 'signature', name: 'Signature Client Hamper', low: 3200, high: 6500,
      img: 'images/diwali_hampers.jpg',
      blurb: 'Bespoke, individually boxed and hand-finished. For your top relationships.' }
  ];

  const BANDS = [
    { id: 'b1', min: 0,    max: 750,   label: 'Under ₹750',        title: 'Volume Gifting',
      note: 'Large employee counts and channel partners. Thoughtful, branded, costed to scale.' },
    { id: 'b2', min: 750,  max: 1500,  label: '₹750 – ₹1,500', title: 'Team Celebration',
      note: 'The band most Diwali employee programmes land in. Best balance of presentation and cost.' },
    { id: 'b3', min: 1500, max: 3000,  label: '₹1,500 – ₹3,000', title: 'Client & Management',
      note: 'Premium materials and heavier packaging for clients and senior teams.' },
    { id: 'b4', min: 3000, max: Infinity, label: '₹3,000+',        title: 'Signature Bespoke',
      note: 'Individually curated, hand-finished hampers for your most important relationships.' }
  ];

  const inr = n => '₹' + Number(n).toLocaleString('en-IN');

  /* ---------------------------------------------------------------- */
  /* 1. COUNTDOWN                                                     */
  /* ---------------------------------------------------------------- */
  function renderCountdown() {
    const nodes = document.querySelectorAll('[data-countdown]');
    if (!nodes.length) return;

    const tick = () => {
      const now = Date.now();
      const target = now < CUTOFF ? CUTOFF : FESTIVAL;
      const toCutoff = now < CUTOFF;
      let diff = Math.max(0, target - now);

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);

      nodes.forEach(el => {
        const label = toCutoff ? 'Diwali order cut-off in' : 'Diwali in';
        el.classList.toggle('is-urgent', toCutoff && days <= 14);
        el.innerHTML =
          `<span class="cd-label">${label}</span>` +
          `<span class="countdown-unit"><b>${days}</b><i>d</i></span>` +
          `<span class="countdown-unit"><b>${hours}</b><i>h</i></span>` +
          `<span class="countdown-unit"><b>${mins}</b><i>m</i></span>`;
      });
    };

    tick();
    setInterval(tick, 60000);
  }

  /* ---------------------------------------------------------------- */
  /* 2. HAMPER MATCHER                                                */
  /* ---------------------------------------------------------------- */
  function quoteLink(lead) {
    const params = new URLSearchParams({
      product: lead.product || 'Diwali hamper enquiry',
      qty: lead.qty || '',
      budget: lead.budget || ''
    });
    return 'contact.html?' + params.toString();
  }

  function whatsappLink(text) {
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;
  }

  function initMatcher() {
    const form = document.getElementById('hamper-matcher');
    if (!form) return;

    const result = document.getElementById('matcher-result');
    const picksEl = document.getElementById('matcher-picks');
    const summaryEl = document.getElementById('matcher-summary');

    form.addEventListener('submit', e => {
      e.preventDefault();

      const qty = parseInt(document.getElementById('matcher-qty').value, 10);
      const budget = parseInt(document.getElementById('matcher-budget').value, 10);
      if (!qty || !budget) return;

      // Anything whose range overlaps the stated budget, nearest first.
      const picks = HAMPERS
        .filter(h => h.low <= budget * 1.15)
        .sort((a, b) => Math.abs(((a.low + a.high) / 2) - budget) - Math.abs(((b.low + b.high) / 2) - budget))
        .slice(0, 3);

      const total = qty * budget;
      summaryEl.innerHTML =
        `<span class="big">${qty.toLocaleString('en-IN')}</span><span class="cap">recipients</span>` +
        `<span class="big">${inr(budget)}</span><span class="cap">per head</span>` +
        `<span class="big">${inr(total)}</span><span class="cap">indicative order value</span>`;

      picksEl.innerHTML = picks.length ? picks.map(h => {
        const link = quoteLink({ product: h.name, qty, budget });
        return `
          <article class="pick-card">
            <img src="${h.img}" alt="${h.name}" loading="lazy">
            <div class="pick-body">
              <h4>${h.name}</h4>
              <p class="pick-price">${inr(h.low)} – ${inr(h.high)} <span style="font-weight:400;font-size:.8rem;opacity:.75">per unit</span></p>
              <a class="btn btn-gold" href="${link}">Get a quote</a>
            </div>
          </article>`;
      }).join('') : `
        <p style="color:var(--text-muted)">
          Nothing standard sits at that budget — which usually means a bespoke build.
          <a href="${quoteLink({ product: 'Bespoke Diwali hamper', qty, budget })}" style="color:var(--text-gold);font-weight:700">Tell us what you have in mind</a>.
        </p>`;

      result.hidden = false;
      result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  /* ---------------------------------------------------------------- */
  /* 3. STICKY QUOTE BAR                                              */
  /* ---------------------------------------------------------------- */
  function initQuoteBar() {
    const bar = document.querySelector('.quote-bar');
    if (!bar) return;

    const show = () => {
      const past = window.scrollY > window.innerHeight * 0.6;
      bar.classList.toggle('visible', past);
      document.body.classList.toggle('quote-bar-on', past);
    };

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { show(); ticking = false; });
    }, { passive: true });
    show();
  }

  /* ---------------------------------------------------------------- */
  /* 4. MOBILE NAVIGATION (homepage header)                           */
  /* ---------------------------------------------------------------- */
  function initMobileNav() {
    const btn = document.getElementById('mockup-menu-toggle');
    const nav = document.querySelector('.nav-links-mockup');
    if (!btn || !nav) return;

    const scrim = document.createElement('div');
    scrim.className = 'nav-scrim';
    document.body.appendChild(scrim);

    const setOpen = open => {
      btn.classList.toggle('open', open);
      nav.classList.toggle('open', open);
      scrim.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    };

    btn.addEventListener('click', () => setOpen(!nav.classList.contains('open')));
    scrim.addEventListener('click', () => setOpen(false));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------- */
  /* 5. CATALOGUE CAPTURE                                             */
  /* ---------------------------------------------------------------- */
  function initCapture() {
    const form = document.getElementById('catalogue-capture');
    if (!form) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const name = document.getElementById('capture-name').value.trim();
      const email = document.getElementById('capture-email').value.trim();
      if (!name || !email) return;

      const btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

      const lead = {
        name, email, phone: '—', company: '—', qty: 0,
        timeline: 'catalogue request',
        productDetails: 'Diwali catalogue download',
        summary: '', message: 'Requested the Diwali 2026 catalogue from the website.'
      };

      let delivered = false;
      if (window.LeadDelivery) {
        ({ delivered } = await window.LeadDelivery.send(lead));
      }

      form.innerHTML = `
        <p style="color:var(--text-primary);font-weight:700;margin:0 0 .4rem">Thank you, ${name}.</p>
        <p style="color:var(--text-muted);margin:0 0 1rem;font-size:.94rem">
          ${delivered
            ? 'The Diwali catalogue is on its way to your inbox.'
            : 'Tap below and we will send the catalogue straight over.'}
        </p>
        <a class="btn btn-gold" style="justify-content:center" target="_blank" rel="noopener"
           href="${whatsappLink(`Hi Gifting Needs, this is ${name} (${email}). Please send me the Diwali 2026 catalogue.`)}">
          ${delivered ? 'Also reach us on WhatsApp' : 'Send on WhatsApp'}
        </a>`;
    });
  }

  /* ---------------------------------------------------------------- */
  function init() {
    renderCountdown();
    initMatcher();
    initQuoteBar();
    initMobileNav();
    initCapture();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { HAMPERS, BANDS, CUTOFF, FESTIVAL, inr, quoteLink, whatsappLink };
})();

if (typeof window !== 'undefined') window.Diwali = Diwali;
