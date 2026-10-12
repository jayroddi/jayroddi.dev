/* v2.32: newest month first. one month is drawn, then another when the sentinel
   scrolls into view (a short month keeps going until the screen is full).
   photos go round-robin into 3 columns, or 6 from 900px, so each row reads
   newest to oldest left to right and the first row shares one top edge.
   grid images are the 640 rendition, with the 1280 in srcset. the first photo
   is eager; the rest are lazy. the 2048 loads only in the lightbox. */
(() => {
const NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const FIRST = 1;
const COL_BREAK = 900;
const columnCount = () => (innerWidth >= COL_BREAK ? 6 : 3);
const SIZES = '(min-width: 900px) 200px, 30vw';
const gallery = document.getElementById('gallery');
const light = document.getElementById('light');
const big = light.querySelector('img');
const sentinel = document.getElementById('more');
let index = null;
let at = 0;
let busy = false;

const url = (photo, id) => index.base + 'assets/' + photo.i + '/revisions/' + photo.v + '/renditions/' + id + '?api_key=' + encodeURIComponent(index.key);

function monthName(key) {
  const [year, month] = key.split('-');
  return (NAMES[(+month || 1) - 1] || month) + ' ' + year;
}

function render(meta, photos) {
  const section = document.createElement('section');
  section.className = 'month';
  const heading = document.createElement('h2');
  heading.textContent = monthName(meta.m);
  const grid = document.createElement('div');
  grid.className = 'grid';
  const already = gallery.querySelectorAll('.shot').length;
  const eagerCount = columnCount();
  const shots = photos.map((photo, n) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shot';
    button.dataset.order = String(n);
    button.style.background = '#' + (photo.c || '111');
    button.style.setProperty('--r', photo.w + ' / ' + photo.h);
    button.setAttribute('aria-label', photo.d || 'photo');
    const thumb = url(photo, photo.t);
    const resource = long => Math.max(1, Math.round(photo.w * long / (Math.max(photo.w, photo.h) || 1)));
    button.dataset.src = thumb;
    button.dataset.w = photo.w;
    button.dataset.h = photo.h;
    if (photo.s) button.dataset.srcset = thumb + ' ' + resource(640) + 'w, ' + url(photo, photo.s) + ' ' + resource(1280) + 'w';
    button.dataset.eager = already + n < eagerCount ? '1' : '';
    button.addEventListener('click', () => open(photo));
    if (already + n === 0) mount(button, true);
    else if (button.dataset.eager) afterLead(() => mount(button));
    else watch.observe(button);
    return button;
  });
  place(grid, shots);
  section.append(heading, grid);
  gallery.insertBefore(section, sentinel);
}

let leadOpen = false;
const leadWait = [];
function leadReady() {
  if (leadOpen) return;
  leadOpen = true;
  leadWait.splice(0).forEach(fn => fn());
}
function afterLead(fn) {
  if (leadOpen) fn();
  else leadWait.push(fn);
}
setTimeout(leadReady, 8000);

function mount(button, high) {
  if (button.querySelector('img')) return;
  const img = document.createElement('img');
  img.alt = '';
  img.width = +button.dataset.w;
  img.height = +button.dataset.h;
  img.decoding = 'async';
  img.sizes = SIZES;
  img.loading = high ? 'eager' : 'lazy';
  if (high) {
    img.fetchPriority = 'high';
    img.addEventListener('load', leadReady, {once: true});
    img.addEventListener('error', leadReady, {once: true});
  }
  if (button.dataset.srcset) img.srcset = button.dataset.srcset;
  img.src = button.dataset.src;
  button.appendChild(img);
}

const watch = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    watch.unobserve(entry.target);
    afterLead(() => mount(entry.target));
  });
}, {rootMargin: '600px'});

function open(photo) {
  const id = photo.l || photo.s || photo.t;
  big.width = photo.w;
  big.height = photo.h;
  big.alt = photo.d || '';
  big.src = url(photo, id);
  if (!light.open) light.showModal();
}

async function more() {
  if (busy || !index || at >= index.months.length) return;
  busy = true;
  const count = at === 0 ? FIRST : 1;
  const slice = index.months.slice(at, at + count);
  at += slice.length;
  try {
    const files = await Promise.all(slice.map(meta =>
      fetch('/snaps/m/' + meta.m + '.json', {cache: 'no-cache'}).then(res => {
        if (!res.ok) throw new Error(meta.m);
        return res.json();
      })
    ));
    slice.forEach((meta, i) => render(meta, files[i]));
  } catch (err) {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'some photos did not load';
    gallery.insertBefore(note, sentinel);
  }
  busy = false;
  if (at >= index.months.length) {
    sentinel.hidden = true;
    return;
  }
  if (sentinel.getBoundingClientRect().top < innerHeight + 800) more();
}

light.addEventListener('click', () => light.close());
light.addEventListener('close', () => { big.removeAttribute('src'); });
light.addEventListener('pointerdown', event => event.stopPropagation());
light.addEventListener('pointerup', event => event.stopPropagation());

const note = text => {
  const el = document.createElement('p');
  el.className = 'note';
  el.textContent = text;
  gallery.appendChild(el);
};

(window.__snaps || fetch('/snaps/snaps.json', {cache: 'no-cache'}).then(res => res.json()))
  .then(data => {
    index = data;
    if (!data || !Array.isArray(data.months) || !data.months.length) {
      note('no photos yet');
      return;
    }
    const watch = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) more();
    }, {rootMargin: '800px'});
    sentinel.hidden = false;
    watch.observe(sentinel);
    more();
  })
  .catch(() => note('photos are unavailable'));

const T = [26, 173, 179], PALE_TEAL = [121, 205, 207], HEAD = [255, 255, 255], PALE_ORANGE = [255, 150, 121];
const mob = () => document.documentElement.clientWidth < 760;
const rain = JayRain.Rain(document.getElementById('rain'), {
  fs: 16, fsMobile: 13, mono: '"JetBrains Mono", monospace', seed: 5, head: HEAD, headMix: .6,
  tint: T, paleTint: PALE_TEAL, paleOrange: PALE_ORANGE,
  palette: (x, w, r) => r < .84 ? T : PALE_TEAL,
  bands: (w, H) => [{y0: 0, y1: H, perCol: mob() ? 1.6 : 2.1, lenMin: 8, lenMax: 30, alpha: .56, stepMin: 60, stepMax: 170, colDensity: () => 1}],
  alphaAt: (x, y, R) => 1 - .45 * JayRain.smooth(R.H * .55, R.H, y),
  partSel: '.copy, .month h2', partPad: 50, partFloor: .3
});
JayRain.register(rain);
document.fonts.ready.then(() => {
  rain.build();
  requestAnimationFrame(rain.frame);
});
function place(grid, shots) {
  const n = columnCount();
  const columns = Array.from({length: n}, () => {
    const col = document.createElement('div');
    col.className = 'col';
    return col;
  });
  shots.forEach((shot, i) => columns[i % n].appendChild(shot));
  grid.replaceChildren(...columns);
  grid.dataset.cols = String(n);
}

function relayout() {
  const n = String(columnCount());
  document.querySelectorAll('.grid').forEach(grid => {
    if (grid.dataset.cols === n) return;
    const shots = [...grid.querySelectorAll('.shot')].sort((a, b) => +a.dataset.order - +b.dataset.order);
    place(grid, shots);
  });
}

let lastW = innerWidth, rt;
addEventListener('resize', () => {
  if (innerWidth === lastW) return;
  lastW = innerWidth;
  clearTimeout(rt);
  rt = setTimeout(() => { relayout(); rain.build(); }, 150);
});
})();
