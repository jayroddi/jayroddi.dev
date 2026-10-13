/* v2.44: daily quotes on /quotes. the feed is still /quote-of-the-day/quotes.json
   (newest first; one object per day: date, text, author). the whole list paints at once.
   the quote is left-justified. the name is its own line, with no leading dash.
   a nightly append to that file shows up here. future dates stay hidden until America/Chicago. */
(() => {
  const host = document.querySelector('.copy') || document.querySelector('main');
  if (!host) return;
  const chicago = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const dots = d => d.replace(/-/g, '.');

  function paint(list){
    let ol = host.querySelector('ol.quotes');
    if (!ol){
      ol = document.createElement('ol');
      ol.className = 'quotes';
      host.appendChild(ol);
    }
    ol.setAttribute('aria-label', 'quotes');
    ol.replaceChildren();
    const frag = document.createDocumentFragment();
    list.forEach(e => {
      const li = document.createElement('li');
      const d = document.createElement('p');
      d.className = 'd';
      const time = document.createElement('time');
      time.dateTime = e.date;
      time.textContent = dots(e.date);
      d.appendChild(time);
      const q = document.createElement('blockquote');
      q.className = 'q';
      q.textContent = e.text;
      const by = document.createElement('p');
      by.className = 'by';
      by.textContent = (e.author || '').replace(/^\s*[-–—]\s*/, '');
      li.append(d, q, by);
      frag.appendChild(li);
    });
    ol.appendChild(frag);
  }

  fetch('/quote-of-the-day/quotes.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject()).then(rows => {
    if (!Array.isArray(rows)) return;
    const day = chicago();
    const list = rows.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (typeof e.text === 'string' && e.text.trim() || typeof e.quote === 'string' && e.quote.trim()) && e.author && e.date <= day)
      .map(e => ({date: e.date, text: (e.text || e.quote).trim(), author: String(e.author).trim()}))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    if (!list.length) return;
    paint(list);
  }).catch(() => {});

  const canvas = document.getElementById('rain');
  if (canvas && window.JayRain){
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
