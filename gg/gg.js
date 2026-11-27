/* Gifting Needs, Gesture-style shell: announcement bar, header, footer, countdown, reveal.
   Pages put <div id="gg-ann"></div><div id="gg-header"></div> at the top of <body>
   and <div id="gg-footer"></div> at the bottom. */
(function () {
  var SHOP = 'https://giftingneeds.org/storefront/';
  var TARGET = new Date('2027-01-01T00:00:00+05:30').getTime();   // midnight, India time
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  var parts = function (ms) { var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 }; };
  var days = function () { return parts(TARGET - Date.now()).d; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  var CATS = [['New Year 2027', SHOP + '?s=pa&q=planner'], ['Festive', '/#occasions'], ['Onboarding', '/#occasions'],
    ['Awards', '/#occasions'], ['Client', '/#occasions'], ['Eco', SHOP + '?c=Home%20%26%20Decor'],
    ['Gourmet', SHOP + '?c=Gourmet%20%26%20Hampers'], ['Events', '/events.html']];

  function ann() {
    var items = ['<b>Free logo branding</b> on every order', 'Minimum order <b>25 units</b>',
      '<b>New Year 2027</b> gifting &middot; ring in 2027 in <b class="gg-days"></b> days', 'Delivered <b>across India</b>',
      'Branded in our <b>own workshop</b>'];
    var html = items.map(function (t) { return '<span><i></i>' + t + '</span>'; }).join('');
    return '<div class="ann" role="region" aria-label="Announcements"><div class="ann-track">' + html + html + '</div></div>';
  }

  function header() {
    return '<header class="hd"><div class="wrap"><div class="hd-top">' +
      '<a class="hd-logo" href="/" aria-label="Gifting Needs, home"><img src="/uploads/gifting_needs_logo_light.png" alt="Gifting Needs" width="200" height="40"></a>' +
      '<form class="hd-search" role="search" action="' + SHOP + '" method="get">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>' +
        '<input type="search" name="q" placeholder="Search hampers, bottles, brands…" aria-label="Search products"></form>' +
      '<nav class="hd-links" aria-label="Main"><a href="/#process">How it works</a><a href="/#collection">Collection</a>' +
        '<a href="/events.html">Events</a><a href="/about.html">About</a><a href="/contact.html">Contact</a>' +
        '<a class="btn btn-amber" href="/#enquire">Request a quote &rarr;</a></nav>' +
      '<button class="hd-burger" aria-label="Menu" aria-expanded="false"><i></i><i></i><i></i></button></div>' +
      '<nav class="cats" aria-label="Categories">' + CATS.map(function (c, i) {
        return '<a href="' + c[1] + '">' + c[0] + '</a>'; }).join('') +
        '<a class="now" href="' + SHOP + '">&#127878; New Year 2027</a></nav>' +
      '<div class="sheet" id="gg-sheet"><a href="/#process">How it works</a><a href="/#collection">Collection</a>' +
        '<a href="' + SHOP + '">Storefront</a><a href="/events.html">Events</a><a href="/about.html">About</a><a href="/contact.html">Contact</a>' +
        '<a class="btn btn-amber" style="margin-top:12px;justify-content:center" href="/#enquire">Request a quote &rarr;</a></div>' +
      '</div></header>';
  }

  function footer() {
    return '<footer class="ft"><div class="wrap"><div class="ft-g"><div>' +
      '<img src="/uploads/gifting_needs_logo_light.png" alt="Gifting Needs" width="220" height="44">' +
      '<p>Premium corporate gifting and live events, branded in our own workshop and delivered across India.</p>' +
      '<p>Bengaluru &middot; GSTIN 29AAWFG9249H1ZH</p></div>' +
      '<div><h4>Explore</h4><a href="/#occasions">Occasions</a><a href="/#collection">Collection</a><a href="/#branding">Branding</a><a href="/#process">How it works</a></div>' +
      '<div><h4>Shop</h4><a href="' + SHOP + '">Storefront</a><a href="https://giftingneeds.org/catalogues">Catalogues</a><a href="https://giftingneeds.org/posters">Posters</a><a href="/products.html">Products</a></div>' +
      '<div><h4>Talk to us</h4><a href="tel:+916361054099">+91 63610 54099</a><a href="mailto:sales@giftingneeds.in">sales@giftingneeds.in</a>' +
      '<a href="https://wa.me/916361054099?text=Hi%20Gifting%20Needs%2C%20I%27d%20like%20a%20quote." target="_blank" rel="noopener">WhatsApp us</a><a href="/about.html">About</a><a href="/contact.html">Contact</a></div></div>' +
      '<div class="ft-b"><span>&copy; 2026 Gifting Needs &middot; Bengaluru</span><span>Free logo branding &middot; MOQ from 25 units &middot; Pan-India delivery</span></div></div></footer>';
  }

  function mount(id, html) { var el = document.getElementById(id); if (el) el.outerHTML = html; }
  mount('gg-ann', ann()); mount('gg-header', header()); mount('gg-footer', footer());

  var burger = $('.hd-burger'), sheet = $('#gg-sheet');
  if (burger) burger.onclick = function () { var o = sheet.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };

  // countdown: every .gg-days, plus any [data-cd] block
  function tick() {
    var ms = TARGET - Date.now(), p = parts(ms);
    $$('.gg-days').forEach(function (e) { e.textContent = p.d; });
    $$('[data-cd]').forEach(function (box) {
      if (ms <= 0) { box.innerHTML = '<p class="cd-done">Happy New Year 2027! ✨</p>'; return; }
      box.innerHTML = [['d', 'Days'], ['h', 'Hours'], ['m', 'Minutes'], ['s', 'Seconds']].map(function (u) {
        return '<div><b>' + (u[0] === 'd' ? p.d : pad(p[u[0]])) + '</b><span>' + u[1] + '</span></div>'; }).join('');
    });
  }
  tick(); setInterval(tick, 1000);

  // duplicate the gallery strip so it loops without a jump
  $$('.gal-track').forEach(function (t) { t.innerHTML += t.innerHTML; });

  // reveal on scroll
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    $$('[data-r]').forEach(function (e) { io.observe(e); });
  } else { $$('[data-r]').forEach(function (e) { e.classList.add('in'); }); }
})();
