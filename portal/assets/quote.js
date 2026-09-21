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

  const SELLER = {
    name: 'Gifting Needs',
    lines: [
      'No. 124 (Old No. 123/1), 8th Cross, 19th Main Road,',
      'Marenahalli Palya, 2nd Phase, J.P. Nagar,',
      'Bengaluru - 560078, Karnataka',
    ],
    gstin: '29AAWFG9249H1ZH',
    stateCode: '29',
    phone: '+91 63610 54099',
    email: 'sales@giftingneeds.in',
  };
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
    const two = n => n < 20 ? a[n] : b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
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
    return 'Rupees ' + whole(rupees) + (paise ? ' and ' + two(paise) + ' Paise' : '') + ' Only';
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
    const total = items.reduce((t, x) => t + x.d.p * x.qty, 0);
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
    const total = items.reduce((t, x) => t + x.d.p * x.qty, 0);
    return `
      <p class="qlead">${F.delivery === 'multi' ? 'Enter the total quantity across all locations.' : 'How many of each?'}</p>
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
    next.textContent = step === STEPS.length - 1 ? 'Download quotation PDF' : 'Continue';
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
      await buildPdf();
      msg.textContent = 'Your quotation has been downloaded.';
      btn.textContent = 'Download again';
    } catch (e) {
      console.error(e);
      msg.textContent = 'Sorry, the PDF could not be created. Please check your connection and try again.';
      btn.textContent = 'Download quotation PDF';
    }
    btn.disabled = false;
  }

  /* ------------------------------------------------------------- PDF */

  async function buildPdf() {
    await loadScript(JSPDF);
    await loadScript(AUTOTABLE);
    const { jsPDF } = window.jspdf;
    const F = f(), items = selected();
    const [logo, ...thumbs] = await Promise.all([toJpeg('/assets/logo.png', 600), ...items.map(x => x.d.i ? toJpeg(imgUrl(x.d)) : null)]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, M = 14;
    const wine = [101, 38, 59], gold = [184, 123, 45], ink = [56, 37, 42], mut = [120, 100, 103];
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ref = `GNQ-${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    // ---- header
    let y = M;
    if (logo) { const h = 14, w = Math.min(60, h * logo.w / logo.h); doc.addImage(logo.data, 'JPEG', M, y, w, h); }
    doc.setTextColor(...wine); doc.setFont('helvetica', 'bold'); doc.setFontSize(18);
    doc.text('QUOTATION', W - M, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...mut);
    doc.text('Proforma - not a tax invoice', W - M, y + 11, { align: 'right' });
    doc.setTextColor(...ink);
    doc.text(`Ref: ${ref}`, W - M, y + 16, { align: 'right' });
    doc.text(`Date: ${dateStr}`, W - M, y + 20.5, { align: 'right' });
    y += 25;
    doc.setDrawColor(...gold); doc.setLineWidth(0.5); doc.line(M, y, W - M, y);
    y += 6;

    // ---- from / bill to
    const colW = (W - 2 * M - 8) / 2;
    const block = (x, title, lines) => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...gold);
      doc.text(title.toUpperCase(), x, y);
      let yy = y + 5;
      lines.forEach(([txt, bold]) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 10 : 8.5); doc.setTextColor(...ink);
        doc.splitTextToSize(txt, colW).forEach(l => { doc.text(l, x, yy); yy += bold ? 5 : 4; });
      });
      return yy;
    };
    const buyerState = STATES[F.state] || '';
    const y1 = block(M, 'From', [
      [SELLER.name, true], ...SELLER.lines.map(l => [l]),
      [`GSTIN: ${SELLER.gstin}`], [`${SELLER.phone}  |  ${SELLER.email}`],
    ]);
    const y2 = block(M + colW + 8, 'Bill to', [
      [F.company, true], [F.addr], [`${F.city} - ${F.pin}, ${buyerState}`],
      [`GSTIN: ${F.gstin}   State code: ${F.state}`],
      ...(F.contact || F.phone ? [[[F.contact, F.phone].filter(Boolean).join('  |  ')]] : []),
      ...(F.email ? [[F.email]] : []),
    ]);
    y = Math.max(y1, y2) + 3;

    // ---- delivery
    doc.setFillColor(251, 244, 234); doc.setDrawColor(234, 220, 203); doc.setLineWidth(0.2);
    const delLines = [];
    if (F.delivery === 'multi') {
      delLines.push(`Multiple locations (${F.locCount})`);
      (F.locList || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(s => delLines.push('- ' + s));
    } else {
      delLines.push('Single location - ' + (F.sameAddr ? 'billing address' : F.shipAddr.replace(/\s*\n\s*/g, ', ')));
    }
    const wrapped = delLines.flatMap(l => doc.splitTextToSize(l, W - 2 * M - 30));
    const boxH = 5 + wrapped.length * 4;
    doc.rect(M, y, W - 2 * M, boxH, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...gold);
    doc.text('DELIVERY', M + 3, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...ink);
    wrapped.forEach((l, i) => doc.text(l, M + 25, y + 5 + i * 4));
    y += boxH + 5;

    // ---- items
    const rows = items.map((x, i) => [
      String(i + 1),
      { content: `${x.d.n}\n${[x.d.v, x.d.c].filter(Boolean).join('  |  ')}` },
      String(x.qty),
      rs(x.d.p),
      rateOf(x.d) + '%',
      rs(x.d.p * x.qty),
      '',
    ]);
    const IMG = 17;
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M, bottom: 18 },
      head: [['#', 'Product', 'Qty', 'Rate (incl. GST)', 'GST', 'Amount', 'Image']],
      body: rows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.5, textColor: ink, cellPadding: 2.2, valign: 'middle', lineColor: [234, 220, 203], lineWidth: 0.2 },
      headStyles: { fillColor: wine, textColor: [255, 244, 226], fontStyle: 'bold', fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 13, halign: 'right' },
        3: { cellWidth: 27, halign: 'right' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        6: { cellWidth: IMG + 4, minCellHeight: IMG + 4, halign: 'center' },
      },
      bodyStyles: { minCellHeight: IMG + 4 },
      alternateRowStyles: { fillColor: [255, 251, 245] },
      didDrawCell(h) {
        if (h.section !== 'body' || h.column.index !== 6) return;
        const t = thumbs[h.row.index];
        if (!t) return;
        const k = Math.min(IMG / t.w, IMG / t.h), w = t.w * k, hh = t.h * k;
        doc.addImage(t.data, 'JPEG', h.cell.x + (h.cell.width - w) / 2, h.cell.y + (h.cell.height - hh) / 2, w, hh);
      },
    });
    y = doc.lastAutoTable.finalY + 6;

    // ---- totals
    const total = r2(items.reduce((t, x) => t + x.d.p * x.qty, 0));
    const qty = items.reduce((t, x) => t + x.qty, 0);
    // Group lines by GST rate: each group's tax is backed out of its own
    // inclusive total, so the groups always add back up to the grand total.
    const byRate = new Map();
    items.forEach(x => { const r = rateOf(x.d); byRate.set(r, (byRate.get(r) || 0) + x.d.p * x.qty); });
    const groups = [...byRate.entries()].sort((a, b) => a[0] - b[0]).map(([r, amt]) => {
      const taxable = r2(amt / (1 + r / 100));
      return { r, taxable, tax: r2(amt - taxable) };
    });
    const taxable = r2(groups.reduce((t, g) => t + g.taxable, 0));
    const intra = F.state === SELLER.stateCode;
    const pct = n => (Number.isInteger(n) ? n : n.toFixed(1)) + '%';
    const lines = [['Total quantity', String(qty)], ['Taxable value', rs(taxable)]];
    groups.forEach(g => {
      if (!g.tax) return;
      if (intra) { const c = r2(g.tax / 2); lines.push([`CGST @ ${pct(g.r / 2)}`, rs(c)], [`SGST @ ${pct(g.r / 2)}`, rs(r2(g.tax - c))]); }
      else lines.push([`IGST @ ${pct(g.r)}`, rs(g.tax)]);
    });

    const need = lines.length * 5.5 + 30;
    if (y + need > 297 - 18) { doc.addPage(); y = M; }
    const lx = W - M - 80, vx = W - M;
    doc.setFontSize(9);
    lines.forEach(([l, v]) => {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...mut); doc.text(l, lx, y);
      doc.setTextColor(...ink); doc.text(v, vx, y, { align: 'right' }); y += 5.5;
    });
    doc.setFillColor(...wine); doc.rect(lx - 3, y - 3.5, 80 + 3, 9, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(255, 244, 226);
    doc.text('Grand total', lx, y + 2.5); doc.text(rs(total), vx - 2, y + 2.5, { align: 'right' });
    y += 12;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...ink);
    doc.splitTextToSize(words(total), W - 2 * M).forEach(l => { doc.text(l, W - M, y, { align: 'right' }); y += 4.2; });
    y += 4;

    // ---- notes
    const notes = [
      'Prices include GST at the rate shown against each item. Place of supply: ' + (buyerState || '-') + (intra ? ' (intra-state: CGST + SGST).' : ' (inter-state: IGST).'),
      'This quotation was generated on giftingneeds.org. Final prices, stock and delivery timelines are confirmed by Gifting Needs when you place the order.',
      `To confirm this order, reply with reference ${ref} to ${SELLER.email} or call ${SELLER.phone}.`,
    ];
    if (y + 22 > 297 - 18) { doc.addPage(); y = M; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...gold); doc.text('NOTES', M, y); y += 4.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...mut);
    notes.forEach(n => doc.splitTextToSize(n, W - 2 * M).forEach(l => { doc.text(l, M, y); y += 3.8; }));

    // ---- footer on every page
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setDrawColor(...gold); doc.setLineWidth(0.3); doc.line(M, 297 - 13, W - M, 297 - 13);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...mut);
      doc.text(`${SELLER.name}  |  ${SELLER.phone}  |  ${SELLER.email}  |  giftingneeds.org`, M, 297 - 8.5);
      doc.text(`Page ${i} of ${pages}`, W - M, 297 - 8.5, { align: 'right' });
    }

    const slug = (F.company || 'Quotation').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    doc.save(`Gifting-Needs-Quotation-${slug}-${ref.slice(4)}.pdf`);
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
        const total = selected().reduce((t, x) => t + x.d.p * x.qty, 0);
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
