/* live shell. pill nav, square field, today's quote on the homepage. no audio. */
(() => {
  const pages = [
    ['/', 'home'],
    ['/grind/', 'grind'],
    ['/snaps/', 'snaps'],
    ['/music/', 'music'],
    ['/books/', 'books'],
    ['/quotes/', 'quotes'],
    ['/social/', 'social']
  ];
  const here = (() => {
    let path = location.pathname.replace(/\/index\.html$/, '');
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (!path) path = '/';
    return path === '/' ? '/' : path + '/';
  })();

  const nav = document.createElement('div');
  nav.className = 'nav-stack';
  const bar = document.createElement('nav');
  bar.className = 'tabs';
  bar.setAttribute('aria-label', 'pages');
  pages.forEach(([href, label]) => {
    const link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (href === here) link.setAttribute('aria-current', 'page');
    bar.append(link);
  });
  nav.append(bar);
  document.body.prepend(nav);

  const bg = document.createElement('div');
  bg.className = 'habit-bg';
  bg.setAttribute('aria-hidden', 'true');
  document.body.prepend(bg);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cells = [];
  let seed = 19;
  const roll = () => {
    seed = (seed * 16807 + 13) % 2147483647;
    return seed / 2147483647;
  };
  const hits = (rect, boxes) => boxes.some((box) => rect.right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom);

  function placeBlinkers() {
    cells.forEach((bit) => {
      bit.classList.remove('blink');
      bit.style.animationDelay = '';
      const lv = bit.dataset.lv;
      bit.className = lv && lv !== '0' ? 'lv' + lv : '';
    });
    const home = document.body.classList.contains('is-welcome');
    const blocked = [];
    const box = nav.getBoundingClientRect();
    blocked.push({ left: box.left - 8, right: box.right + 8, top: box.top - 8, bottom: box.bottom + 10 });
    if (home) {
      document.querySelectorAll('.hero-copy, .soft').forEach((el) => {
        const r = el.getBoundingClientRect();
        blocked.push({ left: r.left - 16, right: r.right + 16, top: r.top - 10, bottom: r.bottom + 10 });
      });
    } else {
      document.querySelectorAll('main .copy, .gallery').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 2) blocked.push({ left: r.left - 12, right: r.right + 12, top: 0, bottom: innerHeight });
      });
    }
    const open = cells.filter((bit) => {
      const rect = bit.getBoundingClientRect();
      return rect.width >= 2 && !hits(rect, blocked);
    });
    const want = Math.min(6, open.length);
    const step = Math.max(1, Math.floor(open.length / want));
    for (let n = 0; n < want; n++) {
      const bit = open[Math.min(open.length - 1, n * step + Math.floor(step / 3))];
      bit.classList.add('blink');
      if (!reduce) bit.style.animationDelay = (n * 0.18) + 's';
    }
  }

  function buildBg() {
    const cell = innerWidth < 760 ? 26 : 48;
    const gap = innerWidth < 760 ? 5 : 7;
    const cols = Math.max(8, Math.floor((innerWidth + gap) / (cell + gap)));
    const rows = Math.max(8, Math.floor((innerHeight + gap) / (cell + gap)));
    bg.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
    bg.style.gridAutoRows = `${cell}px`;
    bg.style.gap = gap + 'px';
    bg.replaceChildren();
    seed = 19;
    const frag = document.createDocumentFragment();
    cells = [];
    for (let row = 0; row < rows; row++) {
      const mid = 1 - Math.abs((row + 0.5) / rows - 0.5) * 2;
      for (let col = 0; col < cols; col++) {
        const bit = document.createElement('i');
        const heat = roll() * (0.28 + mid * 0.95);
        const lv = heat > 0.78 ? 4 : heat > 0.56 ? 3 : heat > 0.36 ? 2 : heat > 0.18 ? 1 : 0;
        if (lv) bit.className = 'lv' + lv;
        bit.dataset.lv = String(lv);
        frag.append(bit);
        cells.push(bit);
      }
    }
    bg.append(frag);
    placeBlinkers();
  }
  buildBg();
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildBg, 120);
  });

  const todayHost = document.getElementById('today-quote');
  if (!todayHost) return;
  const chicago = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const dots = (day) => day.replace(/-/g, '.');
  fetch('/quote-of-the-day/quotes.json', { cache: 'no-cache' }).then((res) => res.json()).then((rows) => {
    if (!Array.isArray(rows)) return;
    const day = chicago();
    const list = rows.filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.date <= day && (entry.text || entry.quote) && entry.author)
      .map((entry) => ({
        date: entry.date,
        text: String(entry.text || entry.quote).trim(),
        author: String(entry.author).replace(/^\s*[-–—]\s*/, '').trim()
      }))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    const today = list.find((entry) => entry.date === day) || list[0];
    if (!today) return;
    const li = document.createElement('li');
    const date = document.createElement('p');
    date.className = 'd';
    const time = document.createElement('time');
    time.dateTime = today.date;
    time.textContent = dots(today.date);
    date.append(time);
    const words = document.createElement('blockquote');
    words.className = 'q';
    words.textContent = today.text;
    const by = document.createElement('p');
    by.className = 'by';
    by.textContent = today.author;
    li.append(date, words, by);
    todayHost.replaceChildren(li);
    placeBlinkers();
  }).catch(() => {});
})();
