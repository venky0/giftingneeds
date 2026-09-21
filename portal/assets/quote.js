/*
 * Storefront quotation builder.
 *
 * Customers tick products, then a four-step form collects what a
 * quotation needs — GSTIN, billing address, delivery type, quantities —
 * and the browser builds a PDF on the spot. Nothing is sent anywhere:
 * the selection and form live in localStorage so a reload loses nothing.
 *
 * Prices on the storefront are GST-inclusive, so the PDF backs each line's
 * tax out at that product's own rate rather than adding it on top.
 */
(function () {
  'use strict';

  // As printed on the client's own estimates (GN EST-000347).
  const SELLER = {
    name: 'Gifting Needs',
    lines: [
      'No.124 ( Old No. 123/1 ) 8th Cross, 19th Main Rd, Marenahalli palya, 2nd Phase, J. P. Nagar, Bengaluru,',
      'Bengaluru Karnataka 560078',
      'India',
    ],
    gstin: '29AAWFG9249H1ZH',
    stateCode: '29',
    mobile: '6361054099',
    email: 'info@giftingneeds.in',
  };
  const BANK = [['Bank Name', 'ICICI Bank'], ['A/c No', '344105000608'], ['IFSC', 'ICIC0003441']];
  const TERMS = [
    'Offer Price is Including Logo Branding.',
    'Shipping:  Delivery Outside Bangalore will be charged extra as per actuals.',
    'Lead Time: 6-8 Working days.',
    'Payment Terms:  50% Advance, 50% On delivery.',
  ];
  // GST % per product comes from the catalogue's `g` field; products the
  // client hasn't classified yet fall back to 18%.
  const DEFAULT_GST = 18;
  const rateOf = d => (typeof d.g === 'number' ? d.g : DEFAULT_GST);
  const STORE_KEY = 'gnq.v1';
  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const AUTOTABLE = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';

  const STATES = {
    '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
    '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
    '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
    '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
    '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra',
    '29': 'Karnataka', '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman and Nicobar Islands', '36': 'Telangana',
    '37': 'Andhra Pradesh', '38': 'Ladakh',
  };

  /* ------------------------------------------------------------ state */

  const blank = () => ({ items: {}, form: { delivery: 'single', sameAddr: true } });
  let state = blank();
  try { state = Object.assign(blank(), JSON.parse(localStorage.getItem(STORE_KEY)) || {}); } catch (e) { /* private mode */ }
  const save = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ } };

  // A product's key must survive the catalogue being regenerated, so it is
  // built from what identifies the product rather than its position.
  const keyOf = d => [d.v, d.n, d.c].join('|');
  let byKey = null;
  function products() {
    if (!byKey) byKey = new Map(DATA.map(d => [keyOf(d), d]));
    return byKey;
  }
  function selected() {
    const out = [];
    for (const [k, qty] of Object.entries(state.items)) {
      const d = products().get(k);
      if (d) out.push({ k, d, qty });
      else delete state.items[k];          // product no longer in the catalogue
    }
    return out;
  }


  // Storefront prices include GST. The estimate format shows rates before
  // GST and adds the tax under the sub total, so each price is converted
  // back first. The page and the PDF both use this, so their totals agree.
  function calc(items) {
    const lines = items.map(x => {
      const r = rateOf(x.d), rate = r2(x.d.p / (1 + r / 100));
      return { d: x.d, qty: x.qty, r, rate, amount: r2(rate * x.qty) };
    });
    const by = new Map();
    lines.forEach(l => by.set(l.r, r2((by.get(l.r) || 0) + l.amount)));
    const groups = [...by.entries()].sort((a, b) => a[0] - b[0]).map(([r, base]) => {
      const tax = r2(base * r / 100), cgst = r2(tax / 2);
      return { r, base, tax, cgst, sgst: r2(tax - cgst) };
    });
    const subtotal = r2(lines.reduce((t, l) => t + l.amount, 0));
    const total = r2(subtotal + groups.reduce((t, g) => t + g.tax, 0));
    return { lines, groups, subtotal, total };
  }

  /* ---------------------------------------------------------- helpers */

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
  const rs = n => 'Rs. ' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const r2 = n => Math.round(n * 100) / 100;

  function gstinValid(g) {
    if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
    const cs = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let t = 0;
    for (let i = 0; i < 14; i++) {
      const v = cs.indexOf(g[i]) * (i % 2 ? 2 : 1);
      t += Math.floor(v / 36) + (v % 36);
    }
    return cs[(36 - (t % 36)) % 36] === g[14];
  }

  function words(num) {
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven',
      'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const two = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? '-' + a[n % 10] : '');
    const three = n => (n >= 100 ? a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + two(n % 100);
    const whole = n => {
      if (n === 0) return 'Zero';
      const parts = [];
      const cr = Math.floor(n / 1e7); n %= 1e7;
      const lk = Math.floor(n / 1e5); n %= 1e5;
      const th = Math.floor(n / 1e3); n %= 1e3;
      if (cr) parts.push(whole(cr) + ' Crore');
      if (lk) parts.push(two(lk) + ' Lakh');
      if (th) parts.push(two(th) + ' Thousand');
      if (n) parts.push(three(n));
      return parts.join(' ');
    };
    const rupees = Math.floor(num), paise = Math.round((num - rupees) * 100);
    return 'Indian Rupee ' + whole(rupees) + (paise ? ' and ' + two(paise) + ' Paise' : '') + ' Only';
  }

  function loadScript(src) {
    return new Promise((ok, fail) => {
      if (document.querySelector(`script[src="${src}"]`)) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Could not load ' + src));
      document.head.appendChild(s);
    });
  }

  // jsPDF only embeds JPEG/PNG; the storefront images are WebP, so each
  // one is redrawn onto a white canvas and re-encoded.
  function toJpeg(url, max = 260) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        try { res({ data: c.toDataURL('image/jpeg', 0.85), w: c.width, h: c.height }); } catch (e) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = url;
    });
  }

  // jsPDF's built-in fonts have no ₹ glyph; the grand total is rendered by
  // the browser onto a canvas and placed as an image instead.
  function rupeeText(str, pt = 9.5) {
    try {
      const S = 6, c = document.createElement('canvas'), g = c.getContext('2d');
      const font = `bold ${pt * S}px Helvetica, Arial, sans-serif`;
      g.font = font;
      const w = Math.ceil(g.measureText(str).width), h = Math.ceil(pt * S * 1.3);
      c.width = w; c.height = h;
      g.font = font; g.fillStyle = '#222'; g.textBaseline = 'alphabetic';
      g.fillText(str, 0, pt * S);
      const mm = 25.4 / 72 / S;
      return { data: c.toDataURL('image/png'), w: w * mm, h: h * mm };
    } catch (e) { return null; }
  }
  const imgUrl = d => d.i ? '/storefront/images/' + d.i + '?v=enhanced1' : null;

  /* ------------------------------------------------- card integration */

  window.GNQ = {
    button(d) {
      const k = keyOf(d), on = k in state.items;
      return `<button type="button" class="qadd${on ? ' on' : ''}" data-k="${esc(k)}" aria-pressed="${on}">` +
             (on ? '✓ Added to quote' : '+ Add to quote') + '</button>';
    },
  };

  function toggle(k, btn) {
    if (k in state.items) delete state.items[k]; else state.items[k] = 1;
    save();
    const on = k in state.items;
    if (btn) { btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); btn.textContent = on ? '✓ Added to quote' : '+ Add to quote'; }
    renderBar();
  }

  function syncButtons() {
    document.querySelectorAll('.qadd').forEach(b => {
      const on = b.dataset.k in state.items;
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      b.textContent = on ? '✓ Added to quote' : '+ Add to quote';
    });
  }

  /* ------------------------------------------------------ bottom bar */

  let bar;
  function renderBar() {
    const items = selected();
    const n = items.length;
    bar.hidden = n === 0;
    if (!n) return;
    const total = calc(items).total;
    $('.qbar-count', bar).textContent = n + (n === 1 ? ' product' : ' products') + ' selected';
    $('.qbar-total', bar).textContent = inr(total) + ' incl. GST';
  }

  /* ---------------------------------------------------------- wizard */

  const STEPS = ['GST details', 'Billing address', 'Delivery', 'Quantities'];
  let step = 0, modal;

  function open() {
    if (!selected().length) return;
    step = 0;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    render();
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    syncButtons();
    renderBar();
  }

  const f = () => state.form;
  const field = (name, label, opts = {}) => `
    <label class="qf${opts.full ? ' full' : ''}">
      <span>${label}${opts.req ? ' <i>*</i>' : ''}</span>
      ${opts.area
        ? `<textarea name="${name}" rows="${opts.rows || 3}" placeholder="${esc(opts.ph || '')}">${esc(f()[name])}</textarea>`
        : `<input name="${name}" value="${esc(f()[name])}" placeholder="${esc(opts.ph || '')}"
             ${opts.type ? `type="${opts.type}"` : ''} ${opts.mode ? `inputmode="${opts.mode}"` : ''}
             ${opts.max ? `maxlength="${opts.max}"` : ''} autocomplete="${opts.ac || 'off'}">`}
      <em class="qerr" data-for="${name}"></em>
    </label>`;

  function body() {
    const F = f();
    if (step === 0) return `
      <p class="qlead">We'll put your GSTIN on the quotation so it's ready for your accounts team.</p>
      <div class="qgrid">
        ${field('company', 'Company name', { req: true, full: true, ac: 'organization' })}
        ${field('gstin', 'GSTIN', { req: true, full: true, ph: '15 characters, e.g. 29ABCDE1234F1Z5', max: 15 })}
        ${field('contact', 'Contact person', { ac: 'name' })}
        ${field('phone', 'Mobile', { mode: 'tel', ph: '10-digit mobile', ac: 'tel' })}
        ${field('email', 'Email', { full: true, type: 'email', ac: 'email' })}
      </div>`;
    if (step === 1) return `
      <p class="qlead">The billing address that goes with your GSTIN.</p>
      <div class="qgrid">
        ${field('addr', 'Address', { req: true, full: true, area: true, ph: 'Building, street, area' })}
        ${field('city', 'City', { req: true, ac: 'address-level2' })}
        ${field('pin', 'Pincode', { req: true, mode: 'numeric', max: 6, ac: 'postal-code' })}
        <label class="qf full"><span>State <i>*</i></span>
          <select name="state"><option value="">Select state</option>
            ${Object.entries(STATES).map(([c, s]) => `<option value="${c}"${F.state === c ? ' selected' : ''}>${s}</option>`).join('')}
          </select><em class="qerr" data-for="state"></em></label>
      </div>`;
    if (step === 2) return `
      <p class="qlead">Where should the gifts go?</p>
      <div class="qchoice">
        <label class="qopt${F.delivery === 'single' ? ' on' : ''}"><input type="radio" name="delivery" value="single"${F.delivery === 'single' ? ' checked' : ''}>
          <b>Single location</b><span>Everything delivered to one address.</span></label>
        <label class="qopt${F.delivery === 'multi' ? ' on' : ''}"><input type="radio" name="delivery" value="multi"${F.delivery === 'multi' ? ' checked' : ''}>
          <b>Multiple locations</b><span>Split across offices, branches or cities.</span></label>
      </div>
      ${F.delivery === 'single' ? `
        <label class="qcheck"><input type="checkbox" name="sameAddr"${F.sameAddr ? ' checked' : ''}> Deliver to the billing address</label>
        ${F.sameAddr ? '' : `<div class="qgrid">${field('shipAddr', 'Delivery address', { req: true, full: true, area: true, ph: 'Full address with pincode' })}</div>`}`
      : `<div class="qgrid">
          ${field('locCount', 'Number of locations', { req: true, mode: 'numeric', max: 4, ph: 'e.g. 12' })}
          ${field('locList', 'Locations', { full: true, area: true, rows: 5, ph: 'One per line, e.g.\nMumbai 400001 - 40 units\nPune 411001 - 25 units' })}
        </div>`}`;
    // step 3 — quantities
    const items = selected();
    const total = calc(items).total;
    return `
      <p class="qlead">${F.delivery === 'multi' ? 'Enter the total quantity across all locations.' : 'How many of each?'}
        When you download, a copy of the estimate and your details goes to the Gifting Needs team so we can follow up.</p>
      <ul class="qitems">
        ${items.map(x => `
          <li data-k="${esc(x.k)}">
            ${x.d.i ? `<img src="${imgUrl(x.d)}" alt="" loading="lazy">` : '<span class="qnoimg"></span>'}
            <div class="qname"><b>${esc(x.d.n)}</b><small>${esc(x.d.v)} · ${inr(x.d.p)} each</small></div>
            <input class="qqty" type="number" min="1" step="1" inputmode="numeric" value="${x.qty}" aria-label="Quantity for ${esc(x.d.n)}">
            <span class="qline">${inr(x.d.p * x.qty)}</span>
            <button type="button" class="qrm" aria-label="Remove ${esc(x.d.n)}">×</button>
          </li>`).join('')}
      </ul>
      <div class="qtotal"><span>Total incl. GST</span><b>${inr(total)}</b></div>`;
  }

  function render() {
    $('.qsteps', modal).innerHTML = STEPS.map((s, i) =>
      `<li class="${i < step ? 'done' : i === step ? 'now' : ''}"><span>${i + 1}</span>${s}</li>`).join('');
    $('.qtitle', modal).textContent = STEPS[step];
    $('.qbody', modal).innerHTML = body();
    $('.qback', modal).style.visibility = step ? 'visible' : 'hidden';
    const next = $('.qnext', modal);
    next.textContent = step === STEPS.length - 1 ? 'Download estimate PDF' : 'Continue';
    next.disabled = false;
    $('.qmsg', modal).textContent = '';
    const first = $('.qbody input:not([type=radio]):not([type=checkbox]), .qbody textarea', modal);
    if (first && step < 3) first.focus({ preventScroll: true });
  }

  function collect() {
    const F = f();
    modal.querySelectorAll('.qbody [name]').forEach(el => {
      if (el.type === 'radio') { if (el.checked) F[el.name] = el.value; }
      else if (el.type === 'checkbox') F[el.name] = el.checked;
      else F[el.name] = el.value.trim();
    });
    if (F.gstin) F.gstin = F.gstin.toUpperCase().replace(/\s+/g, '');
    save();
  }

  function validate() {
    const F = f(), err = {};
    if (step === 0) {
      if (!F.company) err.company = 'Please enter your company name.';
      if (!F.gstin) err.gstin = 'Please enter your GSTIN.';
      else if (!gstinValid(F.gstin)) err.gstin = "That doesn't look like a valid GSTIN — please check it.";
      if (F.phone && !/^(\+?91[\s-]?)?[6-9]\d{9}$/.test(F.phone.replace(/\s+/g, ''))) err.phone = 'Enter a 10-digit mobile number.';
      if (F.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(F.email)) err.email = 'Enter a valid email address.';
    } else if (step === 1) {
      if (!F.addr) err.addr = 'Please enter the address.';
      if (!F.city) err.city = 'Please enter the city.';
      if (!/^[1-9]\d{5}$/.test(F.pin || '')) err.pin = 'Enter a 6-digit pincode.';
      if (!F.state) err.state = 'Please choose the state.';
    } else if (step === 2) {
      if (F.delivery === 'single' && !F.sameAddr && !F.shipAddr) err.shipAddr = 'Please enter the delivery address.';
      if (F.delivery === 'multi' && !(+F.locCount >= 2)) err.locCount = 'Enter 2 or more locations.';
    } else if (step === 3) {
      if (!selected().length) err._ = 'Add at least one product.';
    }
    modal.querySelectorAll('.qerr').forEach(e => { e.textContent = err[e.dataset.for] || ''; });
    const bad = Object.keys(err).find(k => k !== '_');
    if (bad) { const el = $(`.qbody [name="${bad}"]`, modal); if (el) el.focus(); }
    if (err._) $('.qmsg', modal).textContent = err._;
    return !Object.keys(err).length;
  }

  async function next() {
    collect();
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      // Step 1 → 2: default the state from the GSTIN's first two digits.
      if (step === 0 && !f().state && STATES[f().gstin.slice(0, 2)]) { f().state = f().gstin.slice(0, 2); save(); }
      step++; render();
      if (step === 3) { loadScript(JSPDF).then(() => loadScript(AUTOTABLE)).catch(() => {}); }  // warm up
      return;
    }
    const btn = $('.qnext', modal), msg = $('.qmsg', modal);
    btn.disabled = true; btn.textContent = 'Preparing your PDF…'; msg.textContent = '';
    try {
      const r = await buildPdf();
      msg.textContent = 'Your estimate has been downloaded.';
      btn.textContent = 'Download again';
      sendCopy(r).then(s => {
        if (s === 'sent') msg.textContent = 'Your estimate has been downloaded, and a copy has gone to our team — we\'ll be in touch.';
      }).catch(err => console.warn(err));
    } catch (e) {
      console.error(e);
      msg.textContent = 'Sorry, the PDF could not be created. Please check your connection and try again.';
      btn.textContent = 'Download estimate PDF';
    }
    btn.disabled = false;
  }

  /* ------------------------------------------------------------- PDF */

  async function buildPdf() {
    await loadScript(JSPDF);
    await loadScript(AUTOTABLE);
    const { jsPDF } = window.jspdf;
    const F = f(), items = selected(), C = calc(items);
    const [logo, ...thumbs] = await Promise.all([
      toJpeg('/assets/quote-logo.png', 400),
      ...items.map(x => x.d.i ? toJpeg(imgUrl(x.d)) : null),
    ]);

    // Laid out to match the client's own Zoho estimate (GN EST-000347):
    // grey table header, rates before GST, tax added under the sub total.
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, L = 16, R = 196;
    const ink = [34, 34, 34], grey = [110, 110, 110], rule = [221, 221, 221];
    const now = new Date(), pad = n => String(n).padStart(2, '0');
    const estNo = `GN EST-W${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const estDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
    const set = (size, style = 'normal', color = ink) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };
    const LH = 3.9;   // line height for 9pt body text
    const lines = (arr, x, y, width, size = 9, style = 'normal', color = ink) => {
      set(size, style, color);
      arr.filter(Boolean).forEach(t => doc.splitTextToSize(String(t), width).forEach(l => { doc.text(l, x, y); y += LH; }));
      return y;
    };

    // ---- header: logo left, title and number right
    if (logo) { const h = 26, w = h * logo.w / logo.h; doc.addImage(logo.data, 'JPEG', L, 18, w, h); }
    set(13.5); doc.text('SALES QUOTATION | PROFORMA INVOICE', R, 23, { align: 'right' });
    set(10, 'bold'); doc.text(estNo, R, 28, { align: 'right' });

    // ---- seller
    let y = 50;
    set(12, 'bold'); doc.text(SELLER.name, L, y); y += 5;
    y = lines([...SELLER.lines, `GSTIN ${SELLER.gstin}`, `MOB ${SELLER.mobile}`, `E-Mail ${SELLER.email}`], L, y, 95);

    // ---- bill to
    const buyerState = STATES[F.state] || '';
    const addrLines = String(F.addr || '').split(/\n+/).map(s => s.trim()).filter(Boolean);
    const cityLine = [F.city, `${F.pin} ${buyerState}`].filter(Boolean).join(', ');
    y += 8;
    set(10.5); doc.text('Bill To', L, y); y += 4.8;
    y = lines([F.company], L, y, 95, 9.5, 'bold');
    y = lines([...addrLines, cityLine, 'India', `GSTIN ${F.gstin}`,
               [F.contact, F.phone, F.email].filter(Boolean).join('  |  ')], L, y, 95);

    // ---- ship to
    y += 8;
    set(10.5); doc.text('Ship To', L, y); y += 4.8;
    let ship;
    if (F.delivery === 'multi') {
      ship = [`Multiple locations (${F.locCount})`,
              ...String(F.locList || '').split('\n').map(s => s.trim()).filter(Boolean)];
    } else if (F.sameAddr) {
      ship = [...addrLines, cityLine, 'India', `GSTIN ${F.gstin}`];
    } else {
      ship = [...String(F.shipAddr || '').split(/\n+/).map(s => s.trim()).filter(Boolean), 'India'];
    }
    const shipTop = y;
    y = lines(ship, L, y, 70);

    // ---- estimate date and reference, bottom-aligned with Ship To
    const ref = items.map(x => x.d.n.split(/\s+[—-]\s+/)[0]).join(', ');
    set(9); const refLines = doc.splitTextToSize(ref.length > 90 ? ref.slice(0, 87) + '...' : ref, 40);
    const metaH = 6.5 + refLines.length * LH;
    let my = Math.max(shipTop, y - metaH);
    set(10, 'normal', grey); doc.text('Estimate Date :', 157, my, { align: 'right' });
    set(9); doc.text(estDate, R, my, { align: 'right' }); my += 6.5;
    set(10, 'normal', grey); doc.text('Reference# :', 157, my, { align: 'right' });
    set(9); refLines.forEach(l => { doc.text(l, R, my, { align: 'right' }); my += LH; });
    y = Math.max(y, my);

    // ---- place of supply
    y += 6;
    set(9); doc.text(`Place Of Supply: ${buyerState} (${F.state})`, L, y);
    y += 7;

    // ---- items
    const IMG = 12.5, money = n => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    // the variant text is often already part of the name; don't print it twice
    const desc = d => [d.d && !d.n.includes(d.d) ? d.d : '', [d.v, d.c].filter(Boolean).join(' | ')].filter(Boolean).join(' - ');
    doc.autoTable({
      startY: y,
      margin: { left: L, right: W - R, bottom: 22, top: 16 },
      head: [['#', 'Item & Description', 'HSN/SAC', 'Qty', 'Rate', 'Amount', '']],
      body: C.lines.map((ln, i) => [
        String(i + 1),
        ln.d.n + '\n' + doc.splitTextToSize(desc(ln.d), 60).slice(0, 2).join(' '),
        ln.d.h || '',
        money(ln.qty) + '\npcs',
        money(ln.rate),
        money(ln.amount),
        '',
      ]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9.5, textColor: ink, cellPadding: { top: 2.8, bottom: 2.8, left: 2, right: 2 }, valign: 'top' },
      headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: 'normal', fontSize: 9.5, valign: 'middle', minCellHeight: 10 },
      bodyStyles: { minCellHeight: IMG + 4.5 },
      columnStyles: {
        0: { cellWidth: 11, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 18, halign: 'right' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: IMG + 6 },
      },
      didParseCell(h) { if (h.section === 'head') h.cell.styles.halign = ['center', 'left', 'right', 'right', 'right', 'right', 'left'][h.column.index]; },
      willDrawCell(h) {
        // Item name and its grey description line, and "pcs" under the
        // quantity, are drawn by hand in didDrawCell below.
        if (h.section === 'body' && (h.column.index === 1 || h.column.index === 3)) h.cell._lines = h.cell.text, h.cell.text = [];
      },
      didDrawCell(h) {
        if (h.section !== 'body') return;
        const c = h.cell, x0 = c.x + 2, top = c.y + 2.8 + 3;
        if (h.column.index === 1) {
          const ln = C.lines[h.row.index];
          set(9.5); let yy = top;
          doc.splitTextToSize(ln.d.n, c.width - 4).forEach(l => { doc.text(l, x0, yy); yy += 4.2; });
          set(8, 'normal', grey);
          doc.splitTextToSize(desc(ln.d), c.width - 4).slice(0, 2).forEach(l => { doc.text(l, x0, yy); yy += 3.6; });
        } else if (h.column.index === 3) {
          const xr = c.x + c.width - 2;
          set(9.5); doc.text(money(C.lines[h.row.index].qty), xr, top, { align: 'right' });
          set(7.5, 'normal', grey); doc.text('pcs', xr, top + 3.8, { align: 'right' });
        } else if (h.column.index === 6) {
          const t = thumbs[h.row.index];
          if (t) {
            const k = Math.min(IMG / t.w, IMG / t.h), w = t.w * k, hh = t.h * k;
            doc.addImage(t.data, 'JPEG', c.x + (c.width - w) / 2, c.y + 2.2, w, hh);
          }
        }
        if (h.column.index === 6) {   // row separator, full width
          doc.setDrawColor(...rule); doc.setLineWidth(0.3);
          doc.line(L, c.y + c.height, R, c.y + c.height);
        }
      },
    });
    y = doc.lastAutoTable.finalY + 7;

    // ---- totals
    const intra = F.state === SELLER.stateCode;
    const pct = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));
    const rows = [['Sub Total', money(C.subtotal)]];
    C.groups.forEach(g => {
      if (!g.tax) return;
      if (intra) {
        const half = pct(g.r / 2);
        rows.push([`CGST${half} (${half}%)`, money(g.cgst)], [`SGST${half} (${half}%)`, money(g.sgst)]);
      } else rows.push([`IGST${pct(g.r)} (${pct(g.r)}%)`, money(g.tax)]);
    });
    // Keep the whole totals block together, but only move it to a new page
    // when it genuinely doesn't fit above the footer.
    const STEP = 7;
    set(8.8, 'bolditalic'); const wordLines = doc.splitTextToSize(words(C.total), R - 149);
    // exact height of what follows: the rows, the Total band, the words
    const need = rows.length * STEP + 11 + (wordLines.length - 1) * 4 + 1.5;
    if (y + need > H - 17) { doc.addPage(); y = 20; }   // footer rule sits at H - 14.5
    const LX = 158;
    rows.forEach(([l, v]) => {
      set(9.5); doc.text(l, LX, y, { align: 'right' }); doc.text(v, R - 2, y, { align: 'right' }); y += STEP;
    });
    doc.setFillColor(245, 244, 242); doc.rect(106, y - 5, R - 106, 9.5, 'F');
    set(9.5, 'bold'); doc.text('Total', LX, y + 0.8, { align: 'right' });
    const tot = rupeeText('₹' + money(C.total));
    if (tot) doc.addImage(tot.data, 'PNG', R - 2 - tot.w, y + 0.8 - tot.h * 0.78, tot.w, tot.h);
    else doc.text('Rs. ' + money(C.total), R - 2, y + 0.8, { align: 'right' });
    y += 11;
    set(9, 'normal', grey); doc.text('Total In Words:', 146, y, { align: 'right' });
    set(8.8, 'bolditalic');
    wordLines.forEach(l => { doc.text(l, 149, y); y += 4; });
    y += 6;

    // ---- bank details and terms
    const tail = () => { if (y > H - 30) { doc.addPage(); y = 20; } };
    tail(); set(9); doc.text('Our Bank Details.', L, y); y += LH;
    BANK.forEach(([k, v]) => { tail(); set(9); doc.text(k, L, y); doc.text(': ' + v, L + 19, y); y += LH; });
    y += 7; tail();
    set(10.5); doc.text('Terms & Conditions', L, y); y += 5;
    TERMS.forEach(t => { tail(); y = lines([t], L, y, R - L, 8.5); });

    // ---- footer on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...rule); doc.setLineWidth(0.3); doc.line(14, H - 14.5, 198, H - 14.5);
      set(9, 'normal', [150, 150, 150]);
      doc.text('"This is a computer-generated Estimate | Proforma Invoice hence no signature is required."', W / 2, H - 10.5, { align: 'center' });
      doc.text(String(i), R, H - 5.5, { align: 'right' });
    }

    const slug = (F.company || 'Estimate').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    const filename = `${estNo.replace(/\s+/g, '-')}-${slug}.pdf`;
    doc.save(filename);
    return { doc, estNo, filename, C, ship, buyerState };
  }

  // Mail Gifting Needs a copy of the estimate the customer just downloaded.
  // The download never waits on this and never fails because of it.
  let lastSent = '';
  async function sendCopy(r) {
    const F = f();
    const sig = JSON.stringify([state.items, F]);
    if (sig === lastSent) return 'same';            // "Download again" with nothing changed
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estNo: r.estNo,
        filename: r.filename,
        pdf: r.doc.output('datauristring').split(',')[1],
        customer: {
          company: F.company, gstin: F.gstin, contact: F.contact, phone: F.phone, email: F.email,
          address: [F.addr, `${F.city} ${F.pin}`].filter(Boolean).join(', '),
          state: r.buyerState,
          delivery: r.ship.join('\n'),
        },
        items: r.C.lines.map(l => ({ name: l.d.n, brand: l.d.v, code: l.d.c, qty: l.qty, amount: r2(l.amount * (1 + l.r / 100)) })),
        total: r.C.total,
      }),
    });
    if (!res.ok) throw new Error('copy not sent: ' + res.status);
    lastSent = sig;
    return 'sent';
  }

  /* ------------------------------------------------------------ mount */

  function mount() {
    bar = document.createElement('div');
    bar.className = 'qbar'; bar.hidden = true;
    bar.innerHTML = `<div class="qbar-info"><b class="qbar-count"></b><span class="qbar-total"></span></div>
      <button type="button" class="qbar-clear">Clear</button>
      <button type="button" class="qbar-go">Get quotation PDF <span aria-hidden="true">→</span></button>`;
    document.body.appendChild(bar);

    modal = document.createElement('div');
    modal.className = 'qmodal'; modal.hidden = true;
    modal.innerHTML = `<div class="qbox" role="dialog" aria-modal="true" aria-labelledby="qtitle">
        <div class="qhead"><div><small>Your quotation</small><h2 class="qtitle" id="qtitle"></h2></div>
          <button type="button" class="qclose" aria-label="Close">×</button></div>
        <ol class="qsteps"></ol>
        <form class="qbody" novalidate></form>
        <p class="qmsg" role="status"></p>
        <div class="qfoot"><button type="button" class="qback">← Back</button>
          <button type="button" class="qnext">Continue</button></div>
      </div>`;
    document.body.appendChild(modal);

    // card buttons, via delegation so re-rendered grids need no rewiring
    document.getElementById('grid').addEventListener('click', e => {
      const b = e.target.closest('.qadd'); if (b) toggle(b.dataset.k, b);
    });
    $('.qbar-go', bar).onclick = open;
    $('.qbar-clear', bar).onclick = () => {
      if (!confirm('Remove all selected products?')) return;
      state.items = {}; save(); syncButtons(); renderBar();
    };

    $('.qclose', modal).onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (!modal.hidden && e.key === 'Escape') close(); });
    $('.qback', modal).onclick = () => { collect(); if (step) { step--; render(); } };
    $('.qnext', modal).onclick = next;
    $('.qbody', modal).addEventListener('submit', e => { e.preventDefault(); next(); });

    const qbody = $('.qbody', modal);
    qbody.addEventListener('change', e => {
      // delivery choices re-render the step, so the right fields appear
      if (e.target.name === 'delivery' || e.target.name === 'sameAddr') { collect(); render(); }
      if (e.target.name === 'state') collect();
    });
    qbody.addEventListener('input', e => {
      if (e.target.name === 'gstin') {
        const pos = e.target.selectionStart;
        e.target.value = e.target.value.toUpperCase();
        e.target.setSelectionRange(pos, pos);
      }
      if (e.target.classList.contains('qqty')) {
        const li = e.target.closest('li'), k = li.dataset.k;
        const q = Math.max(1, Math.floor(+e.target.value || 1));
        state.items[k] = q; save();
        const d = products().get(k);
        $('.qline', li).textContent = inr(d.p * q);
        const total = calc(selected()).total;
        $('.qtotal b', modal).textContent = inr(total);
        renderBar();
      }
    });
    qbody.addEventListener('click', e => {
      const rm = e.target.closest('.qrm'); if (!rm) return;
      delete state.items[rm.closest('li').dataset.k]; save(); renderBar();
      if (!selected().length) { close(); return; }
      render();
    });
    qbody.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); next(); }
    });

    renderBar();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
