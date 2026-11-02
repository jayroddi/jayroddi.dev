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

  const dock = document.createElement('nav');
  dock.className = 'social-dock';
  dock.setAttribute('aria-label', 'social');
  dock.innerHTML = '<a href="https://x.com/jayroddi" aria-label="x" target="_blank" rel="noopener noreferrer"><svg class="ic" style="--s:17.4;--k:var(--kx)" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="-0.05 0 17.4 17.4" ><path d="M10.4 7.4 16.9 0h-1.5L9.7 6.4 5.2 0H0l6.8 9.7L0 17.4h1.5l5.9-6.8 4.7 6.8h5.2l-6.9-10ZM8.3 9.8l-.7-1-5.5-7.6h2.4l4.4 6.2.7 1 5.7 8h-2.4L8.3 9.8Z"/></svg></a>\n    <a href="https://github.com/jayroddi" aria-label="github" target="_blank" rel="noopener noreferrer"><svg class="ic" style="--s:16.6" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="6.8 3.76 16.6 16.6" > <g> <path d="M15,4c-4.5,0-8.2,3.7-8.2,8.2c0,3.6,2.4,6.7,5.6,7.8c0.4,0.1,0.6-0.2,0.6-0.4c0-0.2,0-0.8,0-1.5 c-2.3,0.5-2.8-1-2.8-1c-0.4-0.9-0.9-1.2-0.9-1.2c-0.7-0.5,0.1-0.5,0.1-0.5c0.8,0.1,1.3,0.8,1.3,0.8c0.7,1.3,1.9,0.9,2.4,0.7 c0.1-0.5,0.3-0.9,0.5-1.1c-1.8-0.2-3.7-0.9-3.7-4.1c0-0.9,0.3-1.6,0.8-2.2c-0.1-0.2-0.4-1,0.1-2.2c0,0,0.7-0.2,2.3,0.8 C13.6,8.1,14.3,8,15,8c0.7,0,1.4,0.1,2.1,0.3c1.6-1.1,2.3-0.8,2.3-0.8c0.4,1.1,0.2,2,0.1,2.2c0.5,0.6,0.8,1.3,0.8,2.2 c0,3.2-1.9,3.8-3.7,4c0.3,0.3,0.6,0.8,0.6,1.5c0,1.1,0,2,0,2.3c0,0.2,0.1,0.5,0.6,0.4c3.3-1.1,5.6-4.2,5.6-7.8 C23.2,7.7,19.5,4,15,4z"/> <path d="M9.9,15.8c0,0-0.1,0.1-0.1,0c-0.1,0-0.1-0.1-0.1-0.1c0,0,0.1-0.1,0.1,0C9.9,15.7,9.9,15.7,9.9,15.8L9.9,15.8z M9.8,15.7"/> <path d="M10.2,16.1c0,0-0.1,0-0.2,0C10,16.1,10,16,10,15.9c0,0,0.1,0,0.2,0C10.3,16,10.3,16.1,10.2,16.1L10.2,16.1z M10.2,16.1"/> <path d="M10.6,16.6c-0.1,0-0.1,0-0.2-0.1c-0.1-0.1-0.1-0.2,0-0.2c0.1,0,0.1,0,0.2,0.1C10.6,16.5,10.6,16.6,10.6,16.6 L10.6,16.6z M10.6,16.6"/> <path d="M11,17.1c0,0-0.1,0-0.2,0c-0.1-0.1-0.1-0.2,0-0.2c0,0,0.1,0,0.2,0C11,16.9,11.1,17,11,17.1L11,17.1z M11,17.1" /> <path d="M11.6,17.3c0,0.1-0.1,0.1-0.2,0.1c-0.1,0-0.2-0.1-0.1-0.2c0-0.1,0.1-0.1,0.2-0.1 C11.6,17.2,11.6,17.3,11.6,17.3L11.6,17.3z M11.6,17.3"/> <path d="M12.3,17.4c0,0.1-0.1,0.1-0.2,0.1c-0.1,0-0.2-0.1-0.2-0.1c0-0.1,0.1-0.1,0.2-0.1 C12.2,17.3,12.3,17.3,12.3,17.4L12.3,17.4z M12.3,17.4"/> <path d="M12.9,17.3c0,0.1-0.1,0.1-0.2,0.2c-0.1,0-0.2,0-0.2-0.1c0-0.1,0.1-0.1,0.2-0.2C12.8,17.2,12.9,17.2,12.9,17.3 L12.9,17.3z M12.9,17.3"/> </g> </svg></a>\n    <a href="https://www.instagram.com/jayroddi" aria-label="instagram" target="_blank" rel="noopener noreferrer"><svg class="ic" style="--s:15.9" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="6.95 4 15.9 15.9" > <g> <path d="M15,5.4c2.1,0,2.4,0,3.2,0c0.8,0,1.2,0.2,1.5,0.3c0.4,0.1,0.6,0.3,0.9,0.6c0.3,0.3,0.5,0.5,0.6,0.9 c0.1,0.3,0.2,0.7,0.3,1.5c0,0.8,0,1.1,0,3.2s0,2.4,0,3.2c0,0.8-0.2,1.2-0.3,1.5c-0.1,0.4-0.3,0.6-0.6,0.9c-0.3,0.3-0.5,0.5-0.9,0.6 c-0.3,0.1-0.7,0.2-1.5,0.3c-0.8,0-1.1,0-3.2,0s-2.4,0-3.2,0c-0.8,0-1.2-0.2-1.5-0.3c-0.4-0.1-0.6-0.3-0.9-0.6 c-0.3-0.3-0.5-0.5-0.6-0.9c-0.1-0.3-0.2-0.7-0.3-1.5c0-0.8,0-1.1,0-3.2s0-2.4,0-3.2c0-0.8,0.2-1.2,0.3-1.5c0.1-0.4,0.3-0.6,0.6-0.9 c0.3-0.3,0.5-0.5,0.9-0.6c0.3-0.1,0.7-0.2,1.5-0.3C12.6,5.4,12.9,5.4,15,5.4 M15,4c-2.2,0-2.4,0-3.3,0c-0.9,0-1.4,0.2-1.9,0.4 c-0.5,0.2-1,0.5-1.4,0.9C7.9,5.8,7.6,6.2,7.4,6.8C7.2,7.3,7.1,7.9,7,8.7C7,9.6,7,9.8,7,12s0,2.4,0,3.3c0,0.9,0.2,1.4,0.4,1.9 c0.2,0.5,0.5,1,0.9,1.4c0.4,0.4,0.9,0.7,1.4,0.9c0.5,0.2,1.1,0.3,1.9,0.4c0.9,0,1.1,0,3.3,0s2.4,0,3.3,0c0.9,0,1.4-0.2,1.9-0.4 c0.5-0.2,1-0.5,1.4-0.9c0.4-0.4,0.7-0.9,0.9-1.4c0.2-0.5,0.3-1.1,0.4-1.9c0-0.9,0-1.1,0-3.3s0-2.4,0-3.3c0-0.9-0.2-1.4-0.4-1.9 c-0.2-0.5-0.5-1-0.9-1.4c-0.4-0.4-0.9-0.7-1.4-0.9c-0.5-0.2-1.1-0.3-1.9-0.4C17.4,4,17.2,4,15,4L15,4L15,4z"/> <path d="M15,7.9c-2.3,0-4.1,1.8-4.1,4.1s1.8,4.1,4.1,4.1s4.1-1.8,4.1-4.1S17.3,7.9,15,7.9L15,7.9z M15,14.7c-1.5,0-2.7-1.2-2.7-2.7 c0-1.5,1.2-2.7,2.7-2.7s2.7,1.2,2.7,2.7C17.7,13.5,16.5,14.7,15,14.7L15,14.7z"/> <path d="M20.2,7.7c0,0.5-0.4,1-1,1s-1-0.4-1-1s0.4-1,1-1S20.2,7.2,20.2,7.7L20.2,7.7z"/> </g> </svg></a>\n    <a href="https://www.threads.com/@jayroddi" aria-label="threads" target="_blank" rel="noopener noreferrer"><svg class="ic" style="--s:17.14" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="6.43 3.4 17.14 17.14" > <path d="M19.1722 11.3454C19.0971 11.31 19.0208 11.2759 18.9435 11.2433C18.8089 8.80519 17.454 7.40937 15.1789 7.39508C15.1686 7.39502 15.1583 7.39502 15.148 7.39502C13.7872 7.39502 12.6554 7.96615 11.9588 9.00541L13.2101 9.84935C13.7305 9.07306 14.5472 8.90756 15.1486 8.90756C15.1556 8.90756 15.1625 8.90757 15.1694 8.90763C15.9185 8.91232 16.4838 9.12648 16.8497 9.5441C17.1159 9.84815 17.294 10.2683 17.3822 10.7985C16.718 10.6876 15.9997 10.6534 15.2318 10.6967C13.0688 10.8192 11.6782 12.0596 11.7716 13.7832C11.819 14.6575 12.2619 15.4096 13.0188 15.901C13.6588 16.3163 14.483 16.5195 15.3396 16.4735C16.4709 16.4125 17.3584 15.9881 17.9775 15.2121C18.4477 14.6229 18.7451 13.8592 18.8764 12.897C19.4155 13.2169 19.8151 13.6379 20.0357 14.1439C20.411 15.0042 20.4329 16.4178 19.2597 17.5703C18.2319 18.58 16.9963 19.0168 15.1291 19.0303C13.0578 19.0152 11.4913 18.362 10.4729 17.089C9.51916 15.897 9.02627 14.1752 9.00788 11.9714C9.02627 9.76765 9.51916 8.04585 10.4729 6.85381C11.4913 5.58079 13.0578 4.92767 15.1291 4.91254C17.2153 4.92779 18.8091 5.58405 19.8666 6.86321C20.3851 7.49049 20.776 8.27935 21.0337 9.19913L22.5 8.81448C22.1876 7.68233 21.6961 6.70675 21.0272 5.89767C19.6715 4.25773 17.6888 3.41742 15.1342 3.39999H15.1239C12.5745 3.41736 10.614 4.26087 9.29693 5.90707C8.12493 7.37199 7.52038 9.41032 7.50006 11.9654L7.5 11.9714L7.50006 11.9774C7.52038 14.5325 8.12493 16.5709 9.29693 18.0358C10.614 19.682 12.5745 20.5255 15.1239 20.5429H15.1342C17.4008 20.5274 18.9984 19.9439 20.3146 18.651C22.0366 16.9595 21.9848 14.8392 21.4172 13.5376C21.01 12.6042 20.2337 11.8461 19.1722 11.3454ZM15.2587 14.9631C14.3106 15.0156 13.3257 14.5972 13.2772 13.7011C13.2412 13.0366 13.7581 12.2952 15.3168 12.2069C15.4954 12.1967 15.6705 12.1918 15.8426 12.1918C16.4088 12.1918 16.9385 12.2459 17.42 12.3494C17.2404 14.5549 16.1869 14.913 15.2587 14.9631Z" /> </svg></a>\n    <a href="https://open.spotify.com/user/1238911903" aria-label="spotify" target="_blank" rel="noopener noreferrer"><svg class="ic" style="--s:16.6" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="6.4 3.6 16.6 16.6" > <path d="M14.7,3.6c-4.6,0-8.3,3.7-8.3,8.3c0,4.6,3.7,8.3,8.3,8.3c4.6,0,8.3-3.7,8.3-8.3C23,7.3,19.3,3.6,14.7,3.6 C14.7,3.6,14.7,3.6,14.7,3.6z M18.5,15.6c-0.1,0.2-0.5,0.3-0.7,0.2c-2-1.2-4.4-1.5-7.3-0.8c-0.3,0.1-0.6-0.1-0.6-0.4 C9.8,14.3,10,14,10.3,14c3.2-0.7,5.9-0.4,8.1,0.9C18.6,15,18.7,15.4,18.5,15.6z M19.6,13.3c-0.2,0.3-0.6,0.4-0.9,0.2 c-2.2-1.4-5.6-1.8-8.3-1c-0.3,0.1-0.7-0.1-0.8-0.4c-0.1-0.3,0.1-0.7,0.4-0.8c3-0.9,6.8-0.5,9.3,1.1C19.6,12.6,19.7,13,19.6,13.3 L19.6,13.3z M19.6,11C17,9.4,12.5,9.2,10,10c-0.4,0.1-0.8-0.1-1-0.5c-0.1-0.4,0.1-0.8,0.5-1c2.9-0.9,7.8-0.7,10.9,1.1 c0.4,0.2,0.5,0.7,0.3,1.1C20.5,11.1,20,11.2,19.6,11L19.6,11z"/> </svg></a>\n    <a href="https://www.linkedin.com/in/jayroddi" aria-label="linkedin" target="_blank" rel="noopener noreferrer"><svg class="ic" style="--s:16" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="7 3 16 16" > <path d="M19.6,19v-5.8c0-1.4-0.5-2.4-1.7-2.4c-1,0-1.5,0.7-1.8,1.3C16,12.3,16,12.6,16,13v6h-3.4 c0,0,0.1-9.8,0-10.8H16v1.5c0,0,0,0,0,0h0v0C16.4,9,17.2,7.9,19,7.9c2.3,0,4,1.5,4,4.9V19H19.6z M8.9,6.7L8.9,6.7 C7.7,6.7,7,5.9,7,4.9C7,3.8,7.8,3,8.9,3s1.9,0.8,1.9,1.9C10.9,5.9,10.1,6.7,8.9,6.7z M10.6,19H7.2V8.2h3.4V19z"/> </svg></a>\n    <a href="mailto:hi@jayroddi.lol" aria-label="email"><svg class="ic" style="--s:17" aria-hidden="true" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0.5 17 17"><path d="M1.5 3h14c.6 0 1 .3 1.2.8L8.5 9.6.3 3.8C.5 3.3.9 3 1.5 3Z"/><path d="M0 5.6v8c0 .8.7 1.4 1.5 1.4h14c.8 0 1.5-.6 1.5-1.4v-8l-8.5 6-8.5-6Z"/></svg></a>';
  document.body.append(dock);

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

  let chosen = [];
  const gridsReady = () => {
    const grids = document.querySelectorAll('.tracker');
    if (!grids.length) return true;
    return document.documentElement.classList.contains('year-done');
  };
  const pushBox = (list, el, pad) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    list.push({ left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad });
  };
  function placeBlinkers() {
    cells.forEach((bit) => {
      bit.classList.remove('blink', 'soft');
      bit.style.animationDelay = '';
      const lv = bit.dataset.lv;
      bit.className = lv && lv !== '0' ? 'lv' + lv : '';
    });
    const blocked = [];
    pushBox(blocked, nav, 8);
    if (getComputedStyle(dock).display !== 'none') pushBox(blocked, dock, 8);
    document.querySelectorAll([
      '.hands', '.hero-title', '.hero-sub', '.heart',
      '.subhead', '.kicker', '.stat', '.legend', '.months', '.dow',
      '.quotes .d', '.quotes .q', '.quotes .by',
      '.month h2', '.socials a', '.socials p'
    ].join(',')).forEach((el) => pushBox(blocked, el, 6));
    document.querySelectorAll('.graph, .shot, .covers li').forEach((el) => pushBox(blocked, el, 2));
    const spans = [];
    document.querySelectorAll('main .copy, .gallery, .soft').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 2) spans.push({ left: r.left, right: r.right });
    });
    const inColumn = (rect) => {
      const x = (rect.left + rect.right) / 2;
      return spans.some((span) => x >= span.left && x <= span.right);
    };
    const inside = [];
    const outside = [];
    cells.forEach((bit) => {
      const rect = bit.getBoundingClientRect();
      if (rect.width < 2 || rect.bottom < 0 || rect.top > innerHeight || hits(rect, blocked)) return;
      (inColumn(rect) ? inside : outside).push(bit);
    });
    const pick = (list, count) => {
      const out = [];
      const n = Math.min(count, list.length);
      if (!n) return out;
      const step = Math.max(1, Math.floor(list.length / n));
      for (let i = 0; i < n; i++) out.push(list[Math.min(list.length - 1, i * step + Math.floor(step / 3))]);
      return out;
    };
    const mobile = innerWidth < 760 || !outside.length;
    chosen = mobile
      ? pick(inside.length ? inside : outside, 6).map((bit) => ({ bit, soft: true }))
      : (() => {
          const gutter = pick(outside, 4);
          const content = pick(inside, gutter.length || 4);
          const n = Math.min(gutter.length, content.length);
          const g = n ? pick(outside, n) : gutter;
          const c = n ? pick(inside, n) : content;
          return g.map((bit) => ({ bit, soft: false })).concat(c.map((bit) => ({ bit, soft: true })));
        })();
    if (!gridsReady()) return;
    chosen.forEach((item, n) => {
      item.bit.classList.add('blink');
      if (item.soft) item.bit.classList.add('soft');
      if (!reduce) item.bit.style.animationDelay = (n * 0.18) + 's';
    });
  }
  addEventListener('year-done', () => placeBlinkers());

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
