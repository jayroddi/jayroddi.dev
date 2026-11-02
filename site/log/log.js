/* log.js v4. media log from site/log/media.json.
   the all chip is selected on load and shows every note, newest year first.
   tapping the selected category chip returns to all. tapping all while it is selected stays on all.
   a note with no embedded cover draws the title only. no stand-in image.
   albums are square. everything else is a 2:3 poster. three columns under 900px, six from there.
   a rating, when the note has one, sits quiet on the tile. */
(() => {
  const NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const WORDS = { all: 'all', movies: 'movies', shows: 'shows', books: 'books', albums: 'albums', games: 'games' };
  const COL_BREAK = 900;
  const gallery = document.getElementById('gallery');
  const columnCount = () => (innerWidth >= COL_BREAK ? 6 : 3);

  let data = null;
  let selected = 'all';

  function groupKey(item) {
    const day = String(item.d || '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day.slice(0, 4);
    return day;
  }

  function monthName(key) {
    const labels = (data && data.bucketLabel) || {};
    if (labels[key]) return labels[key];
    const range = /^(\d{4})-(\d{4})$/.exec(key);
    if (range) return range[1] + ' - ' + range[2];
    const [year, month] = String(key || '').split('-');
    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(month)) return (NAMES[(+month || 1) - 1] || month) + ' ' + year;
    return key;
  }

  function ratio(cat) {
    return cat === 'albums' ? '1' : '2 / 3';
  }

  function stars(rating) {
    const chars = [...String(rating)];
    const on = chars.filter((ch) => ch === '★').length;
    const off = chars.filter((ch) => ch === '☆').length;
    if (!on && !off) return null;
    const node = document.createElement('span');
    node.className = 'stars';
    node.setAttribute('aria-hidden', 'true');
    if (on) {
      const filled = document.createElement('span');
      filled.className = 'on';
      filled.textContent = '★'.repeat(on);
      node.append(filled);
    }
    if (off) {
      const empty = document.createElement('span');
      empty.className = 'off';
      empty.textContent = '☆'.repeat(off);
      node.append(empty);
    }
    return { node, label: ', ' + on + ' of ' + (on + off) };
  }

  function labelFor(item) {
    const bits = [item.t || 'untitled'];
    if (item.a) bits.push(item.a);
    const star = item.r ? stars(item.r) : null;
    const name = bits.join(' // ') + (star ? star.label : '');
    return { name, star };
  }

  function tile(item, order, eager) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shot';
    button.dataset.order = String(order);
    button.style.setProperty('--r', ratio(item.c));
    const { name, star } = labelFor(item);
    button.setAttribute('aria-label', name);
    if (item.img) {
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      img.draggable = false;
      img.loading = eager ? 'eager' : 'lazy';
      img.src = '/log/covers/' + item.img;
      button.append(img);
    } else {
      button.classList.add('bare');
      const miss = document.createElement('span');
      miss.className = 'bare-t';
      miss.textContent = item.t || '';
      button.append(miss);
    }
    if (star) button.append(star.node);
    const cap = document.createElement('span');
    cap.className = 'cap';
    cap.textContent = item.a ? item.t + ' // ' + item.a : (item.t || '');
    button.append(cap);
    return button;
  }

  function groups(items) {
    const by = new Map();
    items.forEach((item) => {
      const key = groupKey(item);
      if (!by.has(key)) by.set(key, []);
      by.get(key).push(item);
    });
    const seen = new Set();
    const out = [];
    (data.months || []).forEach((meta) => {
      const rows = by.get(meta.m);
      if (!rows || !rows.length) return;
      seen.add(meta.m);
      out.push([meta.m, rows]);
    });
    [...by.keys()].filter((key) => !seen.has(key)).sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)).forEach((key) => {
      out.push([key, by.get(key)]);
    });
    return out;
  }

  function render() {
    const items = (data.items || []).filter((item) => selected === 'all' || item.c === selected);
    gallery.replaceChildren();
    if (!items.length) {
      const note = document.createElement('p');
      note.className = 'note';
      note.textContent = 'nothing here';
      gallery.append(note);
      return;
    }
    let order = 0;
    groups(items).forEach(([key, rows]) => {
      const section = document.createElement('section');
      section.className = 'month';
      const heading = document.createElement('h2');
      heading.textContent = monthName(key);
      const grid = document.createElement('div');
      grid.className = 'grid';
      rows.forEach((item) => {
        grid.append(tile(item, order, order < columnCount()));
        order += 1;
      });
      section.append(heading, grid);
      gallery.append(section);
    });
  }

  function readHash() {
    const key = location.hash.replace(/^#/, '').toLowerCase();
    if (!key || key === 'all') return 'all';
    return WORDS[key] ? key : 'all';
  }

  function writeHash(key) {
    const url = location.pathname + location.search + (key ? '#' + key : '');
    if (location.pathname + location.search + location.hash === url) return;
    history.replaceState(null, '', url);
  }

  function syncPressed() {
    document.querySelectorAll('.log-filters button').forEach((button) => {
      button.setAttribute('aria-pressed', button.dataset.c === selected ? 'true' : 'false');
    });
  }

  function choose(key) {
    const next = (key === 'all' || key === selected) ? 'all' : key;
    if (next === selected) return;
    selected = next;
    writeHash(selected === 'all' ? '' : selected);
    syncPressed();
    render();
    scrollTo(0, 0);
  }

  function mountFilters(filters) {
    const nav = document.querySelector('.nav-stack');
    if (!nav || nav.querySelector('.log-filters')) return;
    const bar = document.createElement('div');
    bar.className = 'log-filters';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'filter');
    filters.forEach((filter) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.c = filter.c;
      button.setAttribute('aria-pressed', 'false');
      const isAll = filter.c === 'all';
      const word = isAll ? 'all' : (WORDS[filter.c] || String(filter.c).toLowerCase());
      button.setAttribute('aria-label', word + ', ' + filter.n);
      const mark = document.createElement('span');
      mark.className = isAll ? 'word' : 'e';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = isAll ? 'all' : filter.e;
      const count = document.createElement('span');
      count.className = 'n';
      count.textContent = String(filter.n);
      button.append(mark, count);
      button.addEventListener('click', () => choose(filter.c));
      bar.append(button);
    });
    nav.append(bar);
  }

  function pad() {
    const nav = document.querySelector('.nav-stack');
    if (!nav) return;
    const bottom = nav.getBoundingClientRect().bottom;
    document.documentElement.style.setProperty('--log-nav', Math.ceil(bottom + 16) + 'px');
  }

  function note(text) {
    const line = document.createElement('p');
    line.className = 'note';
    line.textContent = text;
    gallery.replaceChildren(line);
  }

  gallery.addEventListener('click', (event) => {
    const shot = event.target.closest('.shot');
    if (!shot) return;
    const on = shot.classList.contains('show');
    gallery.querySelectorAll('.shot.show').forEach((el) => el.classList.remove('show'));
    if (!on) shot.classList.add('show');
  });

  addEventListener('hashchange', () => {
    const next = readHash();
    if (next === selected) return;
    selected = next;
    syncPressed();
    render();
  });

  let lastW = innerWidth;
  let resizeTimer;
  addEventListener('resize', () => {
    if (innerWidth === lastW) {
      pad();
      return;
    }
    lastW = innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(pad, 150);
  });

  fetch('/log/media.json', { cache: 'no-cache' }).then((res) => {
    if (!res.ok) throw new Error();
    return res.json();
  }).then((json) => {
    data = json || {};
    const filters = Array.isArray(data.filters) && data.filters.length ? data.filters : [
      { c: 'all', e: 'all', n: 0 },
      { c: 'movies', e: '🍿', n: 0 },
      { c: 'shows', e: '📺', n: 0 },
      { c: 'books', e: '📚', n: 0 },
      { c: 'albums', e: '💿', n: 0 },
      { c: 'games', e: '🎮', n: 0 }
    ];
    selected = readHash();
    mountFilters(filters);
    syncPressed();
    render();
    requestAnimationFrame(pad);
  }).catch(() => note('the log is unavailable'));

  const canvas = document.getElementById('rain');
  if (canvas && window.JayRain) {
    const T = [26, 173, 179], PALE_TEAL = [121, 205, 207], HEAD = [255, 255, 255], PALE_ORANGE = [255, 150, 121];
    const mob = () => document.documentElement.clientWidth < 760;
    const rain = JayRain.Rain(canvas, {
      fs: 16, fsMobile: 13, mono: '"JetBrains Mono", monospace', seed: 5, head: HEAD, headMix: .6,
      tint: T, paleTint: PALE_TEAL, paleOrange: PALE_ORANGE,
      palette: (x, w, r) => r < .84 ? T : PALE_TEAL,
      bands: (w, H) => [{ y0: 0, y1: H, perCol: mob() ? 1.6 : 2.1, lenMin: 8, lenMax: 30, alpha: .56, stepMin: 60, stepMax: 170, colDensity: () => 1 }],
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
