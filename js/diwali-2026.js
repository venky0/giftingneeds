/**
 * Gifting Needs — Diwali 2026 landing page
 *
 * Vanilla port of the React build. Everything is scoped to the `.dw` wrapper so
 * it cannot touch the shared header, footer or any other page.
 *
 * Enquiries are handed to window.LeadDelivery (js/leads.js) so this page uses
 * the same Web3Forms → WhatsApp pipeline as the rest of the site.
 */
(function () {
  'use strict';

  var root = document.querySelector('.dw');
  if (!root) return;

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- reveal */
  (function scrollReveal() {
    root.classList.add('reveal-ready');
    var targets = root.querySelectorAll('[data-reveal], [data-reveal-stagger]');
    if (!('IntersectionObserver' in window) || reduced) {
      Array.prototype.forEach.call(targets, function (el) {
        el.classList.add('is-revealed');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-revealed');
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0 }
    );
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
    // Reveals only what is genuinely on screen, so a missed callback can never
    // leave a section invisible, and nothing below the fold is pre-empted.
    var poll = setInterval(function () {
      var remaining = 0;
      Array.prototype.forEach.call(targets, function (el) {
        if (el.classList.contains('is-revealed')) return;
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
          el.classList.add('is-revealed');
          io.unobserve(el);
        } else remaining++;
      });
      if (!remaining) clearInterval(poll);
    }, 500);
  })();

  /* ------------------------------------------------------------- carousel */
  (function carousel() {
    var stage = root.querySelector('.hero-photo');
    if (!stage) return;
    var slides = stage.querySelectorAll('picture');
    var copies = root.querySelectorAll('.hero-slide-copy');
    var dots = root.querySelectorAll('.hero-dots button');
    var canvas = root.querySelector('.hero-sparks');
    var live = root.querySelector('.hero-live');
    if (slides.length < 2) return;

    var index = 0, paused = false, timer = null, frame = 0;
    var HUES = ['#ffd27a', '#ffb257', '#ff8f45', '#ffe6b8', '#f7a13d'];

    function burst() {
      if (reduced || !canvas) return;
      var ctx = canvas.getContext('2d');
      if (!ctx) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
      var w = canvas.width, h = canvas.height, sparks = [], i, cx, a, sp;
      for (i = 0; i < 90; i++) {
        sparks.push({ x: Math.random() * w, y: h * (0.62 + Math.random() * 0.42),
          vx: (Math.random() - 0.5) * 1.5 * dpr, vy: -(1.1 + Math.random() * 2.6) * dpr,
          life: 0, max: 58 + Math.random() * 46, r: (1 + Math.random() * 2.1) * dpr,
          hue: HUES[i % HUES.length] });
      }
      [w * 0.26, w * 0.74].forEach(function (fx) {
        for (i = 0; i < 34; i++) {
          a = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
          sp = (1.8 + Math.random() * 3.4) * dpr;
          sparks.push({ x: fx + (Math.random() - 0.5) * 40 * dpr, y: h * 0.9,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0,
            max: 50 + Math.random() * 40, r: (1.3 + Math.random() * 2.3) * dpr,
            hue: HUES[i % HUES.length] });
        }
      });
      if (frame) cancelAnimationFrame(frame);
      (function step() {
        ctx.clearRect(0, 0, w, h);
        var alive = [];
        sparks.forEach(function (s) {
          s.life++; s.x += s.vx; s.y += s.vy;
          s.vy += 0.045;           // gravity, so embers arc rather than fly straight
          s.vx *= 0.992;
          var t = s.life / s.max;
          if (t >= 1) return;
          ctx.globalAlpha = Math.max(0, t < 0.18 ? t / 0.18 : 1 - (t - 0.18) / 0.82);
          ctx.fillStyle = s.hue;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * (1 - t * 0.45), 0, Math.PI * 2);
          ctx.fill();
          alive.push(s);
        });
        ctx.globalAlpha = 1;
        sparks = alive;
        frame = alive.length ? requestAnimationFrame(step) : 0;
      })();
    }

    function show(next) {
      index = ((next % slides.length) + slides.length) % slides.length;
      Array.prototype.forEach.call(slides, function (el, i) {
        el.classList.toggle('is-active', i === index);
      });
      Array.prototype.forEach.call(copies, function (el, i) {
        var on = i === index;
        el.hidden = !on;
        if (on) { el.classList.remove('is-entering'); void el.offsetWidth; el.classList.add('is-entering'); }
      });
      Array.prototype.forEach.call(dots, function (el, i) {
        el.classList.toggle('is-active', i === index);
        el.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
      if (live) live.textContent = 'Banner ' + (index + 1) + ' of ' + slides.length;
      burst();
      schedule();
    }

    function schedule() {
      clearTimeout(timer);
      // A timeout chain, not an interval: choosing a dot gives the full hold.
      if (!paused) timer = setTimeout(function () { show(index + 1); }, 5000);
    }

    Array.prototype.forEach.call(dots, function (el, i) {
      el.addEventListener('click', function () { show(i); });
    });
    root.querySelector('.hero').addEventListener('mouseenter', function () { paused = true; clearTimeout(timer); });
    root.querySelector('.hero').addEventListener('mouseleave', function () { paused = false; schedule(); });
    document.addEventListener('visibilitychange', function () {
      paused = document.hidden;
      if (paused) clearTimeout(timer); else schedule();
    });
    schedule();
  })();

  /* --------------------------------------------------------------- finder */
  (function finder() {
    var form = root.querySelector('.hamper-finder');
    if (!form) return;
    var qty = form.querySelector('[name="recipients"]');
    var budget = form.querySelector('[name="budget"]');
    var status = root.querySelector('.finder-status');
    var cards = root.querySelectorAll('.product-card');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var lo = 0, hi = Infinity, parts = budget.value.split('-');
      if (budget.value !== 'all') { lo = Number(parts[0]); hi = Number(parts[1] || Infinity); }
      var shown = 0;
      Array.prototype.forEach.call(cards, function (card) {
        var min = Number(card.dataset.min), max = Number(card.dataset.max);
        var match = min <= hi && max >= lo;
        card.hidden = !match;
        if (match) shown++;
      });
      var n = Number(qty.value).toLocaleString('en-IN');
      status.innerHTML = shown
        ? '<span>' + shown + (shown === 1 ? ' hamper matches' : ' hampers match') +
          ' your budget for ' + n + ' recipients.</span>' +
          '<button type="button" class="text-link" data-reset>Show all hampers</button>'
        : '<span>Our gifting team can curate options for this budget.</span>' +
          '<button type="button" class="text-link" data-reset>Show all hampers</button>';
    });

    root.addEventListener('click', function (e) {
      if (!e.target.closest('[data-reset]')) return;
      Array.prototype.forEach.call(cards, function (c) { c.hidden = false; });
      budget.value = 'all';
      status.textContent = '';
    });
  })();

  /* --------------------------------------------------------------- dialog */
  (function enquiry() {
    var dialog = root.querySelector('.dw-dialog');
    if (!dialog) return;
    var form = dialog.querySelector('form');
    var contextField = dialog.querySelector('[name="productDetails"]');
    var heading = dialog.querySelector('.dw-dialog-title');
    var note = dialog.querySelector('.dw-dialog-note');
    var lastFocus = null;

    function open(context, title) {
      lastFocus = document.activeElement;
      contextField.value = context || 'Diwali 2026 gifting enquiry';
      heading.textContent = title || 'Request a bulk quote';
      note.textContent = '';
      dialog.hidden = false;
      document.body.style.overflow = 'hidden';
      var first = form.querySelector('input, select, textarea');
      if (first) first.focus();
    }
    function close() {
      dialog.hidden = true;
      document.body.style.overflow = '';
      if (lastFocus) lastFocus.focus();
    }

    root.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-enquiry]');
      if (trigger) {
        e.preventDefault();
        open(trigger.getAttribute('data-enquiry'), trigger.getAttribute('data-enquiry-title'));
      }
    });
    dialog.addEventListener('click', function (e) {
      if (e.target.matches('[data-close], .dw-dialog-scrim')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !dialog.hidden) close();
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = new FormData(form);
      var lead = {
        name: (data.get('name') || '').toString().trim(),
        company: (data.get('company') || '').toString().trim(),
        email: (data.get('email') || '').toString().trim(),
        phone: (data.get('phone') || '').toString().trim(),
        qty: (data.get('qty') || '').toString().trim(),
        timeline: (data.get('timeline') || '').toString().trim(),
        productDetails: (data.get('productDetails') || '').toString().trim(),
        summary: (data.get('summary') || '').toString().trim(),
        message: (data.get('message') || '').toString().trim()
      };
      var submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      note.textContent = 'Sending your enquiry…';

      // Same delivery path as every other page: inbox first, WhatsApp fallback.
      if (!window.LeadDelivery) {
        note.innerHTML = 'Please send this to us on ' +
          '<a href="https://wa.me/916361054099" target="_blank" rel="noreferrer">WhatsApp</a>.';
        submit.disabled = false;
        return;
      }
      window.LeadDelivery.send(lead).then(function (res) {
        submit.disabled = false;
        if (res.delivered) {
          note.textContent = 'Thank you — our gifting team will reply within one working day.';
          form.reset();
        } else {
          note.innerHTML = 'Almost there — ' +
            '<a class="dw-wa" href="' + res.whatsapp + '" target="_blank" rel="noreferrer">' +
            'send it on WhatsApp</a> and we will pick it up right away.';
        }
      });
    });
  })();
})();
