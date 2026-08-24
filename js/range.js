/**
 * Gifting Needs — unbranded product range gallery
 *
 * Renders the extracted catalogue imagery as a filterable grid. The
 * client resells these items under his own branding, so nothing here
 * surfaces a supplier name, model code or price: tiles carry a category
 * and an internal reference only, and every action routes to a quote.
 *
 * Images are lazy-loaded and rendered from a light thumbnail; the
 * full-size version is only fetched when a tile is opened.
 */

const Range = (() => {

  const PAGE_SIZE = 48;          // grid grows on demand, not all at once
  let state = { cat: 'all', q: '', shown: PAGE_SIZE };

  const $ = id => document.getElementById(id);

  function matches(p) {
    if (state.cat !== 'all' && p.cat !== state.cat) return false;
    if (!state.q) return true;
    const hay = `${p.noun} ${p.ref} ${p.cat}`.toLowerCase();
    return hay.includes(state.q);
  }

  function filtered() {
    return (window.GN_RANGE || []).filter(matches);
  }

  function tile(p) {
    const label = p.noun.replace(/&amp;/g, '&');
    const pieces = p.n > 1 ? `${p.n}-piece set` : 'Single piece';
    return `
      <article class="range-tile" data-id="${p.id}">
        <button class="range-tile-img" data-open="${p.id}" aria-label="View ${label} set ${p.ref}">
          <img src="images/range/${p.id}_t.jpg" alt="${label} set — reference ${p.ref}"
               loading="lazy" decoding="async" width="460" height="460">
        </button>
        <div class="range-tile-body">
          <span class="range-tile-cat">${label}</span>
          <span class="range-tile-ref">${p.ref}</span>
          <span class="range-tile-pieces">${pieces}</span>
          <a class="btn btn-outline range-tile-cta"
             href="contact.html?product=${encodeURIComponent(label + ' set ' + p.ref)}">Enquire</a>
        </div>
      </article>`;
  }

  function render() {
    const list = filtered();
    const grid = $('range-grid');
    const slice = list.slice(0, state.shown);
    grid.innerHTML = slice.map(tile).join('') ||
      `<p class="range-empty">Nothing matches that yet. Try another category,
        or <a href="contact.html">tell us what you are looking for</a> — the
        full range runs well beyond what is shown here.</p>`;

    $('range-count').textContent =
      list.length === 1 ? '1 set' : `${list.length} sets`;

    const more = $('range-more');
    if (more) {
      const remaining = list.length - slice.length;
      more.hidden = remaining <= 0;
      more.textContent = `Show ${Math.min(remaining, PAGE_SIZE)} more`;
    }
  }

  function buildChips() {
    const wrap = $('range-chips');
    if (!wrap) return;
    const counts = {};
    (window.GN_RANGE || []).forEach(p => { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    const cats = (window.GN_CATEGORIES || []).filter(c => counts[c.id]);

    // Picture cards rather than text chips: the buyer recognises the
    // category from the goods far faster than from its name.
    wrap.innerHTML = cats.map(c => `
      <button class="cat-card" data-cat="${c.id}" title="${c.desc}">
        <img src="${c.thumb}" alt="${c.label}" loading="lazy" decoding="async"
             width="700" height="700">
        <span class="cat-card-name">${c.label}</span>
        <span class="cat-card-count">${counts[c.id]} ${counts[c.id] === 1 ? 'set' : 'sets'}</span>
      </button>`).join('') +
      `<button class="cat-card cat-card-all is-active" data-cat="all">
        <span class="cat-card-name">All categories</span>
        <span class="cat-card-count">${(window.GN_RANGE || []).length} sets</span>
      </button>`;

    wrap.addEventListener('click', e => {
      const b = e.target.closest('.cat-card');
      if (!b) return;
      wrap.querySelectorAll('.cat-card').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      state.cat = b.dataset.cat;
      state.shown = PAGE_SIZE;
      render();
      $('range-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  /* ---------------------------------------------------------- lightbox */
  function openTile(id) {
    const p = (window.GN_RANGE || []).find(x => x.id === id);
    if (!p) return;
    const label = p.noun.replace(/&amp;/g, '&');
    const box = document.createElement('div');
    box.className = 'range-lightbox';
    box.innerHTML = `
      <div class="range-lightbox-inner" role="dialog" aria-modal="true" aria-label="${label} ${p.ref}">
        <button class="range-lightbox-close" aria-label="Close">&times;</button>
        <img src="images/range/${p.id}.jpg" alt="${label} — reference ${p.ref}">
        <div class="range-lightbox-meta">
          <div>
            <strong>${label}</strong>
            <span>Ref ${p.ref} · ${p.n > 1 ? p.n + ' pieces shown' : 'single piece'} · minimum order 50 units · your logo applied</span>
          </div>
          <a class="btn btn-gold" href="contact.html?product=${encodeURIComponent(label + ' set ' + p.ref)}">Get a quote</a>
        </div>
      </div>`;
    document.body.appendChild(box);
    document.body.style.overflow = 'hidden';
    const bar = document.querySelector('.quote-bar');
    if (bar) bar.classList.add('hidden-by-modal');

    const close = () => {
      box.remove();
      document.body.style.overflow = '';
      if (bar) bar.classList.remove('hidden-by-modal');
      document.removeEventListener('keydown', onKey);
    };
    const onKey = e => { if (e.key === 'Escape') close(); };
    box.addEventListener('click', e => {
      if (e.target === box || e.target.closest('.range-lightbox-close')) close();
    });
    document.addEventListener('keydown', onKey);
  }

  function init() {
    if (!$('range-grid')) return;
    buildChips();
    render();

    const search = $('range-search');
    if (search) {
      let t;
      search.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => {
          state.q = search.value.trim().toLowerCase();
          state.shown = PAGE_SIZE;
          render();
        }, 160);
      });
    }

    const more = $('range-more');
    if (more) more.addEventListener('click', () => {
      state.shown += PAGE_SIZE;
      render();
    });

    $('range-grid').addEventListener('click', e => {
      const b = e.target.closest('[data-open]');
      if (b) openTile(b.dataset.open);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { init };
})();

if (typeof window !== 'undefined') window.Range = Range;
