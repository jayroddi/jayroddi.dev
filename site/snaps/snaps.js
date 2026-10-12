/* v2.33: newest month first. one month is drawn, then another when the sentinel
   scrolls into view (a short month keeps going until the screen is full).
   photos go round-robin into 3 columns, or 6 from 900px, so each row reads
   newest to oldest left to right and the first row shares one top edge.
   grid images are the 640 rendition, with the 1280 in srcset. the first photo
   is eager; the rest are lazy. the lightbox shows that thumbnail at once,
   then the 2048 in the same box. left is newer, right is older. */
(() => {
const NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const FIRST = 1;
const COL_BREAK = 900;
const SWIPE = 48;
const columnCount = () => (innerWidth >= COL_BREAK ? 6 : 3);
const SIZES = '(min-width: 900px) 200px, 30vw';
const gallery = document.getElementById('gallery');
const light = document.getElementById('light');
const frame = light.querySelector('.frame');
const lo = light.querySelector('.lo');
const hi = light.querySelector('.hi');
const nameEl = document.getElementById('light-name');
const prevBtn = light.querySelector('.prev');
const nextBtn = light.querySelector('.next');
const sentinel = document.getElementById('more');
const sequence = [];
let index = null;
let at = 0;
let moreP = null;
let cursor = 0;
let token = 0;
let trap = false;
let ignorePop = false;
let savedY = 0;
let locked = false;
let gesture = null;
let pinch = false;
let dragged = false;
let eatClick = false;
let stepping = false;
let held = [];

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
    const seqAt = sequence.length;
    sequence.push(photo);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shot';
    button.dataset.order = String(n);
    button.dataset.seq = String(seqAt);
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
    button.addEventListener('click', () => openAt(seqAt));
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

function total() {
  return index.months.reduce((sum, meta) => sum + meta.n, 0);
}

function thumbOf(i) {
  const photo = sequence[i];
  const button = gallery.querySelector('.shot[data-seq="' + i + '"]');
  const img = button && button.querySelector('img');
  if (img && img.complete && img.naturalWidth) return img.currentSrc || img.src;
  return url(photo, photo.t);
}

function fullOf(photo) {
  return url(photo, photo.l || photo.s || photo.t);
}

function warm(i) {
  const photo = sequence[i];
  if (!photo) return [];
  return [thumbOf(i), fullOf(photo)].map(src => {
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.src = src;
    return img;
  });
}

function go(i) {
  if (i < 0 || i >= sequence.length) return;
  cursor = i;
  const photo = sequence[i];
  const mine = ++token;
  frame.style.setProperty('--w', String(photo.w || 1));
  frame.style.setProperty('--h', String(photo.h || 1));
  frame.style.background = '#' + (photo.c || '111');
  const thumb = thumbOf(i);
  const full = fullOf(photo);
  lo.src = thumb;
  hi.classList.remove('on');
  hi.onload = () => { if (token === mine) hi.classList.add('on'); };
  hi.onerror = () => { if (token === mine) hi.classList.remove('on'); };
  if (full === thumb) hi.removeAttribute('src');
  else {
    hi.src = full;
    if (hi.complete && hi.naturalWidth) hi.classList.add('on');
  }
  const of = total();
  nameEl.textContent = (photo.d || 'photo') + ', ' + (cursor + 1) + ' of ' + of;
  const atStart = cursor === 0;
  const atEnd = cursor >= sequence.length - 1 && at >= index.months.length;
  prevBtn.classList.toggle('off', atStart);
  nextBtn.classList.toggle('off', atEnd);
  prevBtn.setAttribute('aria-disabled', atStart ? 'true' : 'false');
  nextBtn.setAttribute('aria-disabled', atEnd ? 'true' : 'false');
  held = warm(cursor - 1).concat(warm(cursor + 1));
  if (cursor >= sequence.length - 2 && at < index.months.length) more();
}

function newer() {
  if (cursor > 0) go(cursor - 1);
}

async function older() {
  if (stepping) return;
  if (cursor < sequence.length - 1) { go(cursor + 1); return; }
  if (!index || at >= index.months.length) return;
  stepping = true;
  try {
    await more();
    if (cursor < sequence.length - 1) go(cursor + 1);
  } finally {
    stepping = false;
  }
}

function lockScroll() {
  if (locked) return;
  locked = true;
  savedY = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.classList.add('light-open');
  const body = document.body;
  body.style.position = 'fixed';
  body.style.top = '-' + savedY + 'px';
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
}

function placeScroll() {
  const y = savedY;
  window.scrollTo(0, y);
  setTimeout(() => window.scrollTo(0, y), 0);
  requestAnimationFrame(() => window.scrollTo(0, y));
}

function unlockScroll() {
  if (!locked) return;
  locked = false;
  document.documentElement.classList.remove('light-open');
  const body = document.body;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  placeScroll();
}

function openAt(i) {
  if (!sequence[i]) return;
  const fresh = !light.open;
  go(i);
  if (!fresh) return;
  history.pushState({snaps: 1}, '');
  trap = true;
  light.showModal();
  lockScroll();
  light.focus();
}

function shut() {
  if (light.open) light.close();
}

light.addEventListener('close', () => {
  token++;
  hi.onload = null;
  hi.onerror = null;
  hi.removeAttribute('src');
  hi.classList.remove('on');
  lo.removeAttribute('src');
  held = [];
  unlockScroll();
  if (trap) {
    trap = false;
    ignorePop = true;
    history.back();
    setTimeout(() => { ignorePop = false; }, 600);
  }
  placeScroll();
});

addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; placeScroll(); return; }
  if (!light.open) return;
  trap = false;
  light.close();
});

