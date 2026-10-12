/* v2.31: newest months first. the first two are drawn immediately; the rest arrive
   when the sentinel scrolls into view. grid images are the 640 rendition, with
   the 1280 in srcset. the 2048 loads only in the lightbox. */
(() => {
const NAMES = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const FIRST = 2;
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
  const frag = document.createDocumentFragment();
  photos.forEach(photo => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'shot';
    button.style.background = '#' + (photo.c || '111');
    button.setAttribute('aria-label', photo.d || 'photo');
    const img = document.createElement('img');
    img.alt = '';
    img.width = photo.w;
    img.height = photo.h;
    img.loading = 'lazy';
    img.decoding = 'async';
    const thumb = url(photo, photo.t);
    const resource = long => Math.max(1, Math.round(photo.w * long / (Math.max(photo.w, photo.h) || 1)));
    img.src = thumb;
    if (photo.s) img.srcset = thumb + ' ' + resource(640) + 'w, ' + url(photo, photo.s) + ' ' + resource(1280) + 'w';
    img.sizes = '(min-width: 1100px) 260px, (min-width: 760px) 33vw, 46vw';
    button.appendChild(img);
    button.addEventListener('click', () => open(photo));
    frag.appendChild(button);
  });
  grid.appendChild(frag);
  section.append(heading, grid);
  gallery.insertBefore(section, sentinel);
}

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
let lastW = innerWidth, rt;
addEventListener('resize', () => {
  if (innerWidth === lastW) return;
  lastW = innerWidth;
  clearTimeout(rt);
  rt = setTimeout(rain.build, 150);
});
})();
