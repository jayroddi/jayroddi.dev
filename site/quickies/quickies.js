/* quickies: short thoughts on /quickies. the file is /quickies/quickies.json
   (newest first; {ts, text}). ts is an ISO timestamp. the line under the words is
   America/Chicago, like 2026.10.23 // 10:05pm. an empty list is one muted line. */
(() => {
  const host = document.querySelector('.copy') || document.querySelector('main');
  if (!host) return;

  function stamp(ts) {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).formatToParts(d);
    const g = t => (parts.find(p => p.type === t) || {}).value || '';
    const hour = String(Number(g('hour')));
    const minute = g('minute').padStart(2, '0');
    const ap = g('dayPeriod').replace(/\./g, '').replace(/\s+/g, '').toLowerCase();
    if (!g('year') || hour === 'NaN' || !minute || (ap !== 'am' && ap !== 'pm')) return '';
    return g('year') + '.' + g('month') + '.' + g('day') + ' // ' + hour + ':' + minute + ap;
  }

  function paint(list) {
    let ol = host.querySelector('ol.quotes');
    if (!ol) {
      ol = document.createElement('ol');
      ol.className = 'quotes';
      host.appendChild(ol);
    }
    ol.setAttribute('aria-label', 'quickies');
    ol.replaceChildren();
    const frag = document.createDocumentFragment();
    if (!list.length) {
      const li = document.createElement('li');
      const p = document.createElement('p');
      p.className = 'd';
      p.textContent = 'first one drops tonight';
      li.appendChild(p);
      frag.appendChild(li);
    } else {
      list.forEach(e => {
        const li = document.createElement('li');
        const q = document.createElement('blockquote');
        q.className = 'q';
        q.textContent = e.text;
        const by = document.createElement('p');
        by.className = 'by';
        const time = document.createElement('time');
        time.dateTime = e.ts;
        time.textContent = e.line;
        by.appendChild(time);
        li.append(q, by);
        frag.appendChild(li);
      });
    }
    ol.appendChild(frag);
  }

  fetch('/quickies/quickies.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject()).then(rows => {
    if (!Array.isArray(rows)) return;
    const list = rows.filter(e => e && typeof e.text === 'string' && e.text.trim() && e.ts)
      .map(e => ({ts: String(e.ts), text: e.text.trim(), line: stamp(e.ts), t: Date.parse(e.ts)}))
      .filter(e => e.line && !Number.isNaN(e.t))
      .sort((a, b) => b.t - a.t || 0);
    paint(list);
  }).catch(() => {});

  const canvas = document.getElementById('rain');
  if (canvas && window.JayRain) {
    const T = [26, 173, 179], PALE_TEAL = [121, 205, 207], HEAD = [255, 255, 255], PALE_ORANGE = [255, 150, 121];
    const mob = () => document.documentElement.clientWidth < 760;
    const rain = JayRain.Rain(canvas, {
      fs: 16, fsMobile: 13, mono: '"JetBrains Mono", monospace', seed: 5, head: HEAD, headMix: .6,
      tint: T, paleTint: PALE_TEAL, paleOrange: PALE_ORANGE,
      palette: (x, w, r) => r < .84 ? T : PALE_TEAL,
      bands: (w, H) => [{y0: 0, y1: H, perCol: mob() ? 1.6 : 2.1, lenMin: 8, lenMax: 30, alpha: .56, stepMin: 60, stepMax: 170, colDensity: () => 1}],
      alphaAt: (x, y, R) => 1 - .45 * JayRain.smooth(R.H * .55, R.H, y),
      partSel: '.copy, .gallery, .foot', partPad: 50, partFloor: .25
    });
    JayRain.register(rain);
    document.fonts.ready.then(() => {
      rain.build();
      requestAnimationFrame(rain.frame);
    });
  }
})();
