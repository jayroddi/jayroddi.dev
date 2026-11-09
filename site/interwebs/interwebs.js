/* Newest first. Category is only for the filter; it is not shown on the video. */
const list = document.getElementById('interwebs');
const CATS = ['😭', '🏎️', '🐐'];
let items = [];
let selected = 'all';
let watcher;
let filterTries = 0;

function youtubeId(url) {
  let parsed;
  try { parsed = new URL(url); } catch (e) { return ''; }
  const host = parsed.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || '';
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return '';
  if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1] || '';
  return '';
}

function readHash() {
  let key = '';
  try { key = decodeURIComponent(location.hash.replace(/^#/, '')); } catch (e) { key = ''; }
  if (!key || key === 'all') return 'all';
  return CATS.includes(key) ? key : 'all';
}

function writeHash(key) {
  const url = location.pathname + location.search + (key ? '#' + encodeURIComponent(key) : '');
  if (location.pathname + location.search + location.hash === url) return;
  history.replaceState(null, '', url);
}

function syncPressed() {
  document.querySelectorAll('.iw-filters button').forEach((button) => {
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

function pad() {
  const nav = document.querySelector('.nav-stack');
  if (!nav) return;
  const bottom = nav.getBoundingClientRect().bottom;
  document.documentElement.style.setProperty('--iw-nav', Math.ceil(bottom + 16) + 'px');
}

function mountFilters(counts) {
  const nav = document.querySelector('.nav-stack');
  if (!nav) return false;
  if (nav.querySelector('.iw-filters')) return true;
  const filters = [{ c: 'all', e: 'all', n: items.length }].concat(CATS.map((cat) => ({
    c: cat,
    e: cat,
    n: counts[cat] || 0
  })));
  const bar = document.createElement('div');
  bar.className = 'iw-filters';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'filter');
  filters.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.c = filter.c;
    const isAll = filter.c === 'all';
    button.setAttribute('aria-label', isAll ? 'all' : filter.e + ', ' + filter.n);
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
  return true;
}

function arm(node) {
  if (!watcher) {
    watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const frame = entry.target.querySelector('iframe');
        if (frame && frame.dataset.src && !frame.getAttribute('src')) frame.src = frame.dataset.src;
        watcher.unobserve(entry.target);
      });
    }, { rootMargin: '240px 0px' });
  }
  watcher.observe(node);
}

function render() {
  if (!list) return;
  const frag = document.createDocumentFragment();
  items.forEach((item) => {
    if (selected !== 'all' && item.c !== selected) return;
    const id = youtubeId(item.url);
    if (!/^[\w-]{6,}$/.test(id)) return;
    const li = document.createElement('li');
    const wrap = document.createElement('div');
    wrap.className = 'iw-video';
    const frame = document.createElement('iframe');
    frame.dataset.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id);
    frame.title = 'YouTube video';
    frame.loading = 'lazy';
    frame.setAttribute('allowfullscreen', '');
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    wrap.append(frame);
    li.append(wrap);
    frag.append(li);
    arm(wrap);
  });
  list.replaceChildren(frag);
}

function start(rows) {
  items = Array.isArray(rows) ? rows.filter((row) => row && typeof row.url === 'string' && CATS.includes(row.c)) : [];
  const counts = {};
  items.forEach((item) => { counts[item.c] = (counts[item.c] || 0) + 1; });
  selected = readHash();
  if (!mountFilters(counts) && filterTries < 30) {
    filterTries += 1;
    requestAnimationFrame(() => start(rows));
    return;
  }
  syncPressed();
  render();
  requestAnimationFrame(pad);
}

fetch('/interwebs/items.json', { cache: 'no-cache' })
  .then((res) => res.ok ? res.json() : [])
  .then((rows) => start(rows))
  .catch(() => {});

addEventListener('hashchange', () => {
  const next = readHash();
  if (next === selected) return;
  selected = next;
  syncPressed();
  render();
});
addEventListener('resize', () => pad());
