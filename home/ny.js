/* New Year 2027 on the homepage: hero countdown and a floating countdown pill. */
(function () {
  var TARGET = new Date('2027-01-01T00:00:00+05:30').getTime();   // midnight, India time
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  function parts(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  }

  // --- hero countdown, between the intro line and the buttons ---
  var cta = document.querySelector('.hero-cta');
  var holder = document.createElement('div');
  if (cta) cta.parentNode.insertBefore(holder, cta);

  // --- floating pill, dismissible and remembered per browser ---
  var gone = false;
  try { gone = localStorage.getItem('gn-ny-pill') === '1'; } catch (e) {}
  var pill = document.createElement('div');
  pill.className = 'ny-pill';
  pill.hidden = gone;
  pill.innerHTML = '<span>🎆 <b class="ny-left"></b></span><a class="ny-go" href="#enquire" style="text-decoration:none">Get a quote</a>' +
                   '<button type="button" aria-label="Dismiss">×</button>';
  document.body.appendChild(pill);
  pill.querySelector('button').onclick = function () {
    pill.hidden = true;
    try { localStorage.setItem('gn-ny-pill', '1'); } catch (e) {}
  };

  // the hero already shows the countdown, so the pill appears once the hero has scrolled away
  var hero = document.getElementById('hero');
  function place() {
    var past = hero ? hero.getBoundingClientRect().bottom < window.innerHeight * 0.55 : true;
    pill.classList.toggle('on', past);
  }
  window.addEventListener('scroll', place, { passive: true });
  window.addEventListener('resize', place);
  place();

  function render() {
    var ms = TARGET - Date.now(), p = parts(ms), left = pill.querySelector('.ny-left');
    if (ms <= 0) {
      left.textContent = 'Happy New Year 2027!';
      holder.innerHTML = '<p class="ny-done">Happy New Year 2027 ✨</p>';
      return;
    }
    left.textContent = 'Ring in 2027 in ' + p.d + 'd ' + pad(p.h) + 'h ' + pad(p.m) + 'm';
    holder.innerHTML = '<div class="ny-count"><p class="ny-count-t">Ring in 2027 in</p>' +
      '<div class="ny-cards" role="timer" aria-label="Time until New Year 2027">' +
      [['d', 'Days'], ['h', 'Hours'], ['m', 'Minutes'], ['s', 'Seconds']].map(function (u) {
        return '<div class="ny-unit"><b>' + (u[0] === 'd' ? p.d : pad(p[u[0]])) + '</b><span>' + u[1] + '</span></div>';
      }).join('') + '</div></div>';
  }
  render();
  setInterval(render, 1000);
})();
