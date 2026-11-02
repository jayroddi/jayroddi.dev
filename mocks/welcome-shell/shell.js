/* welcome shell. mock only. no audio. habit squares replace the matrix rain. */
(() => {
  const tabs = [...document.querySelectorAll('.tabs button')];
  const panels = [...document.querySelectorAll('.panel')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(name) {
    const home = !name || name === 'home' || name === 'welcome';
    const page = home ? 'home' : name;
    panels.forEach((panel) => {
      panel.hidden = panel.dataset.page !== page;
    });
    tabs.forEach((tab) => {
      tab.setAttribute('aria-selected', tab.dataset.tab === page ? 'true' : 'false');
    });
    document.body.classList.toggle('is-welcome', home);
    scrollTo(0, 0);
    placeBlinkers();
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      if (location.hash !== '#' + name) location.hash = name;
      else show(name);
    });
  });
  document.querySelectorAll('a.brand').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      if (location.hash !== '#home' && location.hash !== '') location.hash = 'home';
      else show('home');
    });
  });
  function fromHash() {
    const name = (location.hash || '').replace('#', '');
    if (tabs.some((tab) => tab.dataset.tab === name)) show(name);
    else show('home');
  }
  addEventListener('hashchange', fromHash);

  const bg = document.querySelector('.habit-bg');
  let cells = [];
  let gutterCells = [];

  let seed = 19;
  function roll() {
    seed = (seed * 16807 + 13) % 2147483647;
    return seed / 2147483647;
  }
  function buildBg() {
    if (!bg) return;
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

  function hits(rect, boxes) {
    return boxes.some((box) => rect.right > box.left && rect.left < box.right && rect.bottom > box.top && rect.top < box.bottom);
  }
  function placeBlinkers() {
    cells.forEach((bit) => {
      bit.classList.remove('blink');
      bit.style.animationDelay = '';
      const lv = bit.dataset.lv;
      bit.className = lv && lv !== '0' ? 'lv' + lv : '';
    });
    const home = document.body.classList.contains('is-welcome');
    const blocked = [];
    const nav = document.querySelector('.nav-stack');
    if (nav) {
      const box = nav.getBoundingClientRect();
      blocked.push({ left: box.left - 8, right: box.right + 8, top: box.top - 8, bottom: box.bottom + 10 });
    }
    const column = document.querySelector('.panel:not([hidden]) .copy');
    const columnBox = column ? column.getBoundingClientRect() : null;
    if (home) {
      document.querySelectorAll('.hero-copy, .soft').forEach((el) => {
        const box = el.getBoundingClientRect();
        blocked.push({ left: box.left - 16, right: box.right + 16, top: box.top - 10, bottom: box.bottom + 10 });
      });
    } else if (columnBox) {
      blocked.push({ left: columnBox.left - 12, right: columnBox.right + 12, top: 0, bottom: innerHeight });
      document.querySelectorAll('.panel:not([hidden]) .gallery').forEach((el) => {
        const box = el.getBoundingClientRect();
        if (box.width > 2) blocked.push({ left: box.left - 8, right: box.right + 8, top: 0, bottom: innerHeight });
      });
    }
    const open = cells.filter((bit) => {
      const rect = bit.getBoundingClientRect();
      if (rect.width < 2 || hits(rect, blocked)) return false;
      return true;
    });
    const want = Math.min(6, open.length);
    const step = Math.max(1, Math.floor(open.length / want));
    for (let n = 0; n < want; n++) {
      const bit = open[Math.min(open.length - 1, n * step + Math.floor(step / 3))];
      bit.classList.add('blink');
      if (!reduce) bit.style.animationDelay = (n * 0.18) + 's';
    }
  }

  buildBg();
  fromHash();
  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildBg, 120);
  });

  const chicago = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const dots = (day) => day.replace(/-/g, '.');

  function quoteItem(entry) {
    const li = document.createElement('li');
    const date = document.createElement('p');
    date.className = 'd';
    const time = document.createElement('time');
    time.dateTime = entry.date;
    time.textContent = dots(entry.date);
    date.append(time);
    const words = document.createElement('blockquote');
    words.className = 'q';
    words.textContent = entry.text;
    const by = document.createElement('p');
    by.className = 'by';
    by.textContent = entry.author.replace(/^\s*[-–—]\s*/, '');
    li.append(date, words, by);
    return li;
  }

  const quoteUrl = new URL('../../site/quote-of-the-day/quotes.json', location.href).href;
  fetch(quoteUrl, { cache: 'no-cache' }).then((res) => res.json()).then((rows) => {
    if (!Array.isArray(rows)) return;
    const day = chicago();
    const list = rows.filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.date <= day && (entry.text || entry.quote) && entry.author)
      .map((entry) => ({
        date: entry.date,
        text: String(entry.text || entry.quote).trim(),
        author: String(entry.author).trim()
      }))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    const todayHost = document.getElementById('today-quote');
    const listHost = document.getElementById('quote-list');
    const today = list.find((entry) => entry.date === day) || list[0];
    if (today && todayHost) todayHost.append(quoteItem(today));
    if (listHost) list.forEach((entry) => listHost.append(quoteItem(entry)));
  }).catch(() => {});

  const fixSrc = (img) => {
    const raw = img.getAttribute('src');
    if (!raw || img.dataset.local === '1' || !raw.startsWith('/')) return;
    img.dataset.local = '1';
    img.setAttribute('src', new URL('../../site' + raw, location.href).href);
  };
  const watch = new MutationObserver(() => {
    document.querySelectorAll('img').forEach(fixSrc);
  });
  watch.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['src'], childList: true });

  const sound = document.querySelector('.sound');
  if (sound) {
    sound.addEventListener('click', () => {
      const on = sound.getAttribute('aria-pressed') === 'true';
      sound.setAttribute('aria-pressed', on ? 'false' : 'true');
      sound.textContent = on ? 'sound off' : 'sound on';
    });
  }
})();