function more() {
  if (moreP) return moreP;
  if (!index || at >= index.months.length) return Promise.resolve(false);
  moreP = (async () => {
    let any = false;
    do {
      const count = at === 0 ? FIRST : 1;
      const slice = index.months.slice(at, at + count);
      at += slice.length;
      const files = await Promise.all(slice.map(meta =>
        fetch('/snaps/m/' + meta.m + '.json', {cache: 'no-cache'}).then(res => {
          if (!res.ok) throw new Error(meta.m);
          return res.json();
        })
      ));
      slice.forEach((meta, i) => render(meta, files[i]));
      any = true;
      if (at >= index.months.length) {
        sentinel.hidden = true;
        break;
      }
    } while (sentinel.getBoundingClientRect().top < innerHeight + 800);
    return any;
  })().catch(() => {
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = 'some photos did not load';
    gallery.insertBefore(note, sentinel);
    return false;
  }).finally(() => { moreP = null; });
  return moreP;
}

light.addEventListener('touchstart', event => {
  if (event.touches.length > 1) { pinch = true; gesture = null; }
}, {passive: true});
light.addEventListener('touchend', event => {
  if (!event.touches.length) pinch = false;
}, {passive: true});
light.addEventListener('touchmove', event => {
  if (event.touches.length !== 1) return;
  dragged = true;
  event.preventDefault();
}, {passive: false});
light.addEventListener('pointerdown', event => {
  event.stopPropagation();
  if (!event.isPrimary || pinch) { gesture = null; return; }
  gesture = {id: event.pointerId, x: event.clientX, y: event.clientY};
});
light.addEventListener('pointerup', event => {
  event.stopPropagation();
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  gesture = null;
  const moved = dragged;
  dragged = false;
  if (pinch) return;
  if (Math.hypot(dx, dy) > 12 && !moved) {
    eatClick = true;
    setTimeout(() => { eatClick = false; }, 0);
  }
  if (Math.abs(dx) >= SWIPE && Math.abs(dx) > Math.abs(dy) * 1.3) {
    if (dx < 0) older();
    else newer();
  }
});
light.addEventListener('pointercancel', () => { gesture = null; dragged = false; });
light.addEventListener('wheel', event => event.preventDefault(), {passive: false});

light.addEventListener('click', event => {
  if (eatClick) { eatClick = false; event.preventDefault(); return; }
  if (event.target.closest('.x')) { shut(); return; }
  const box = frame.getBoundingClientRect();
  const x = event.clientX;
  const y = event.clientY;
  const letterbox = x >= box.left && x <= box.right && (y < box.top || y > box.bottom);
  if (letterbox) { shut(); return; }
  if (event.target.closest('.prev') || x < innerWidth / 2) newer();
  else older();
});

light.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft') { event.preventDefault(); newer(); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); older(); }
});

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
