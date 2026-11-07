/*
 * Motion for the royal prototype.
 *
 * One requestAnimationFrame loop owns every scroll-linked value, and each
 * value is eased toward its target rather than snapped to it, so the whole
 * page moves with the same weight: the hero camera, the panorama, the
 * collection's page-turn, parallax and the cursor tilt.
 */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);

  /* ------------------------------------------------- generated ornament */

  // A mandala: concentric rings, petals and dots, drawn once as SVG.
  function mandala(el) {
    const n = +el.dataset.mandala || 24, c = 200, parts = [];
    [196, 172, 150, 108, 66, 30].forEach((r, i) =>
      parts.push(`<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="currentColor" stroke-width="${i % 2 ? .6 : 1}" ${i === 1 ? 'stroke-dasharray="2 6"' : ''}/>`));
    for (let k = 0; k < n; k++) {
      const a = (360 / n) * k;
      parts.push(`<g transform="rotate(${a} ${c} ${c})">
        <path d="M${c} ${c - 196}C${c + 14} ${c - 176} ${c + 14} ${c - 160} ${c} ${c - 150}C${c - 14} ${c - 160} ${c - 14} ${c - 176} ${c} ${c - 196}Z" fill="none" stroke="currentColor" stroke-width=".8"/>
        <path d="M${c} ${c - 148}C${c + 22} ${c - 128} ${c + 20} ${c - 112} ${c} ${c - 108}C${c - 20} ${c - 112} ${c - 22} ${c - 128} ${c} ${c - 148}Z" fill="none" stroke="currentColor" stroke-width=".8"/>
        <circle cx="${c}" cy="${c - 88}" r="2.2" fill="currentColor"/>
        <path d="M${c} ${c - 66}L${c + 6} ${c - 48}L${c} ${c - 30}L${c - 6} ${c - 48}Z" fill="none" stroke="currentColor" stroke-width=".7"/></g>`);
    }
    el.innerHTML = `<svg viewBox="0 0 400 400" aria-hidden="true">${parts.join('')}</svg>`;
  }
  $$('[data-mandala]').forEach(mandala);

  // The palace on the lake: one SVG, drawn from parts — onion domes,
  // chhatris, minarets, a crenellated facade and rows of arched windows.
  // The same drawing, flipped and blurred, is its reflection in the water.
  const palace = $('#palace');
  const wins = [];
  if (palace) {
    const W = 2000, B = 600, body = [], gold = [], win = [];
    const dome = (cx, by, w, h) => {
      body.push(`M${cx - w / 2} ${by}C${cx - w / 2 - w * .14} ${by - h * .42} ${cx - w * .09} ${by - h * .72} ${cx} ${by - h}` +
                `C${cx + w * .09} ${by - h * .72} ${cx + w / 2 + w * .14} ${by - h * .42} ${cx + w / 2} ${by}Z`);
      gold.push(`M${cx - 1.5} ${by - h}h3v${-h * .22}h-3z`,
                `M${cx - w * .05} ${by - h - h * .3}a${w * .05} ${w * .05} 0 1 0 ${w * .1} 0a${w * .05} ${w * .05} 0 1 0 ${-w * .1} 0`);
    };
    const rect = (x, y, w, h) => body.push(`M${x} ${y}h${w}v${h}h${-w}z`);
    const crenel = (x, y, w) => { const n = Math.round(w / 26); for (let i = 0; i < n; i++) rect(x + i * (w / n) + 3, y - 12, w / n - 8, 12); };
    const chhatri = (cx, by, w) => {
      rect(cx - w / 2, by - 8, w, 8); rect(cx - w / 2 + 3, by - w * .7, 5, w * .62); rect(cx + w / 2 - 8, by - w * .7, 5, w * .62);
      rect(cx - w / 2 - 4, by - w * .78, w + 8, 8); dome(cx, by - w * .78, w * .8, w * .62);
    };
    const windows = (x0, x1, y, h, gap, rank) => {
      const w = h * .55;
      for (let x = x0; x + w <= x1; x += w + gap) {
        win.push({ d: `M${x} ${y + h}V${y + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2}V${y + h}Z`,
                   rank: rank + Math.abs(x + w / 2 - W / 2) / W });
      }
    };
    // outer walls and minarets
    rect(60, 470, 360, 130); crenel(60, 470, 360); rect(1580, 470, 360, 130); crenel(1580, 470, 360);
    [[150, 250], [1850, 250]].forEach(([x, top]) => { rect(x - 18, top, 36, B - top); dome(x, top, 52, 60); rect(x - 26, top + 70, 52, 8); });
    // wings with chhatris and towers
    rect(400, 390, 330, 210); crenel(400, 390, 330); rect(1270, 390, 330, 210); crenel(1270, 390, 330);
    [480, 650, 1350, 1520].forEach(x => chhatri(x, 390 - 12, 62));
    [[400, 150], [1600, 150]].forEach(([x, top]) => { rect(x - 22, top + 40, 44, B - top - 40); dome(x, top + 40, 66, 78); });
    // the central block and its great dome
    rect(720, 320, 560, 280); crenel(720, 320, 560);
    rect(900, 250, 200, 70); dome(1000, 250, 230, 230);
    dome(790, 308, 120, 128); dome(1210, 308, 120, 128);
    // windows, ranked so the palace wakes from its heart outward
    windows(745, 905, 360, 44, 16, 0); windows(1095, 1260, 360, 44, 16, 0);
    windows(745, 905, 430, 44, 16, .1); windows(1095, 1260, 430, 44, 16, .1);
    windows(935, 1070, 268, 38, 14, 0);
    windows(420, 715, 430, 40, 18, .3); windows(1285, 1580, 430, 40, 18, .3);
    windows(420, 715, 500, 40, 18, .4); windows(1285, 1580, 500, 40, 18, .4);
    windows(80, 410, 510, 34, 22, .6); windows(1590, 1925, 510, 34, 22, .6);

    const gate = 'M948 600V520A52 52 0 0 1 1052 520V600Z';
    const draw = cls => `<svg class="${cls}" viewBox="0 0 ${W} ${B}" preserveAspectRatio="xMidYMax meet">` +
      `<path class="pal-body" d="${body.join('')}"/>` +
      `<path class="pal-edge" d="M60 470h360M400 390h330M720 320h560M1270 390h330M1580 470h360"/>` +
      win.map((w, i) => `<path class="win" data-i="${i}" d="${w.d}" style="--fl:${(3 + Math.random() * 4).toFixed(1)}s"/>`).join('') +
      `<path class="win gate" data-i="g" d="${gate}"/>` +
      `<path class="pal-gold" d="${gold.join('')}"/></svg>`;
    palace.innerHTML = draw('pal') + draw('ref');
    // light order: by rank plus a little chance, so it never reads as a sweep
    const order = win.map((w, i) => ({ i, k: w.rank + Math.random() * .12 })).sort((a, b) => a.k - b.k).map(o => o.i);
    order.unshift('g');
    order.forEach(i => wins.push($$(`.win[data-i="${i}"]`, palace)));
  }

  // Sky lanterns released from the lake, each at its own pace.
  const sl = $('#skylanterns');
  if (sl && !reduce) {
    sl.innerHTML = Array.from({ length: innerWidth < 700 ? 8 : 16 }, () => {
      const w = 9 + Math.random() * 15;
      return `<i style="left:${(8 + Math.random() * 84).toFixed(1)}%;--w:${w.toFixed(1)}px;--t:${(16 + Math.random() * 16).toFixed(1)}s;` +
             `--dl:${(-Math.random() * 30).toFixed(1)}s;--dx:${((Math.random() - .5) * 160).toFixed(0)}px;--o:${(.55 + w / 50).toFixed(2)}"></i>`;
    }).join('');
  }

  /* --------------------------------------------- sky: stars & fireworks */

  const starsC = $('#stars'), fireC = $('#fireworks');
  const dpr = Math.min(2, devicePixelRatio || 1);
  let stars = [], shooting = null;
  const sizeCanvas = cv => { if (cv) { cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; } };
  function seedStars() {
    if (!starsC) return;
    sizeCanvas(starsC);
    const n = Math.round(starsC.width * starsC.height / (dpr * dpr * 2600));
    stars = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.pow(Math.random(), 1.6) * .62,        // dense overhead, thinning toward the glow
      r: (Math.random() < .08 ? 1.6 : .5 + Math.random() * .9) * dpr,
      s: .6 + Math.random() * 2.2, ph: Math.random() * 6.28,
      c: Math.random() < .2 ? '255,224,150' : '255,250,235',
    }));
  }
  seedStars(); sizeCanvas(fireC);
  addEventListener('resize', () => { seedStars(); sizeCanvas(fireC); });

  function drawStars(t) {
    const g = starsC.getContext('2d'), w = starsC.width, h = starsC.height;
    g.clearRect(0, 0, w, h);
    for (const st of stars) {
      const a = .35 + .65 * (.5 + .5 * Math.sin(t * .001 * st.s + st.ph));
      g.fillStyle = `rgba(${st.c},${a.toFixed(3)})`;
      g.beginPath(); g.arc(st.x * w, st.y * h, st.r, 0, 6.283); g.fill();
    }
    if (!shooting && Math.random() < .004) shooting = { x: .1 + Math.random() * .6, y: .05 + Math.random() * .2, life: 0 };
    if (shooting) {
      const L = shooting.life += .02, x = (shooting.x + L * .35) * w, y = (shooting.y + L * .12) * h;
      const grad = g.createLinearGradient(x, y, x - 120 * dpr, y - 40 * dpr);
      grad.addColorStop(0, `rgba(255,240,200,${Math.max(0, 1 - L).toFixed(2)})`); grad.addColorStop(1, 'rgba(255,240,200,0)');
      g.strokeStyle = grad; g.lineWidth = 1.6 * dpr; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 120 * dpr, y - 40 * dpr); g.stroke();
      if (L >= 1) shooting = null;
    }
  }

  // Fireworks: mostly gold, with ruby, emerald and ivory between them.
  const sparks = [];
  const PALETTE = ['255,231,163', '236,197,111', '255,214,107', '255,231,163', '212,58,106', '31,143,95', '255,247,232'];
  function burst(x, y, big) {
    if (!fireC || reduce) return;
    const c = PALETTE[Math.floor(Math.random() * PALETTE.length)], n = big ? 110 : 70, sp = (big ? 3.4 : 2.6) * dpr;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283 + Math.random() * .1, v = sp * (.55 + Math.random() * .45);
      sparks.push({ x, y, px: x, py: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, decay: .009 + Math.random() * .01, c });
    }
  }
  let nextBurst = 1800;
  function drawFire(t) {
    const g = fireC.getContext('2d'), w = fireC.width, h = fireC.height;
    g.clearRect(0, 0, w, h);
    if (t > nextBurst) { burst((.18 + Math.random() * .64) * w, (.1 + Math.random() * .28) * h); nextBurst = t + 1800 + Math.random() * 2800; }
    g.globalCompositeOperation = 'lighter';
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.px = p.x; p.py = p.y; p.vx *= .985; p.vy = p.vy * .985 + .035 * dpr; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      g.strokeStyle = `rgba(${p.c},${p.life.toFixed(3)})`; g.lineWidth = 1.6 * dpr;
      g.beginPath(); g.moveTo(p.px - p.vx * 2, p.py - p.vy * 2); g.lineTo(p.x, p.y); g.stroke();
    }
    g.globalCompositeOperation = 'source-over';
  }

  // Marigold petals, each with its own size, speed, drift and blur.
  const petals = $('#petals');
  if (petals && !reduce) {
    petals.innerHTML = Array.from({ length: innerWidth < 700 ? 10 : 20 }, () => {
      const w = 10 + Math.random() * 18;
      return `<i style="left:${Math.random() * 100}%;--w:${w}px;--t:${9 + Math.random() * 10}s;--dl:${-Math.random() * 18}s;` +
             `--dx:${(Math.random() - .5) * 260}px;--b:${w > 22 ? 1.4 : 0}px"></i>`;
    }).join('');
  }

  // Each layer of the hero diorama sits at its own depth. A layer pushed
  // back by z is scaled by (P - z) / P so it still fills the frame.
  const P = 1000;
  $$('.layer').forEach(l => {
    const z = +l.dataset.z || 0;
    l.style.setProperty('--z', z + 'px');
    l.style.setProperty('--s', ((P - z) / P).toFixed(3));
  });

  // Headline words rise one beat apart.
  $$('.display').forEach(h => $$('.w', h).forEach((w, i) => w.style.setProperty('--i', i)));
  $$('[data-d]').forEach(el => el.style.setProperty('--d', el.dataset.d));

  /* ------------------------------------------------------- the curtain */

  const curtain = $('#curtain');
  const heroTitle = $('.hero .display');
  const openCurtain = () => {
    curtain?.classList.add('open');
    setTimeout(() => heroTitle?.classList.add('in'), 450);
    setTimeout(() => $$('.hero .reveal').forEach(r => r.classList.add('in')), 750);
    setTimeout(() => curtain?.classList.add('gone'), 1700);
  };
  if (reduce) { curtain?.classList.add('gone'); heroTitle?.classList.add('in'); }
  else addEventListener('load', () => setTimeout(openCurtain, 500), { once: true });
  setTimeout(() => { if (!curtain?.classList.contains('open')) openCurtain(); }, 3500);   // slow images: never hold the page

  /* ------------------------------------------------------ entrances */

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    if (e.target.classList.contains('steps')) e.target.style.setProperty('--draw', 1);
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  $$('.reveal, .display, .steps').forEach(el => { if (!el.closest('.hero')) io.observe(el); });

  /* ------------------------------------------------------------- nav */

  const nav = $('#nav'), burger = $('#burger'), sheet = $('#sheet');
  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', open);
    sheet.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  });
  sheet?.addEventListener('click', e => { if (e.target.closest('a')) burger.click(); });

  /* ------------------------------------------------- pointer: tilt & glow */

  const ptr = { x: .5, y: .5, tx: .5, ty: .5 };
  if (fine) addEventListener('pointermove', e => { ptr.tx = e.clientX / innerWidth; ptr.ty = e.clientY / innerHeight; }, { passive: true });

  // Cards lean toward the cursor, like a card held up to the light.
  if (fine && !reduce) {
    $$('.occ, .ev, .bcard').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--ty', (x * 10).toFixed(2) + 'deg');
        card.style.setProperty('--tx', (-y * 8).toFixed(2) + 'deg');
      });
      card.addEventListener('pointerleave', () => { card.style.setProperty('--ty', '0deg'); card.style.setProperty('--tx', '0deg'); });
    });
    // Buttons drift a few pixels toward the cursor and settle back.
    $$('.btn').forEach(b => {
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * .18).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * .28).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', () => { b.style.setProperty('--mx', '0px'); b.style.setProperty('--my', '0px'); });
    });
  }

  /* ------------------------------------------------ occasions: drag rail */

  const rail = $('#rail'), railbar = $('#railbar');
  if (rail) {
    let down = false, sx = 0, sl = 0, moved = 0;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = rail.scrollLeft; rail.classList.add('drag'); });
    addEventListener('pointermove', e => { if (!down) return; moved = Math.abs(e.clientX - sx); rail.scrollLeft = sl - (e.clientX - sx) * 1.3; });
    addEventListener('pointerup', () => { if (!down) return; down = false; rail.classList.remove('drag'); });
    rail.addEventListener('click', e => { if (moved > 6) e.preventDefault(); }, true);
    rail.addEventListener('scroll', () => {
      const p = rail.scrollLeft / Math.max(1, rail.scrollWidth - rail.clientWidth);
      railbar.style.transform = `scaleX(${.15 + p * .85})`;
    }, { passive: true });
  }

  /* --------------------------------------------- collection: page-turn */

  const coll = $('#collection'), shots = $$('.shot'), items = $$('#colllist li'), collnum = $('#collnum');
  let collIdx = -1;
  function setColl(i) {
    if (i === collIdx) return;
    collIdx = i;
    shots.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('past', k < i); });
    items.forEach((li, k) => li.classList.toggle('on', k === i));
    if (collnum) collnum.textContent = String(i + 1).padStart(2, '0');
  }
  items.forEach((li, k) => li.addEventListener('click', () => {
    if (innerWidth <= 960) { setColl(k); return; }
    const r = coll.getBoundingClientRect(), span = coll.offsetHeight - innerHeight;
    scrollTo({ top: scrollY + r.top + span * ((k + .5) / items.length), behavior: 'smooth' });
  }));
  setColl(0);

  /* ------------------------------------------------------- panorama */

  const ring = $('#ring'), stage = $('#panostage'), pano = $('#pano');
  const figs = ring ? $$('figure', ring) : [];
  const step = 360 / Math.max(1, figs.length);
  let R = 600;
  function sizeRing() {
    if (!ring) return;
    const pw = innerWidth <= 960 ? 190 : 300;
    // radius at which the panels just touch, plus air between them
    R = Math.round(pw / (2 * Math.tan(Math.PI / figs.length)) + (innerWidth <= 960 ? 30 : 70));
    ring.style.setProperty('--R', R + 'px');
    figs.forEach((f, i) => f.style.setProperty('--a', (i * step) + 'deg'));
  }
  sizeRing();
  addEventListener('resize', sizeRing);

  // Drag turns the ring on top of whatever scroll has turned it to,
  // and keeps turning briefly after release.
  const spin = { drag: 0, vel: 0, down: false, lastX: 0 };
  if (stage) {
    stage.addEventListener('pointerdown', e => { spin.down = true; spin.lastX = e.clientX; stage.classList.add('drag'); stage.setPointerCapture(e.pointerId); });
    stage.addEventListener('pointermove', e => {
      if (!spin.down) return;
      const dx = e.clientX - spin.lastX; spin.lastX = e.clientX;
      spin.vel = dx * .25; spin.drag += spin.vel;
    });
    const up = () => { spin.down = false; stage.classList.remove('drag'); };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  }

  /* ----------------------------------------------------- the one loop */

  const hero = $('#hero'), scene = $('#scene'), glow = $('#glow');
  const front = $('.l-front'), heroScroll = $('.hero-scroll'), archImg = $('[data-parallax-img]'), welcome = $('#welcome');
  const skyphoto = $('#skyphoto');
  const bar = $('#scrollbar'), parallax = $$('[data-parallax]');
  const S = { cam: 0, rot: 0, bar: 0, lastY: scrollY, lit: 0, salvo: false };
  const opened = performance.now();

  function frame(t) {
    const vh = innerHeight, y = scrollY;

    // page progress
    const pg = y / Math.max(1, document.documentElement.scrollHeight - vh);
    S.bar = lerp(S.bar, pg, .2);
    if (bar) bar.style.transform = `scaleX(${S.bar.toFixed(4)})`;

    // nav: solid once you leave the top, out of the way while reading down
    if (nav) {
      nav.classList.toggle('solid', y > 40);
      if (Math.abs(y - S.lastY) > 6) { nav.classList.toggle('hide', y > S.lastY && y > 500 && (!sheet || sheet.hidden)); S.lastY = y; }
    }

    // pointer, smoothed
    ptr.x = lerp(ptr.x, ptr.tx, .07); ptr.y = lerp(ptr.y, ptr.ty, .07);

    if (!reduce) {
      // HERO: scroll flies the camera forward through the arch; the cursor tilts the scene
      if (hero && scene) {
        const r = hero.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        // the camera stops just short of the welcome line, so the hero ends on it
        S.cam = lerp(S.cam, ease(p) * 560, .14);
        const onScreen = r.bottom > 0;
        if (onScreen) {
          if (starsC) drawStars(t);
          if (fireC) drawFire(t);
          // the palace wakes: lamps come on as the page opens, the rest as you approach
          const wake = clamp((t - opened - 900) / 3200);
          const want = Math.round(clamp(wake * .55 + p * 1.1) * wins.length);
          while (S.lit < want) wins[S.lit++].forEach(w => w.classList.add('lit'));
          if (skyphoto) skyphoto.style.setProperty('--wake', clamp(wake * .62 + p * .9).toFixed(3));
        }
        const rx = (ptr.y - .5) * -5, ry = (ptr.x - .5) * 7;
        scene.style.setProperty('--cam', S.cam.toFixed(1) + 'px');
        scene.style.setProperty('--rx', rx.toFixed(2) + 'deg');
        scene.style.setProperty('--ry', ry.toFixed(2) + 'deg');
        if (front) front.style.opacity = (1 - clamp((p - .3) / .26)).toFixed(3);
        // rises as the arch dissolves, holds, then gives way to the page
        if (welcome) {
          const wo = clamp((p - .34) / .18);
          welcome.style.setProperty('--wo', wo.toFixed(3));
          // the moment you arrive inside, the sky celebrates
          if (wo > .6 && !S.salvo && fireC) {
            S.salvo = true;
            const w = fireC.width, h = fireC.height;
            [[.3, .2], [.7, .16], [.5, .1]].forEach(([x, y], k) => setTimeout(() => burst(x * w, y * h, true), k * 260));
          }
          if (wo < .1) S.salvo = false;
        }
        if (heroScroll) heroScroll.style.opacity = (1 - clamp(p / .12)).toFixed(3);
        if (glow) glow.style.left = (ptr.x * 100) + '%', glow.style.top = (ptr.y * 100) + '%';
        if (archImg) archImg.style.setProperty('--py', (p * -60).toFixed(1) + 'px');
      }

      // parallax backdrops
      parallax.forEach(el => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - vh / 2) * -(+el.dataset.parallax)).toFixed(1)}px, 0)`;
      });

      // COLLECTION: five equal stretches of scroll, one range each
      if (coll && innerWidth > 960) {
        const r = coll.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, coll.offsetHeight - vh));
        setColl(Math.min(items.length - 1, Math.floor(p * items.length)));
      }

      // PANORAMA: one full turn across the section, plus any drag
      if (ring && pano) {
        const r = pano.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, pano.offsetHeight - vh));
        if (!spin.down) { spin.vel *= .94; spin.drag += spin.vel; }
        const target = -p * 360 + spin.drag;
        S.rot = lerp(S.rot, target, .1);
        ring.style.setProperty('--rot', S.rot.toFixed(2) + 'deg');
        // light each panel by how squarely it faces the viewer
        figs.forEach((f, i) => {
          let a = ((i * step + S.rot) % 360 + 540) % 360 - 180;     // -180..180, 0 = facing us
          const face = Math.cos(a * Math.PI / 180);                  // 1 front, -1 behind
          f.style.setProperty('--lit', (.32 + Math.max(0, face) * .68).toFixed(3));
          f.style.setProperty('--sat', (.55 + Math.max(0, face) * .45).toFixed(3));
          f.style.setProperty('--cap', clamp((face - .9) / .1).toFixed(3));
        });
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
