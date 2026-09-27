/*
 * Storefront enhancements, kept out of the catalogue file so the product
 * data can be regenerated without touching any of this.
 *
 *   - category chips with live counts, instead of a hidden dropdown
 *   - the current filters live in the URL, so a salesperson can send a
 *     customer "everything under 1,000 in Drinkware" as a plain link
 *   - a quick view for one product, with a quantity box
 *   - filters as a sheet on phones rather than a wall above the grid
 *   - a placeholder while each tile's photo loads
 *
 * It drives the page's own controls rather than reimplementing the
 * filtering: set a value, fire "input", the catalogue repaints itself.
 */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = n => '₹' + Number(n).toLocaleString('en-IN');
  const keyOf = d => [d.v, d.n, d.c].join('|');

  const set = (el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); };

  let byKey = null;
  const product = k => (byKey || (byKey = new Map(DATA.map(d => [keyOf(d), d])))).get(k);

  /* ---------------------------------------------------------- the URL */

  // Short keys keep the shared link readable in a WhatsApp message.
  const PARAMS = { q: 'q', cat: 'c', vend: 'b', sort: 's', rmin: 'min', rmax: 'max' };

  function readUrl() {
    const p = new URLSearchParams(location.search);
    let touched = false;
    for (const [id, key] of Object.entries(PARAMS)) {
      const v = p.get(key);
      if (v == null) continue;
      const el = $(id);
      if (!el) continue;
      if (el.tagName === 'SELECT' && ![...el.options].some(o => o.value === v)) continue;
      el.value = v;
      touched = true;
    }
    return touched;
  }

  function writeUrl() {
    const p = new URLSearchParams();
    for (const [id, key] of Object.entries(PARAMS)) {
      const el = $(id);
      if (!el) continue;
      const v = String(el.value);
      const isDefault = (id === 'rmin' && v === el.min) || (id === 'rmax' && v === el.max) ||
                        (id === 'sort' && v === 'pa') || v === '';
      if (!isDefault) p.set(key, v);
    }
    const qs = p.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  /* ------------------------------------------------- category chips */

  function buildChips() {
    const select = $('cat');
    if (!select) return null;
    const wrap = document.createElement('div');
    wrap.className = 'gnp-chips';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Category');

    const counts = new Map();
    DATA.forEach(d => counts.set(d.k, (counts.get(d.k) || 0) + 1));
    const options = [...select.options].filter(o => o.value !== '')
      .sort((a, b) => (counts.get(b.value) || 0) - (counts.get(a.value) || 0));

    const chip = (value, label, count) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'gnp-chip';
      b.dataset.v = value;
      b.innerHTML = esc(label) + (count != null ? `<span>${count.toLocaleString('en-IN')}</span>` : '');
      b.onclick = () => set(select, select.value === value ? '' : value);
      wrap.appendChild(b);
      return b;
    };
    chip('', 'All categories', DATA.length);
    options.forEach(o => chip(o.value, o.textContent, counts.get(o.value) || 0));

    // The dropdown still drives everything; it just isn't the way in any more.
    select.closest('aside')?.classList.add('gnp-has-chips');
    return wrap;
  }

  /* -------------------------------------------------- filter summary */

  function buildPills() {
    const el = document.createElement('div');
    el.className = 'gnp-pills';
    el.addEventListener('click', e => {
      const b = e.target.closest('button[data-clear]');
      if (!b) return;
      const id = b.dataset.clear;
      if (id === 'all') {
        ['q', 'cat', 'vend'].forEach(i => $(i) && ($(i).value = ''));
        if ($('sort')) $('sort').value = 'pa';
        $('rreset')?.click();
        set($('q'), '');
      } else if (id === 'price') {
        $('rreset')?.click();
      } else {
        set($(id), id === 'sort' ? 'pa' : '');
      }
    });
    return el;
  }

  function renderPills(el, count) {
    const bits = [];
    const q = $('q').value.trim();
    if (q) bits.push(['q', `“${esc(q)}”`]);
    if ($('cat').value) bits.push(['cat', esc($('cat').value)]);
    if ($('vend').value) bits.push(['vend', esc($('vend').value)]);
    const mn = +$('rmin').value, mx = +$('rmax').value;
    if (mn > +$('rmin').min || mx < +$('rmax').max) bits.push(['price', `${inr(Math.min(mn, mx))} – ${inr(Math.max(mn, mx))}`]);

    el.innerHTML = bits.length
      ? bits.map(([id, label]) => `<button type="button" class="gnp-pill" data-clear="${id}">${label}<span aria-hidden="true">×</span><span class="gnp-sr"> (remove)</span></button>`).join('') +
        `<button type="button" class="gnp-pill gnp-pill-clear" data-clear="all">Clear all</button>`
      : '';
    el.hidden = !bits.length;
  }

  /* ------------------------------------------------------ quick view */

  let qv, qvProduct = null;

  function buildQuickView() {
    qv = document.createElement('div');
    qv.className = 'gnp-qv';
    qv.hidden = true;
    qv.innerHTML = `
      <div class="gnp-qv-box" role="dialog" aria-modal="true" aria-labelledby="gnp-qv-name">
        <button type="button" class="gnp-qv-close" aria-label="Close">×</button>
        <div class="gnp-qv-img"><img alt="" decoding="async"></div>
        <div class="gnp-qv-info">
          <p class="gnp-qv-brand"></p>
          <h2 id="gnp-qv-name"></h2>
          <p class="gnp-qv-desc"></p>
          <p class="gnp-qv-price"></p>
          <dl class="gnp-qv-meta"></dl>
          <div class="gnp-qv-actions">
            <div class="gnp-qty">
              <button type="button" data-step="-1" aria-label="Fewer">−</button>
              <input type="number" min="1" step="1" inputmode="numeric" value="1" aria-label="Quantity">
              <button type="button" data-step="1" aria-label="More">+</button>
            </div>
            <button type="button" class="gnp-qv-add"></button>
          </div>
          <p class="gnp-qv-note">Prices include GST. Branding, packaging and bulk pricing are confirmed on your quotation.</p>
        </div>
      </div>`;
    document.body.appendChild(qv);

    qv.addEventListener('click', e => { if (e.target === qv || e.target.closest('.gnp-qv-close')) closeQuickView(); });
    document.addEventListener('keydown', e => { if (!qv.hidden && e.key === 'Escape') closeQuickView(); });

    const qty = qv.querySelector('.gnp-qty input');
    qv.querySelectorAll('.gnp-qty button').forEach(b => b.onclick = () => {
      qty.value = Math.max(1, (+qty.value || 1) + (+b.dataset.step));
      qty.dispatchEvent(new Event('input', { bubbles: true }));
    });
    qty.addEventListener('input', () => {
      if (qvProduct && window.GNQ?.has(qvProduct)) GNQ.setQty(qvProduct, Math.max(1, +qty.value || 1));
    });
    qv.querySelector('.gnp-qv-add').onclick = () => {
      if (!qvProduct || !window.GNQ) return;
      GNQ.toggle(qvProduct);
      if (GNQ.has(qvProduct)) GNQ.setQty(qvProduct, Math.max(1, +qty.value || 1));
      paintAddButton();
    };
  }

  function paintAddButton() {
    const b = qv.querySelector('.gnp-qv-add');
    const on = window.GNQ && qvProduct && GNQ.has(qvProduct);
    b.textContent = on ? '✓ Added to quote' : '+ Add to quote';
    b.classList.toggle('on', !!on);
  }

  function openQuickView(d) {
    qvProduct = d;
    const img = qv.querySelector('.gnp-qv-img img');
    img.src = d.i ? 'images/' + d.i + '?v=enhanced1' : '';
    img.alt = d.n;
    qv.querySelector('.gnp-qv-brand').textContent = d.v || '';
    qv.querySelector('#gnp-qv-name').textContent = d.n;
    const desc = qv.querySelector('.gnp-qv-desc');
    desc.textContent = d.d && d.d !== d.n ? d.d : '';
    desc.hidden = !desc.textContent;
    qv.querySelector('.gnp-qv-price').innerHTML = `<b>${inr(d.p)}</b> <span>incl. GST</span>`;
    qv.querySelector('.gnp-qv-meta').innerHTML =
      (d.c ? `<dt>Code</dt><dd>${esc(d.c)}</dd>` : '') +
      (d.k ? `<dt>Category</dt><dd>${esc(d.k)}</dd>` : '') +
      (d.v ? `<dt>Brand</dt><dd>${esc(d.v)}</dd>` : '');
    const qty = qv.querySelector('.gnp-qty input');
    qty.value = (window.GNQ && GNQ.qty(d)) || 1;
    paintAddButton();
    qv.hidden = false;
    document.body.style.overflow = 'hidden';
    qv.querySelector('.gnp-qv-close').focus({ preventScroll: true });
  }

  function closeQuickView() {
    qv.hidden = true;
    qvProduct = null;
    document.body.style.overflow = '';
  }

  /* ------------------------------------------------------------ mount */

  function mount() {
    const bar = document.querySelector('.bar');
    const aside = document.querySelector('aside');
    if (!bar || !aside || typeof DATA === 'undefined') return;

    // --- toolbar: filters button (phones), chips, pills, share
    const tools = document.createElement('div');
    tools.className = 'gnp-tools';

    const filtersBtn = document.createElement('button');
    filtersBtn.type = 'button';
    filtersBtn.className = 'gnp-filters-btn';
    filtersBtn.innerHTML = 'Filters <span></span>';
    filtersBtn.onclick = () => document.body.classList.toggle('gnp-filters-open');
    bar.prepend(filtersBtn);

    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'gnp-share';
    share.textContent = 'Copy link to this list';
    share.onclick = async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        share.textContent = '✓ Link copied';
      } catch {
        share.textContent = location.href;   // clipboard blocked: show it to copy by hand
      }
      setTimeout(() => { share.textContent = 'Copy link to this list'; }, 2500);
    };
    bar.appendChild(share);

    const chips = buildChips();
    const pills = buildPills();
    if (chips) tools.appendChild(chips);
    tools.appendChild(pills);
    bar.after(tools);

    // --- close the filter sheet from inside it
    const done = document.createElement('button');
    done.type = 'button';
    done.className = 'gnp-filters-done';
    done.textContent = 'Show results';
    done.onclick = () => document.body.classList.remove('gnp-filters-open');
    aside.appendChild(done);

    buildQuickView();

    // --- a tile opens the quick view; its own button still adds to quote
    $('grid').addEventListener('click', e => {
      if (e.target.closest('.qadd')) return;
      const card = e.target.closest('.card');
      const d = card && product(card.dataset.k);
      if (d) openQuickView(d);
    });
    $('grid').addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const card = e.target.closest('.card');
      if (!card || e.target.closest('.qadd')) return;
      e.preventDefault();
      const d = product(card.dataset.k);
      if (d) openQuickView(d);
    });
    // fade each photo in once it has actually arrived
    $('grid').addEventListener('load', e => {
      if (e.target.tagName === 'IMG') e.target.closest('.ph')?.classList.add('ready');
    }, true);

    // --- keep chips, pills, URL and the "show more" count in step
    const sync = () => {
      const cat = $('cat').value;
      chips?.querySelectorAll('.gnp-chip').forEach(c => c.classList.toggle('on', c.dataset.v === cat));
      renderPills(pills, 0);
      writeUrl();
      filtersBtn.querySelector('span').textContent =
        [$('q').value.trim(), $('cat').value, $('vend').value].filter(Boolean).length || '';
    };
    document.addEventListener('gn:painted', e => {
      sync();
      const more = $('more');
      if (more && more.style.display !== 'none') {
        more.textContent = `Show more (${e.detail.shown.toLocaleString('en-IN')} of ${e.detail.count.toLocaleString('en-IN')})`;
      }
      $('grid').querySelectorAll('.card').forEach(c => {
        c.tabIndex = 0;
        c.setAttribute('role', 'button');
        const nm = c.querySelector('.nm');
        if (nm) c.setAttribute('aria-label', 'View ' + nm.textContent);
        const img = c.querySelector('img');
        if (img && img.complete) c.querySelector('.ph')?.classList.add('ready');
      });
    });

    // The catalogue paints itself before this file runs, so repaint once:
    // it applies anything restored from the URL and fills in the counts.
    readUrl();
    set($('q'), $('q').value);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
