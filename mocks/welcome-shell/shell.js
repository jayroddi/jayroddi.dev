/* welcome shell. mock only. no audio. habit squares replace the matrix rain. */
(() => {
  const tabs = [...document.querySelectorAll('.tabs button')];
  const panels = [...document.querySelectorAll('.panel')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(name) {
    const welcome = !name || name === 'welcome';
    panels.forEach((panel) => {
      const on = welcome ? panel.dataset.page === 'welcome' : panel.dataset.page === name;
      panel.hidden = !on;
    });
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.body.classList.toggle('is-welcome', welcome);
    if (welcome) scrollTo(0, 0);
    else if (location.hash === '#' + name) {
      /* stay */
    }
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
      if (location.hash !== '#welcome' && location.hash !== '') location.hash = 'welcome';
      else show('welcome');
    });
  });
  function fromHash() {
    const name = (location.hash || '').replace('#', '');
    if (tabs.some((tab) => tab.dataset.tab === name)) show(name);
    else show('welcome');
  }
  addEventListener('hashchange', fromHash);

  const bg = document.querySelector('.habit-bg');
  let cells = [];
  let gutterCells = [];

  function buildBg() {
    if (!bg) return;
    const cell = innerWidth < 760 ? 9 : 13;
    const gap = innerWidth < 760 ? 3 : 4;
    const cols = Math.max(8, Math.floor((innerWidth + gap) / (cell + gap)));
    const rows = Math.max(8, Math.floor((innerHeight + gap) / (cell + gap)));
    bg.style.gridTemplateColumns = `repeat(${cols}, ${cell}px)`;
    bg.style.gridAutoRows = `${cell}px`;
    bg.style.gap = gap + 'px';
    bg.replaceChildren();
    const gutter = parseFloat(getComputedStyle(document.body).getPropertyValue('--left')) || 24;
    const side = Math.max(1, Math.floor(gutter / (cell + gap)));
    const frag = document.createDocumentFragment();
    cells = [];
    gutterCells = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const bit = document.createElement('i');
        frag.append(bit);
        cells.push(bit);
        const edge = col < side || col >= cols - side;
        const underBar = row < 4;
        if (edge && !underBar) gutterCells.push(bit);
      }
    }
    bg.append(frag);
    placeBlinkers();
  }

  function placeBlinkers() {
    gutterCells.forEach((bit) => { bit.className = ''; bit.style.animationDelay = ''; });
    if (!gutterCells.length) return;
    const want = Math.min(6, gutterCells.length);
    const step = Math.max(1, Math.floor(gutterCells.length / want));
    for (let n = 0; n < want; n++) {
      const bit = gutterCells[Math.min(gutterCells.length - 1, n * step + Math.floor(step / 3))];
      bit.className = 'blink';
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
})();
