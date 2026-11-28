/*
 * "Download PDF" for the storefront: whatever the visitor has filtered
 * (category, price range, brand, search, sort) becomes a catalogue PDF with
 * photos, names, brands, codes, descriptions and prices, ready to send to a
 * customer. Built in the browser with jsPDF; nothing is uploaded.
 */
(function () {
  'use strict';
  if (typeof DATA === 'undefined' || typeof window.filtered !== 'function') return;

  const JSPDF = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  const MAX = 400;                       // keeps the file small enough to email
  const CONTACT = 'Gifting Needs  |  +91 63610 54099  |  info@giftingneeds.in  |  giftingneeds.org/storefront';
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const inr = n => Math.round(n).toLocaleString('en-IN');
  // jsPDF's built-in fonts cover Latin-1 plus a few typographic marks only
  const pdfText = s => String(s ?? '').replace(/₹\s?/g, 'Rs. ').replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF–—‘’“”•]/g, '').trim();

  function loadScript(src) {
    return new Promise((ok, fail) => {
      if (window.jspdf) return ok();
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => fail(new Error('Could not load the PDF library'));
      document.head.appendChild(s);
    });
  }

  function toJpeg(url, max) {
    return new Promise(res => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        try { res({ data: c.toDataURL('image/jpeg', 0.8), w: c.width, h: c.height }); } catch (e) { res(null); }
      };
      img.onerror = () => res(null);
      img.src = url;
    });
  }
  async function mapLimit(list, n, fn, tick) {
    const out = new Array(list.length); let i = 0, done = 0;
    await Promise.all(Array.from({ length: n }, async () => {
      while (i < list.length) { const k = i++; out[k] = await fn(list[k]); tick(++done); }
    }));
    return out;
  }

  // What the current list is, in words, for the PDF heading and file name.
  function describe() {
    const parts = [], cat = $('cat').value, brand = $('vend').value, q = $('q').value.trim();
    const band = window.gnBand ? window.gnBand() : null;
    let mn = +$('rmin').value, mx = +$('rmax').value; if (mn > mx) [mn, mx] = [mx, mn];
    if (cat) parts.push(cat);
    if (q) parts.push(`"${q}"`);
    if (band) parts.push(band[1] > 1e8 ? `Rs. ${inr(band[0])} and above` : `Rs. ${inr(band[0])} - ${inr(band[1])}`);
    else if (mn > +$('rmin').min || mx < +$('rmax').max) parts.push(`Rs. ${inr(mn)} - ${inr(mx)}`);
    if (brand) parts.push(brand);
    return { title: cat || (q ? 'Gift ideas: ' + q.replace(/\b\w/g, c => c.toUpperCase()) : 'Corporate Gift Selection'), filters: parts };
  }

  /* -------------------------------------------------------------- PDF */

  async function build(items, opts, progress) {
    await loadScript(JSPDF);
    const { jsPDF } = window.jspdf;
    const logo = await toJpeg('/assets/quote-logo.png', 500);
    const imgs = await mapLimit(items, 6, d => d.i ? toJpeg('/storefront/images/' + d.i + '?v=enhanced1', 320) : null,
      n => progress(`Preparing images ${n} of ${items.length}…`));
    progress('Laying out the PDF…');

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const W = 210, H = 297, M = 12, GAP = 5, CW = (W - 2 * M - GAP) / 2, CH = 58, IMG = 40;
    const navy = [20, 40, 77], red = [198, 43, 52], ink = [31, 36, 48], grey = [110, 116, 128], line = [226, 229, 236];
    const set = (size, style = 'normal', color = ink) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    // first-page heading
    if (logo) { const h = 13, w = h * logo.w / logo.h; doc.addImage(logo.data, 'JPEG', M, 10, w, h); }
    set(8, 'normal', grey); doc.text(dateStr, W - M, 14, { align: 'right' });
    if (opts.forWhom) { set(8, 'normal', grey); doc.text('Prepared for ' + pdfText(opts.forWhom), W - M, 19, { align: 'right' }); }
    set(17, 'bold', navy); doc.text(doc.splitTextToSize(pdfText(opts.title), W - 2 * M)[0], M, 32);
    set(8.5, 'normal', grey);
    const sub = [`${items.length} product${items.length === 1 ? '' : 's'}`, ...opts.filters.map(pdfText)].join('   |   ');
    doc.text(doc.splitTextToSize(sub, W - 2 * M)[0], M, 38);
    if (opts.prices) { set(7.5, 'normal', grey); doc.text('Prices per unit, including GST. Logo branding included; final price confirmed on quotation.', M, 42.5); }

    let x, y, col = 0, top = 47;
    y = top;
    items.forEach((d, i) => {
      if (y + CH > H - 14) { doc.addPage(); top = 14; y = top; col = 0; }
      x = M + col * (CW + GAP);
      doc.setDrawColor(...line); doc.setLineWidth(0.3); doc.roundedRect(x, y, CW, CH - 3, 2.5, 2.5, 'S');
      const t = imgs[i];
      if (t) {
        const k = Math.min(IMG / t.w, IMG / t.h), w = t.w * k, h = t.h * k;
        doc.addImage(t.data, 'JPEG', x + 3 + (IMG - w) / 2, y + 3 + (CH - 9 - h) / 2, w, h);
      }
      const tx = x + IMG + 7, tw = CW - IMG - 10;
      let ty = y + 7;
      set(7, 'bold', red); doc.text(pdfText(d.v).toUpperCase().slice(0, 40), tx, ty); ty += 4.3;
      set(9.5, 'bold', ink);
      doc.splitTextToSize(pdfText(d.n), tw).slice(0, 3).forEach(l => { doc.text(l, tx, ty); ty += 4.2; });
      if (d.c) {
        set(7, 'normal', grey);
        const cl = doc.splitTextToSize('Code: ' + pdfText(d.c).replace(/\s*\|\s*/g, ', '), tw);
        doc.text(cl[0] + (cl.length > 1 ? '...' : ''), tx, ty); ty += 3.8;
      }
      set(7.3, 'normal', grey);
      const maxDesc = Math.max(0, Math.floor((y + CH - 15 - ty) / 3.3));
      const dl = doc.splitTextToSize(pdfText(d.d), tw);
      dl.slice(0, maxDesc).forEach((l, j) => { doc.text(j === maxDesc - 1 && dl.length > maxDesc ? l.replace(/\s*\S*$/, '...') : l, tx, ty); ty += 3.3; });
      if (opts.prices) {
        if (d.t) { set(9.5, 'bold', navy); doc.text('Price on request', tx, y + CH - 8); }
        else { set(12, 'bold', navy); const pt = 'Rs. ' + inr(d.p); doc.text(pt, tx, y + CH - 8);
               const pw = doc.getTextWidth(pt);
               set(7, 'normal', grey); doc.text('incl. GST', tx + pw + 2, y + CH - 8); }
      }
      if (col === 1) { col = 0; y += CH; } else col = 1;
    });

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      if (p > 1) { set(7.5, 'normal', grey); doc.text(pdfText(opts.title), M, 9); doc.text(dateStr, W - M, 9, { align: 'right' }); }
      doc.setDrawColor(...line); doc.setLineWidth(0.3); doc.line(M, H - 11, W - M, H - 11);
      set(7.5, 'normal', grey); doc.text(CONTACT, M, H - 6.5); doc.text(`${p} / ${pages}`, W - M, H - 6.5, { align: 'right' });
    }
    const slug = (opts.title + (opts.forWhom ? '-' + opts.forWhom : '')).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const pad = n => String(n).padStart(2, '0');
    doc.save(`Gifting-Needs-${slug}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.pdf`);
  }

  /* ------------------------------------------------------------ dialog */

  const css = document.createElement('style');
  css.textContent = `
  .gnx-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--navy,#14284D);background:var(--navy,#14284D);color:#fff;
    border-radius:999px;padding:8px 14px;font:700 12.5px/1 inherit;font-family:inherit;cursor:pointer}
  .gnx-btn:hover{filter:brightness(1.15)}
  .gnx-modal{position:fixed;inset:0;z-index:9999;background:rgba(10,18,34,.55);display:flex;align-items:center;justify-content:center;padding:16px}
  .gnx-modal[hidden]{display:none}
  .gnx-box{background:#fffdf8;border-radius:16px;max-width:440px;width:100%;padding:22px;box-shadow:0 30px 80px -20px rgba(0,0,0,.5);font-size:14px}
  .gnx-box h2{margin:0 0 4px;font-size:20px}
  .gnx-box p{margin:0 0 14px;color:#6b7280;font-size:13px;line-height:1.5}
  .gnx-box label{display:block;margin:0 0 12px;font-size:12.5px;font-weight:700}
  .gnx-box input[type=text]{display:block;width:100%;box-sizing:border-box;margin-top:5px;padding:10px 12px;border:1px solid #d8d2c6;border-radius:10px;font:inherit;font-weight:400}
  .gnx-box .gnx-check{display:flex;gap:8px;align-items:center;font-weight:400}
  .gnx-warn{background:#fff4e0;border-radius:8px;padding:8px 10px;color:#8a5a00;font-size:12.5px;margin:0 0 12px}
  .gnx-foot{display:flex;gap:10px;justify-content:flex-end;align-items:center;margin-top:6px}
  .gnx-foot .gnx-msg{margin-right:auto;font-size:12px;color:#6b7280}
  .gnx-cancel{background:none;border:0;cursor:pointer;font:inherit;color:#6b7280}
  `;
  document.head.appendChild(css);

  let modal, btn;
  function open() {
    const items = window.filtered();
    if (!items.length) return;
    const info = describe();
    modal.querySelector('[name=title]').value = info.title;
    modal.querySelector('.gnx-sum').textContent =
      `${items.length.toLocaleString('en-IN')} product${items.length === 1 ? '' : 's'} in the current list` +
      (info.filters.length ? ` (${info.filters.join(', ')})` : '') + ', in the order shown.';
    const warn = modal.querySelector('.gnx-warn');
    warn.hidden = items.length <= MAX;
    warn.textContent = `That's a lot for one PDF. The first ${MAX} will be included; narrow the category or price range to send the rest.`;
    modal.querySelector('.gnx-msg').textContent = '';
    modal.querySelector('.gnx-go').disabled = false;
    modal.hidden = false;
    modal.querySelector('[name=forWhom]').focus();
  }
  function close() { modal.hidden = true; }

  async function go() {
    const goBtn = modal.querySelector('.gnx-go'), msg = modal.querySelector('.gnx-msg');
    const items = window.filtered().slice(0, MAX);
    const info = describe();
    goBtn.disabled = true;
    try {
      await build(items, {
        title: modal.querySelector('[name=title]').value.trim() || info.title,
        forWhom: modal.querySelector('[name=forWhom]').value.trim(),
        prices: modal.querySelector('[name=prices]').checked,
        filters: info.filters,
      }, t => { msg.textContent = t; });
      msg.textContent = 'Downloaded. Attach it to your email or WhatsApp.';
    } catch (e) {
      console.error(e);
      msg.textContent = 'Sorry, the PDF could not be made. Check your connection and try again.';
    }
    goBtn.disabled = false;
  }

  function mount() {
    const bar = document.querySelector('.bar');
    if (!bar || btn) return;
    btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'gnx-btn';
    btn.innerHTML = '<span aria-hidden="true">⤓</span> Download PDF of this list';
    btn.onclick = open;
    bar.appendChild(btn);

    modal = document.createElement('div');
    modal.className = 'gnx-modal'; modal.hidden = true;
    modal.innerHTML = `<div class="gnx-box" role="dialog" aria-modal="true" aria-labelledby="gnx-h">
      <h2 id="gnx-h">Download this list as a PDF</h2>
      <p class="gnx-sum"></p>
      <div class="gnx-warn" hidden></div>
      <label>Heading<input type="text" name="title" maxlength="80"></label>
      <label>Prepared for <span style="font-weight:400;color:#6b7280">(optional, e.g. the customer's company)</span>
        <input type="text" name="forWhom" maxlength="80" placeholder="Acme Technologies"></label>
      <label class="gnx-check"><input type="checkbox" name="prices" checked> Show prices</label>
      <div class="gnx-foot"><span class="gnx-msg" role="status"></span>
        <button type="button" class="gnx-cancel">Cancel</button>
        <button type="button" class="gnx-btn gnx-go">Download PDF</button></div>
    </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.gnx-cancel').onclick = close;
    modal.querySelector('.gnx-go').onclick = go;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (!modal.hidden && e.key === 'Escape') close(); });
    document.addEventListener('gn:painted', e => { btn.disabled = !e.detail.count; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
