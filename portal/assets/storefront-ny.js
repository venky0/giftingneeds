/* New Year 2027: countdown ribbon and hero countdown. Loads after storefront-xmas.js. */
(function () {
  var TARGET = new Date('2027-01-01T00:00:00+05:30').getTime();   // midnight, India time
  var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
  function parts(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    return { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
  }

  // --- announcement ribbon (dismissible, remembered per browser) ---
  var dismissed = false;
  try { dismissed = localStorage.getItem('gn-ny-ribbon') === '1'; } catch (e) {}
  var ribbon = document.createElement('div');
  ribbon.className = 'ny-ribbon';
  ribbon.setAttribute('role', 'region');
  ribbon.setAttribute('aria-label', 'New Year 2027 gifting');
  ribbon.innerHTML = '<span>🎆 <b>New Year 2027 gifting</b> · Free logo branding · Pan-India delivery</span>' +
                     '<span class="ny-left"></span><button type="button" aria-label="Dismiss">×</button>';
  ribbon.hidden = dismissed;
  document.body.insertBefore(ribbon, document.body.firstChild);
  ribbon.querySelector('button').onclick = function () {
    ribbon.hidden = true;
    try { localStorage.setItem('gn-ny-ribbon', '1'); } catch (e) {}
  };

  // --- hero countdown cards ---
  var copy = document.querySelector('.festive-copy');
  var holder = document.createElement('div');
  if (copy) {
    var anchor = copy.querySelector('.festive-button');
    copy.insertBefore(holder, anchor);
  }

  function render() {
    var ms = TARGET - Date.now(), p = parts(ms), left = ribbon.querySelector('.ny-left');
    if (ms <= 0) {
      left.textContent = 'Happy New Year 2027!';
      holder.innerHTML = '<p class="ny-done">Happy New Year 2027 ✨</p>';
      return;
    }
    left.textContent = 'Ring in 2027 in ' + p.d + 'd ' + pad(p.h) + 'h ' + pad(p.m) + 'm';
    holder.innerHTML = '<p class="ny-cards-title">Ring in 2027 in</p><div class="ny-cards" role="timer" aria-label="Time until New Year 2027">' +
      [['d', 'Days'], ['h', 'Hours'], ['m', 'Minutes'], ['s', 'Seconds']].map(function (u) {
        return '<div class="ny-unit"><b>' + (u[0] === 'd' ? p.d : pad(p[u[0]])) + '</b><span>' + u[1] + '</span></div>';
      }).join('') + '</div>';
  }
  render();
  setInterval(render, 1000);

  // --- the existing season-picks switch speaks New Year ---
  var mode = document.querySelector('.xs-mode');
  if (mode) {
    [].forEach.call(mode.querySelectorAll('button'), function (b) {
      b.textContent = b.textContent.replace('🎄', '🎆').replace(/Season picks/g, 'New Year picks').replace(/season picks/g, 'New Year picks');
    });
  }
})();
