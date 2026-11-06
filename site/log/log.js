/* log.js v8. media log from site/log/media.json.
   the all chip is selected on load and shows every note, newest year first.
   tapping the selected category chip returns to all. tapping all while it is selected stays on all.
   a note with no embedded cover draws the title only. no stand-in image.
   the same title and author render once. punctuation and spacing fold together.
   a book subtitle after a colon folds into the short title, and a book note that
   swaps the title and the author folds into the real entry. the fuller title stays.
   fighting for your marriage while separated by linda rooks stays out. the note was deleted.
   albums are square. everything else is a 2:3 poster. three columns under 900px, six from there.
   a rating, when the note has one, sits quiet on the tile.
   search stays hidden until a pull down at the top of the page. it sits under the chips.
   the pull does not focus the field. */
(() => {
  const NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const WORDS = { all: 'all', movies: 'movies', shows: 'shows', books: 'books', albums: 'albums', games: 'games' };
  const COL_BREAK = 900;
  const gallery = document.getElementById('gallery');
  const columnCount = () => (innerWidth >= COL_BREAK ? 6 : 3);

  let data = null;
  let selected = 'all';
  let query = '';
  let searchForm = null;
  let searchInput = null;
  let searchOpen = false;
  let pulling = false;
  let blockFocus = false;

  function fold(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function identityKeys(item) {
    const cat = String(item.c || '');
    const title = fold(item.t);
    const author = fold(item.a);
    const keys = [cat + '|' + title + '|' + author];
    if (cat !== 'books' || !title) return keys;
    const head = fold(String(item.t || '').split(':')[0]);
    if (head && head !== title) keys.push(cat + '|' + head + '|' + author);
    if (author) {
      const left = head || title;
      const pair = left < author ? left + '|' + author : author + '|' + left;
      keys.push(cat + '|swap|' + pair);
    }
    return keys;
  }

  function richness(item) {
    let score = 0;
    if (item.img) score += 8;
    if (item.r) score += 4;
    if (item.glow) score += 4;
    if (item.blurb) score += 2;
    if (item.a) score += 1;
    return score;
  }

  function prefer(list) {
    const ranked = list.slice().sort((a, b) => {
      const len = String(b.t || '').length - String(a.t || '').length;
      if (len) return len;
      return richness(b) - richness(a);
    });
    const best = Object.assign({}, ranked[0]);
    list.forEach((item) => {
      if (!best.img && item.img) best.img = item.img;
      if (!best.r && item.r) best.r = item.r;
      if (!best.glow && item.glow) best.glow = item.glow;
      if (!best.blurb && item.blurb) best.blurb = item.blurb;
      if (!best.a && item.a) best.a = item.a;
    });
    return best;
  }

  const DROPPED_BOOKS = new Set([
    'fighting for your marriage while separated|linda rooks'
  ]);

  function droppedBook(item) {
    if (item.c !== 'books') return false;
    const forms = (value) => {
      const full = fold(value);
      const head = fold(String(value || '').split(':')[0]);
      return head && head !== full ? [full, head] : [full];
    };
    return forms(item.t).some((title) => forms(item.a).some((author) => {
      if (!title || !author) return false;
      const pair = title < author ? title + '|' + author : author + '|' + title;
      return DROPPED_BOOKS.has(pair);
    }));
  }

  function dedupeItems(items) {
    items = items.filter((item) => !droppedBook(item));
    const parent = items.map((_, i) => i);
    function find(i) {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    }
    function unite(a, b) {
      let pa = find(a);
      let pb = find(b);
      if (pa === pb) return;
      if (pa > pb) {
        const swap = pa;
        pa = pb;
        pb = swap;
      }
      parent[pb] = pa;
    }
    const seen = new Map();
    items.forEach((item, i) => {
      identityKeys(item).forEach((key) => {
        if (seen.has(key)) unite(i, seen.get(key));
        else seen.set(key, i);
      });
    });
    const groups = new Map();
    items.forEach((item, i) => {
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(item);
    });
    return [...groups.values()].map(prefer);
  }

  function dedupeLog(json) {
    const source = json || {};
    const items = dedupeItems(source.items || []);
    const counts = {};
    items.forEach((item) => {
      counts[item.c] = (counts[item.c] || 0) + 1;
    });
    const filters = (Array.isArray(source.filters) ? source.filters : []).map((filter) => {
      if (!filter || filter.c === 'all') return Object.assign({}, filter, { n: items.length });
      if (Object.prototype.hasOwnProperty.call(counts, filter.c)) return Object.assign({}, filter, { n: counts[filter.c] });
      return filter;
    });
    return Object.assign({}, source, { items, filters });
  }

  function matchesQuery(item, query) {
    const needle = fold(query);
    if (!needle) return true;
    const hay = fold(item && item.t) + ' ' + fold(item && item.a);
    const tight = hay.replace(/ /g, '');
    return needle.split(' ').every((word) => word && (hay.includes(word) || tight.includes(word)));
  }

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

  function glowName(glow) {
    if (glow === 'gold') return 'glow-gold';
    if (glow === 'orange' || glow === 'teal' || glow === 'favorite') return 'glow-orange';
    return '';
  }

  function tile(item, order, eager) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shot';
    const glow = glowName(item.glow);
    if (glow) button.classList.add(glow);
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
    const items = (data.items || []).filter((item) => {
      return (selected === 'all' || item.c === selected) && matchesQuery(item, query);
    });
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
      button.setAttribute('aria-label', isAll ? word : word + ', ' + filter.n);
      const mark = document.createElement('span');
      mark.className = isAll ? 'word' : 'e';
      mark.setAttribute('aria-hidden', 'true');
      mark.textContent = isAll ? 'all' : filter.e;
      button.append(mark);
      if (!isAll) {
        const count = document.createElement('span');
        count.className = 'n';
        count.textContent = String(filter.n);
        button.append(count);
      }
      button.addEventListener('click', () => choose(filter.c));
      bar.append(button);
    });
    nav.append(bar);
    mountSearch(nav);
  }

  function magnifier() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'log-search-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '10.5');
    circle.setAttribute('cy', '10.5');
    circle.setAttribute('r', '6.25');
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', 'currentColor');
    circle.setAttribute('stroke-width', '2');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M15.2 15.2 20.5 20.5');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-linecap', 'round');
    svg.append(circle, path);
    return svg;
  }

  function searchHeight() {
    const filters = document.querySelector('.log-filters');
    if (!filters) return 29;
    return Math.round(filters.getBoundingClientRect().height) || 29;
  }

  function syncSearchMetrics() {
    const filters = document.querySelector('.log-filters');
    if (!filters || !searchForm) return;
    const width = Math.round(filters.getBoundingClientRect().width);
    const height = searchHeight();
    const nextW = width + 'px';
    const nextH = height + 'px';
    if (searchForm.style.getPropertyValue('--log-search-w') !== nextW) searchForm.style.setProperty('--log-search-w', nextW);
    if (searchForm.style.getPropertyValue('--log-search-h') !== nextH) searchForm.style.setProperty('--log-search-h', nextH);
  }

  function clearPullStyles() {
    if (!searchForm) return;
    searchForm.style.height = '';
    searchForm.style.marginTop = '';
    searchForm.style.opacity = '';
    searchForm.style.borderWidth = '';
  }

  function settleFollow() {
    gallery.style.transition = 'transform .28s cubic-bezier(.2, .8, .2, 1)';
    gallery.style.transform = '';
  }

  function openSearch() {
    if (!searchForm || searchOpen) return;
    searchOpen = true;
    searchForm.classList.remove('is-pulling');
    clearPullStyles();
    searchForm.classList.add('is-open');
    syncSearchMetrics();
    pad();
    requestAnimationFrame(pad);
  }

  function closeSearch() {
    if (!searchForm || !searchOpen) return;
    searchOpen = false;
    searchForm.classList.remove('is-open', 'is-pulling');
    clearPullStyles();
    if (query) {
      query = '';
      if (searchInput) searchInput.value = '';
      if (data) render();
    }
    if (searchInput && document.activeElement === searchInput) searchInput.blur();
    pad();
    requestAnimationFrame(pad);
  }

  function paintPull(dy) {
    if (!searchForm) return;
    const full = searchHeight();
    const shown = Math.min(full, Math.max(0, dy) * 0.55);
    const p = full ? shown / full : 0;
    searchForm.classList.add('is-pulling');
    searchForm.style.height = shown + 'px';
    searchForm.style.marginTop = (8 * p) + 'px';
    searchForm.style.opacity = String(p);
    searchForm.style.borderWidth = (p > 0.08 ? 1 : 0) + 'px';
    const extra = Math.max(0, dy * 0.55 - full);
    gallery.style.transition = 'none';
    gallery.style.transform = extra > 0.5 ? 'translateY(' + Math.min(extra, 16) + 'px)' : '';
    pad();
  }

  function releasePull(dy) {
    if (!searchForm) return;
    const open = dy >= 56;
    searchForm.classList.remove('is-pulling');
    void searchForm.offsetWidth;
    if (open) {
      searchOpen = true;
      searchForm.classList.add('is-open');
      clearPullStyles();
      syncSearchMetrics();
    } else {
      searchForm.style.height = '0px';
      searchForm.style.marginTop = '0px';
      searchForm.style.opacity = '0';
      searchForm.style.borderWidth = '0px';
      searchForm.addEventListener('transitionend', () => {
        if (searchOpen) return;
        clearPullStyles();
        pad();
      }, { once: true });
    }
    settleFollow();
    pad();
    requestAnimationFrame(pad);
  }

  function mountSearch(nav) {
    if (!nav || searchForm) return;
    const form = document.createElement('form');
    form.className = 'log-search';
    form.setAttribute('role', 'search');
    form.addEventListener('submit', (event) => event.preventDefault());
    const label = document.createElement('label');
    label.className = 'log-search-label';
    label.htmlFor = 'log-search-input';
    label.textContent = 'search titles and authors';
    const input = document.createElement('input');
    input.id = 'log-search-input';
    input.type = 'search';
    input.placeholder = 'search';
    input.autocomplete = 'off';
    input.autocapitalize = 'off';
    input.spellcheck = false;
    input.enterKeyHint = 'search';
    input.readOnly = true;
    input.setAttribute('aria-label', 'search titles and authors');
    input.addEventListener('pointerdown', () => {
      blockFocus = false;
      input.readOnly = false;
    });
    input.addEventListener('focus', () => {
      if (blockFocus || pulling) {
        input.readOnly = true;
        input.blur();
        return;
      }
      input.readOnly = false;
      if (!searchOpen) openSearch();
    });
    input.addEventListener('input', () => {
      query = input.value;
      if (!data) return;
      render();
      scrollTo(0, 0);
    });
    form.append(label, input, magnifier());
    nav.append(form);
    searchForm = form;
    searchInput = input;
    syncSearchMetrics();
    if (window.ResizeObserver) {
      const observer = new ResizeObserver(() => {
        syncSearchMetrics();
        pad();
      });
      observer.observe(nav);
      const filters = nav.querySelector('.log-filters');
      if (filters) observer.observe(filters);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(syncSearchMetrics);
  }

  const PULL_SLOP = 10;
  let pullTracking = false;
  let pullActive = false;
  let pullStartX = 0;
  let pullStartY = 0;
  let pullLastDy = 0;
  let wheelAcc = 0;
  let wheelTimer = 0;

  document.addEventListener('touchstart', (event) => {
    pullTracking = false;
    pullActive = false;
    if (searchOpen || pulling || event.touches.length !== 1) return;
    if (window.scrollY > 0) return;
    const target = event.target;
    if (target && target.closest && target.closest('.nav-stack, a, input, textarea, select')) return;
    const touch = event.touches[0];
    pullStartX = touch.clientX;
    pullStartY = touch.clientY;
    pullLastDy = 0;
    pullTracking = true;
  }, { passive: true });

  document.addEventListener('touchmove', (event) => {
    if (!pullTracking || event.touches.length !== 1) return;
    if (window.scrollY > 0) {
      pullTracking = false;
      if (pullActive) {
        pullActive = false;
        pulling = false;
        releasePull(0);
      }
      return;
    }
    const touch = event.touches[0];
    const dy = touch.clientY - pullStartY;
    const dx = touch.clientX - pullStartX;
    if (!pullActive) {
      if (dy < PULL_SLOP) return;
      if (Math.abs(dx) > dy) {
        pullTracking = false;
        return;
      }
      pullActive = true;
      pulling = true;
      blockFocus = true;
    }
    pullLastDy = dy;
    if (dy <= 0) {
      paintPull(0);
      return;
    }
    event.preventDefault();
    paintPull(dy);
  }, { passive: false });

  function endPullTouch(cancel) {
    if (!pullTracking && !pullActive) return;
    const dy = cancel ? 0 : pullLastDy;
    const wasPull = pullActive;
    pullTracking = false;
    pullActive = false;
    pulling = false;
    if (!wasPull) return;
    blockFocus = true;
    releasePull(dy);
  }

  document.addEventListener('touchend', () => endPullTouch(false));
  document.addEventListener('touchcancel', () => endPullTouch(true));

  window.addEventListener('wheel', (event) => {
    if (event.ctrlKey) return;
    if (searchOpen || pulling || pullActive) {
      wheelAcc = 0;
      return;
    }
    if (window.scrollY > 0) {
      wheelAcc = 0;
      return;
    }
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
    const dy = event.deltaY * scale;
    if (Math.abs(event.deltaX * scale) > Math.abs(dy)) return;
    if (dy >= 0) {
      wheelAcc = 0;
      return;
    }
    wheelAcc += -dy;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { wheelAcc = 0; }, 280);
    if (wheelAcc < 72) return;
    wheelAcc = 0;
    event.preventDefault();
    openSearch();
  }, { passive: false });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') blockFocus = false;
    if (event.key !== 'Escape') return;
    if (!searchOpen && !query) return;
    event.preventDefault();
    if (query) {
      query = '';
      if (searchInput) searchInput.value = '';
      if (data) render();
      return;
    }
    closeSearch();
  });

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
    syncSearchMetrics();
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
    data = dedupeLog(json || {});
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
