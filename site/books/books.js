/* books.js v0.8: cover grid grouped by read year, newest year first, newest read first inside a year.
   glow "gold" or "teal" adds glow-gold / glow-teal on the cover (see books.css).
   a read of YYYY-MM (no day) sorts after every full date in that month. a read of YYYY-YYYY (no day)
   is one year-group, placed by its end year, so 2015-2020 stays a single heading.
   a book with no read date lands in a final "no date" group.
   tap still shows the title and opens open library. */
(() => {
  const root = document.querySelector('.years');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tile = t => {
    const ti = t.title.replace(/\s*\(.*?\)\s*$/, '').split(':')[0].toLowerCase();
    const au = t.author.replace(/\s+/g, ' ').toLowerCase();
    const glow = t.glow === 'gold' || t.glow === 'teal' ? ` class="glow-${t.glow}"` : '';
    return `<li${glow}><a${glow} href="${esc(t.url)}" target="_blank" rel="noopener" aria-label="${esc(t.title)} by ${esc(t.author)}">${t.cover ? `<img src="${esc(t.cover)}" alt="" loading="lazy" decoding="async" width="200" height="300">` : `<span class="nocover"><b>${esc(ti)}</b>${esc(au)}</span>`}<span class="cap">${esc(ti)} // ${esc(au)}</span></a></li>`;
  };
  const group = (label, items) => `<section class="year"><h2>${esc(label)}</h2><ol class="covers">${items.map(tile).join('')}</ol></section>`;
  const labelOf = read => /^\d{4}-\d{4}$/.test(read || '') ? read : (/^\d{4}/.test(read || '') ? read.slice(0, 4) : '');
  const labelRank = label => { const range = /^(\d{4})-(\d{4})$/.exec(label); return range ? Number(range[2]) + .5 : (/^\d{4}$/.test(label) ? Number(label) : -1); };
  fetch('/books/books.json?v=0.8').then(r => r.json()).then(d => {
    const books = d.books.slice().sort((a, b) => (!a.read - !b.read) || (b.read || '').localeCompare(a.read || '') || (b.added || '').localeCompare(a.added || ''));
    const years = new Map();
    const undated = [];
    books.forEach(t => {
      const year = labelOf(t.read);
      if (!year) undated.push(t);
      else {
        if (!years.has(year)) years.set(year, []);
        years.get(year).push(t);
      }
    });
    const labels = [...years.keys()].sort((a, b) => labelRank(b) - labelRank(a) || b.localeCompare(a));
    root.innerHTML = labels.map(year => group(year, years.get(year))).join('') + (undated.length ? group('no date', undated) : '');
    let lp;   // long-press shows the caption (touch)
    root.addEventListener('touchstart', e => { const a = e.target.closest('a'); if (!a) return; lp = setTimeout(() => { root.querySelectorAll('a.show').forEach(x => x.classList.remove('show')); a.classList.add('show'); a.dataset.lp = 1; }, 420); }, {passive: true});
    ['touchend', 'touchmove', 'touchcancel'].forEach(t => root.addEventListener(t, () => clearTimeout(lp), {passive: true}));
    root.addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.dataset.lp) { e.preventDefault(); delete a.dataset.lp; } });
    root.addEventListener('contextmenu', e => { if (e.target.closest('a')) e.preventDefault(); });
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
