/**
 * Gifting Needs — Christmas & New Year 2026-27 campaign (every page)
 *   1. countdown to Christmas, then to New Year
 *   2. sticky quote bar on scroll
 *   3. gentle snowfall (off for reduced-motion, paused on hidden tabs)
 *
 * Replaces js/diwali.js on the inner pages.
 */
(() => {
  'use strict';

  const CHRISTMAS = new Date('2026-12-25T00:00:00+05:30');
  const NEW_YEAR = new Date('2027-01-01T00:00:00+05:30');

  /* 1. countdown ---------------------------------------------------------- */
  const nodes = document.querySelectorAll('[data-countdown]');
  if (nodes.length) {
    const tick = () => {
      const now = Date.now();
      const target = now < CHRISTMAS ? CHRISTMAS : NEW_YEAR;
      const label = now < CHRISTMAS ? 'Christmas in' : 'New Year in';
      const diff = Math.max(0, target - now);
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      nodes.forEach((el) => {
        if (now >= NEW_YEAR) { el.innerHTML = '<span class="cd-label">Happy New Year 2027</span>'; return; }
        el.innerHTML =
          `<span class="cd-label">${label}</span>` +
          `<span class="countdown-unit"><b>${d}</b><i>d</i></span>` +
          `<span class="countdown-unit"><b>${h}</b><i>h</i></span>` +
          `<span class="countdown-unit"><b>${m}</b><i>m</i></span>`;
      });
    };
    tick();
    setInterval(tick, 60000);
  }

  /* 2. quote bar ---------------------------------------------------------- */
  const bar = document.querySelector('.quote-bar');
  if (bar) {
    let ticking = false;
    const show = () => {
      const past = window.scrollY > window.innerHeight * 0.6;
      bar.classList.toggle('visible', past);
      document.body.classList.toggle('quote-bar-on', past);
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { show(); ticking = false; });
    }, { passive: true });
    show();
  }

  /* 3. snow ---------------------------------------------------------------- */
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.id = 'xm-snow';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, flakes = [], raf = 0;
  const count = () => (window.innerWidth < 700 ? 28 : 60);
  const make = () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: 1 + Math.random() * 2.6, v: 0.35 + Math.random() * 0.9, s: Math.random() * Math.PI * 2, a: 0.35 + Math.random() * 0.5
  });
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    flakes = Array.from({ length: count() }, make);
  };
  const frame = () => {
    ctx.clearRect(0, 0, W, H);
    for (const f of flakes) {
      f.y += f.v; f.s += 0.012; f.x += Math.sin(f.s) * 0.4;
      if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${f.a})`;
      ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 2;
      ctx.arc(f.x, f.y, f.r, 0, 6.2832);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    if (!document.hidden) raf = requestAnimationFrame(frame);
  });
  raf = requestAnimationFrame(frame);
})();
