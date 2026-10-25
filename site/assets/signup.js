/* v2.25: the social row is gone. a valid email goldens the title. the form no longer needs an icon list.
   v2.24: a valid email goldens both icon lines (the row is split under the header).
   v2.23 (jay 2026.10.20): konami rocket no longer sticks mid-screen on pages without #stage, and finishes off the top of the screen.
   v2.22 (jay 2026.10.20): the footer (email, rocket, konami) is on /, /quotes/ and /me/; the placeholder is "subscribe for updates".
   v2.21: the email field is 16px inside a wrapper scaled to the stat-label size. the cable follows that visual box.
   the prompt line above the form is gone. the field placeholder is "enter email for liftoff, or cheat code below".
   the thanks line is the same copy, shown at once (the old typewriter lived in the homepage intro). */
(() => {
const form = document.querySelector('form.notify');
const emailIn = form && form.querySelector('input[type=email]');
const statusEl = document.querySelector('.signup .status');
const ul = document.querySelector('.mast .social') || document.querySelector('footer.foot .social');
if (!form || !emailIn || !statusEl || !window.JayRain) return;
const state = window.__intro || (window.__intro = {});
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const curLi = mk('li', 'cur');
const RAIN_GLYPHS = '0123456789{}[]<>/\\=+*:;.-_#$%&@abcdefhjknrstuvxyz'.split('');
const rg = () => RAIN_GLYPHS[Math.floor(Math.random()*RAIN_GLYPHS.length)];
const gateTap = el => { el.style.pointerEvents = 'none'; el.tabIndex = -1; el.setAttribute('aria-hidden', 'true'); return el; };
const revealTap = el => { if (!el) return el; el.style.pointerEvents = ''; el.removeAttribute('tabindex'); el.removeAttribute('aria-hidden'); return el; };
const COPY = {
  failNote: "that email isn't complete yet, try again (like you@email.com)",
  thanks: "thanks! 💛 check your inbox to confirm"
};
const nativeOk = v => !(v.valueMissing || v.typeMismatch || v.patternMismatch || v.tooLong || v.tooShort || v.badInput);
const looksDone = () => nativeOk(emailIn.validity) && /@[^@\s]+\.[^@\s.]{2,}$/.test(emailIn.value.trim());
const rkBtn = form.querySelector('.rkb'), SVGNS = 'http://www.w3.org/2000/svg';
const PORT = (() => { const dx = 100 - 128, dy = 168 + 6 - 128, c = Math.SQRT1_2; return [(128 + (dx - dy)*c)/256, (128 + (dx + dy)*c)/256]; })();
const svgEl = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
const cblSvg = k => svgEl('svg', {class: 'cbl ' + k, 'aria-hidden': 'true', focusable: 'false'});
/* v1.67 (jay 2026.10.03): one track path + one fill path (was 3 abutting segments each, which left faint joins at 1/3 and 2/3); the fill is one dash that grows along the whole line */
const cblT = cblSvg('cbl-t'), cblF = [cblSvg('cbl-f cbl-f1')], cblW = cblSvg('cbl-w');
const segT = [svgEl('path', {class: 's1'})], segF = [svgEl('path', {class: 'fill', pathLength: 100})], flowP = svgEl('path', {class: 'flow', pathLength: 100});
cblT.append(...segT); cblF.forEach((sv, i) => sv.appendChild(segF[i])); cblW.appendChild(flowP);
form.append(cblT, ...cblF, cblW); form.classList.add('cabled');
const cblAll = [cblT, ...cblF, cblW];
const placeCable = () => {
  const formBox = form.getBoundingClientRect(), inBox = emailIn.getBoundingClientRect(), rkBox = rkBtn.getBoundingClientRect();
  const x0 = inBox.left - formBox.left, yb = inBox.bottom - formBox.top - .5, bw = rkBox.width, bh = rkBox.height;
  const xp = rkBox.left - formBox.left + bw*PORT[0], yp = Math.min(yb, rkBox.top - formBox.top + bh*PORT[1]), pad = 12, run = bw*.6, xs = Math.max(x0, xp - run), d = Math.min(8, (yb - yp)*.5);
  const L = x0 - pad, T = yp - pad, X = v => (v - L).toFixed(2), Y = v => (v - T).toFixed(2);
  const curve = `C${X(xs + (xp - xs)*.55)} ${Y(yb)} ${X(xp - d)} ${Y(yp + d)} ${X(xp)} ${Y(yp)}`, a = x0 + (xs - x0)/3, b = x0 + (xs - x0)*2/3;
  const seg = [`M${X(x0)} ${Y(yb)}H${X(xs)}${curve}`];
  for (const sv of cblAll){ sv.style.left = L + 'px'; sv.style.top = T + 'px'; sv.setAttribute('width', (xp - x0 + 2*pad).toFixed(2)); sv.setAttribute('height', (yb - yp + 2*pad).toFixed(2)); }
  seg.forEach((d, i) => { segT[i].setAttribute('d', d); segF[i].setAttribute('d', d); });
  flowP.setAttribute('d', `M${X(x0)} ${Y(yb)}H${X(xs)}${curve}`);
  const len = flowP.getTotalLength && flowP.getTotalLength(); if (len) form.style.setProperty('--cbl-s', (100*(xs - x0)/len).toFixed(2));
  window.__cable = {x0: Math.round(x0), a: Math.round(a), b: Math.round(b), xs: Math.round(xs), port: [Math.round(xp), Math.round(yp)]};
};
/* v1.97: the row is the content column (space-between in the stylesheet). this only parks the
   prompt caret beside the mail icon, out of the flex line, and keeps the konami row on those edges. */
const anchorCursor = () => {
  const caret = curLi.querySelector('.cursor');
  curLi.style.position = 'absolute'; curLi.style.top = '0'; curLi.style.height = '100%'; curLi.style.marginLeft = '0'; curLi.style.width = 'auto'; curLi.style.right = 'auto';
  if (caret) caret.style.margin = '0 0 0 .08em';
  const prev = curLi.previousElementSibling, ulBox = ul.getBoundingClientRect();
  const fs = parseFloat(getComputedStyle(ul).fontSize) || 18;
  const left = prev ? prev.getBoundingClientRect().right - ulBox.left + fs*.08 : 0;
  curLi.style.left = left.toFixed(2) + 'px';
};
const fitRow = () => {
  if (!ul) { syncPad(); return; }
  ul.style.marginLeft = ''; ul.style.setProperty('--igap', '0px');
  anchorCursor(); syncPad(); };
fitRow(); addEventListener('resize', fitRow); if (window.ResizeObserver){ const ro = new ResizeObserver(fitRow); ro.observe(form); if (ul) { const wt = ul.querySelector('svg.nj'); if (wt) ro.observe(wt); } } if (document.fonts) document.fonts.ready.then(fitRow);
/* v1.72 (jay 2026.10.05): konami. buttons need up up down down left right left right b a start.
   keyboard is the same arrows then b a, and Enter is start. a alone does not launch.
   Enter is ignored while an input has focus. any other key on the start step is a miss.
   idle glyphs stay --dim-w. progress is the launch-hold gold pulse, one eleventh per press.
   v1.73: a correct press also bumps that glyph (scale ~1.15, bright gold, 250ms). transform only.
   a miss blinks the whole row red and clears the glow. gold hides the row in place (visibility, the box stays).
   liftoff flies the successful-launch gold rocket; the flight itself is unchanged.
   v1.74: the win uses that launch's gold pass (trackGold → JayRain.gold track). text and icons
   turn gold as the rocket's centre passes them. the page clone is not inside the gold sky,
   so it is not born gold. reduced motion locks gold immediately. */
const CODE = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a', 'start'];
const KEY = {ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right'};
let at = 0, lock = false, goldLatch = false, goldBusy = false;
/* ios 18+ safari plays a haptic tick when a <input type=checkbox switch> flips. iphone has no
   vibrate(), so a 1px switch (out of tab order, aria-hidden) is toggled by clicking its label
   inside the press. android and desktop use navigator.vibrate. silent if neither works, and the
   glow never waits on it. easy to delete if apple drops the switch tick. */
const haptic = (() => {
  const box = document.querySelector('.hap input'), lab = document.querySelector('.hap label');
  if (box) box.addEventListener('focus', () => { try { box.blur(); } catch (e) {} });
  const vibe = pat => { try { return typeof navigator.vibrate === 'function' && navigator.vibrate(pat) === true; } catch (e) { return false; } };
  const ios = n => { if (!lab) return; let i = 0; const one = () => {
    const x = scrollX, y = scrollY, ae = document.activeElement;
    try { lab.click(); } catch (e) {}
    if (box && document.activeElement === box){ try { box.blur(); } catch (e2) {} if (ae && ae !== box) { try { ae.focus({preventScroll: true}); } catch (e3) {} } }
    if (scrollX !== x || scrollY !== y) scrollTo(x, y);
    if (++i < n) setTimeout(one, 80);
  }; one(); };
  return {
    tick(){ if (!vibe(10)) ios(1); },
    error(){ if (!vibe([30, 40, 30, 40, 30])) ios(3); },
    success(){ if (!vibe([25, 40, 25, 40, 70])) ios(2); }
  };
})();
function syncPad(){
  const pad = document.querySelector('.pad'); if (!pad) return;
  /* v1.97: the row is the content column in the stylesheet. clear any leftover inline size. */
  pad.style.width = ''; pad.style.marginLeft = ''; pad.style.marginRight = '';
}
function goldNow(){
  const pad = document.querySelector('.pad');
  if (document.documentElement.classList.contains('gld')) return true;
  if (pad){
    if (pad.classList.contains('gld') || pad.querySelector('.gld')) return true;
    for (let n = pad.parentElement; n; n = n.parentElement) if (n.classList.contains('gld')) return true;
  }
  try { if (window.JayRain && JayRain.golden && JayRain.golden()) return true; } catch (e) {}
  return false;
}
function idle(){
  at = 0; const pad = document.querySelector('.pad'); if (!pad) return;
  pad.classList.remove('go', 'bad'); pad.style.setProperty('--pad-k', '0'); pad.dataset.step = '0';
}
function clearBump(pad){
  pad.querySelectorAll('button').forEach(b => { b.getAnimations().forEach(a => { if (a.id === 'pad-hit') a.cancel(); }); });
}
function bump(k){
  const pad = document.querySelector('.pad'); if (!pad) return;
  const btn = pad.querySelector('button[data-k="' + k + '"]'); if (!btn || !btn.animate) return;
  clearBump(pad);
  const rest = 'brightness(1) drop-shadow(0 0 8px rgba(255,215,0,.75))';
  const flash = 'brightness(1.7) drop-shadow(0 0 22px rgba(255,215,0,1)) drop-shadow(0 0 8px rgba(255,246,194,1))';
  if (reduced) btn.animate([{filter: 'brightness(1) drop-shadow(0 0 12px rgba(255,215,0,.85))'}, {filter: 'brightness(1.7) drop-shadow(0 0 18px rgba(255,215,0,1))', offset: .35}, {filter: 'brightness(1) drop-shadow(0 0 12px rgba(255,215,0,.85))'}], {duration: 250, easing: 'ease-out', id: 'pad-hit'});
  else btn.animate([{transform: 'scale(1)', filter: rest}, {transform: 'scale(1.15)', filter: flash, offset: .35}, {transform: 'scale(1)', filter: rest}], {duration: 250, easing: 'ease-out', id: 'pad-hit'});
}
function failRow(){
  const pad = document.querySelector('.pad'); if (!pad) return;
  at = 0; lock = true; clearBump(pad); pad.classList.remove('go'); pad.style.setProperty('--pad-k', '0'); pad.dataset.step = '0'; pad.classList.add('bad');
  haptic.error();
  setTimeout(() => { pad.classList.remove('bad'); lock = false; }, reduced ? 480 : 540);
}
function succeed(){
  if (lock || goldNow()) return;
  const pad = document.querySelector('.pad'); if (!pad) return;
  lock = true; at = 0;
  try { if (state.fail && state.fail.abort) state.fail.abort(); } catch (e) {}
  pad.classList.remove('bad'); pad.classList.add('go'); pad.style.setProperty('--pad-k', '11'); pad.dataset.step = '11';
  haptic.success();
  try { if (typeof gtag === 'function') gtag('event', 'konami'); } catch (e) {}
  try { state.konami = {playing: true, t0: performance.now()}; } catch (e) {}
  setTimeout(() => { try { launchSpace(); } catch (e) { idle(); lock = false; } }, reduced ? 180 : 420);
}
function press(k, fromKey){
  if (lock || goldNow()) return false;
  const pad = document.querySelector('.pad'); if (!pad) return false;
  if (k === 'enter'){
    if (!fromKey || at === 0) return false;
    if (at === CODE.length - 1){ succeed(); bump('start'); return true; }
    failRow(); return true;
  }
  if (k === CODE[at]){
    if (k === 'start'){ succeed(); bump('start'); return true; }
    at++; pad.classList.add('go'); pad.style.setProperty('--pad-k', String(at)); pad.dataset.step = String(at);
    bump(k); haptic.tick();
    return true;
  }
  if (fromKey && at === 0 && CODE.indexOf(k) < 0) return false;
  failRow(); return true;
}
function typing(){
  const a = document.activeElement; if (!a || (a.closest && a.closest('.hap'))) return false;
  return a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable;
}
function cloneSvg(el, suf){
  const svg = el.cloneNode(true);
  [svg, ...svg.querySelectorAll('*')].forEach(n => {
    if (n.id) n.id += suf;
    [...n.attributes].forEach(a => { if (a.value && a.value.indexOf('url(#') !== -1) n.setAttribute(a.name, a.value.replace(/url\(#([^)]+)\)/g, (_, id) => 'url(#' + id + suf + ')')); });
  });
  return svg;
}
function starField(canvas){
  const ctx = canvas.getContext('2d'), dpr = Math.min(2, devicePixelRatio || 1);
  let w = 0, h = 0, stars = [], raf = 0, v = 0, target = 0, live = true;
  const resize = () => {
    w = innerWidth; h = innerHeight; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!stars.length) stars = Array.from({length: 72}, () => ({x: Math.random() * w, y: Math.random() * h, z: Math.random(), s: Math.random() * 1.2 + .4}));
  };
  const frame = () => {
    if (!live) return;
    v += (target - v) * .08; ctx.clearRect(0, 0, w, h);
    for (const st of stars){
      st.y += (4 + st.z * 22) * v; if (st.y > h + 6){ st.y = -6; st.x = Math.random() * w; }
      ctx.globalAlpha = .25 + st.z * .7; ctx.fillStyle = st.z > .88 ? '#FFF6C2' : '#fff';
      ctx.fillRect(st.x, st.y, st.s, st.s + (1 + st.z * 14) * v);
    }
    ctx.globalAlpha = 1; raf = requestAnimationFrame(frame);
  };
  resize(); frame(); addEventListener('resize', resize);
  return { boost(n){ target = n; }, stop(){ live = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); } };
}
/* the successful-launch gold rocket: same stop colours, au class, and glow as launchRocket. */
function goldRocket(svg, sky, cls, band){
  const AU = {'rk-b': ['#FFF3B0', '#FFD700', '#B8860B'], 'rk-w': ['#FFFFFF', '#FFF1C4'], 'rk-f': ['#FFFBE0', '#FFE066', '#FFB800'], 'rk-n': ['#E8C860', '#7A5A10'], 'rk-g': ['#FFF0A0', '#C99A00', '#5A4200']};
  const c = svg.cloneNode(true); c.classList.add(cls); c.style.opacity = ''; c.style.transform = '';
  c.querySelectorAll('[id]').forEach(g => { const cols = AU[g.id]; g.id = g.id + '-' + cls; if (cols) g.querySelectorAll('stop').forEach((s, i) => s.setAttribute('stop-color', band ? '#FFF8DC' : cols[Math.min(i, cols.length - 1)])); });
  c.querySelectorAll('[fill^="url(#"]').forEach(e => e.setAttribute('fill', e.getAttribute('fill').replace(/\)$/, '-' + cls + ')')));
  if (band) c.querySelectorAll('[fill="#fff"], [fill="#C9F3F4"]').forEach(e => e.setAttribute('fill', '#FFF8DC'));
  else c.querySelectorAll('[fill="#C9F3F4"]').forEach(e => e.setAttribute('fill', '#FFFBE0'));
  c.querySelectorAll('[stroke="#FFC2A8"]').forEach(e => e.setAttribute('stroke', '#FFF3B0'));
  sky.appendChild(c); return c;
}
/* the email liftoff's gold pass: .gld as this element's centre climbs past each node (rain.js goldTrack). */
function trackGold(el){
  return JayRain.gold({lock: true, track: () => { if (!el || !el.isConnected || el.style.visibility === 'hidden') return -Infinity; const b = el.getBoundingClientRect(); return (b.top + b.bottom)/2; }});
}
function launchSpace(){
  const nj = ul && ul.querySelector('svg.nj'), root = mk('div', 'konami rk-sky');
  const space = mk('div', 'kos-space'), stars = document.createElement('canvas'), mask = mk('div', 'kos-mask'), hold = mk('div', 'kos-hold'), lives = mk('p', 'kos-lives');
  stars.className = 'kos-stars'; lives.setAttribute('aria-live', 'polite');
  const ninja = nj ? cloneSvg(nj, '-k') : mk('span');
  if (ninja.tagName === 'svg'){ ninja.classList.add('gld'); ninja.setAttribute('aria-hidden', 'true'); }
  hold.append(ninja, lives);
  [space, stars, mask].forEach(el => el.setAttribute('aria-hidden', 'true'));
  root.append(space, stars, mask, hold); document.body.appendChild(root);
  const sky = starField(stars);
  const done = () => { sky.stop(); root.remove(); idle(); lock = false; try { if (state.konami) state.konami.playing = false; } catch (e) {} };
  const say = () => {
    if (nj) nj.classList.add('gld');
    lives.textContent = ''; requestAnimationFrame(() => { lives.textContent = '+30 lives'; });
    hold.classList.add('kos-pulse');
    if (hold.animate) hold.animate([{opacity: 0, transform: 'translateY(10px)'}, {opacity: 1, transform: 'none'}], {duration: reduced ? 280 : 480, easing: 'ease', fill: 'forwards'});
    else hold.style.opacity = '1';
  };
  const fadeOut = ms => { idle(); const a = root.animate ? root.animate([{opacity: 1}, {opacity: 0}], {duration: ms, easing: 'ease', fill: 'forwards'}) : null; if (a && a.finished) a.finished.then(done); else setTimeout(done, ms); };
  if (reduced || !root.animate){
    if (space.animate) space.animate([{opacity: 0}, {opacity: 1}], {duration: 360, fill: 'forwards'}); else space.style.opacity = '1';
    JayRain.gold({lock: true});
    say(); setTimeout(() => fadeOut(420), 4500); return;
  }
  const src = form.querySelector('.rkb .rk'), b = src && src.getBoundingClientRect();
  let fly = null, dx = 0, dy = 0;
  const climb = () => {
    const stage = document.getElementById('stage') || document.querySelector('main.stage') || document.querySelector('main') || document.body, rect = stage.getBoundingClientRect(), clone = stage.cloneNode(true);   // v2.23: / /quotes/ /music/ have no #stage (was a TypeError: rocket stuck mid-screen)
    clone.querySelectorAll('[id]').forEach(n => { n.id = n.id + '-kos'; });
    clone.querySelectorAll('*').forEach(n => { [...n.attributes].forEach(a => { if (a.value && a.value.indexOf('url(#') !== -1) n.setAttribute(a.name, a.value.replace(/url\(#([^)]+)\)/g, (_, id) => 'url(#' + (id.endsWith('-kos') ? id : id + '-kos') + ')')); }); });
    clone.removeAttribute('id'); clone.inert = true; clone.classList.add('kos-page');
    clone.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;margin:0;min-height:0;pointer-events:none;z-index:1';
    root.insertBefore(clone, hold);
    mask.animate([{opacity: 0}, {opacity: 1}], {duration: 180, fill: 'forwards'}); sky.boost(1);
    const flight = 1500;
    clone.animate([{transform: 'translateY(0)', opacity: 1}, {transform: 'translateY(70vh)', opacity: 0}], {duration: flight, easing: 'cubic-bezier(.4,0,.7,1)', fill: 'forwards', delay: 160});
    mask.animate([{opacity: 1}, {opacity: 0}], {duration: flight, easing: 'ease', fill: 'forwards', delay: 200});
    space.animate([{opacity: 0}, {opacity: 1}], {duration: Math.round(flight * .85), easing: 'ease', fill: 'forwards', delay: 180});
    setTimeout(() => {
      sky.boost(0);
      if (fly) fly.animate([{transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(-45deg)', opacity: 1}, {transform: 'translate(' + dx + 'px,' + (dy - innerHeight * .46 - b.height * 3) + 'px) rotate(-45deg)', opacity: 1}], {duration: 760, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'forwards'}).finished.then(() => { fly.style.visibility = 'hidden'; });
      say(); setTimeout(() => fadeOut(640), 4500);
    }, flight + 200);
  };
  if (b && b.width > 2 && getComputedStyle(src).opacity !== '0'){
    const rig = mk('div', 'rk-sky gold'); rig.setAttribute('aria-hidden', 'true'); root.appendChild(rig);
    fly = goldRocket(src, rig, 'au', false);
    fly.style.left = b.left + 'px'; fly.style.top = b.top + 'px'; fly.style.width = b.width + 'px'; fly.style.height = b.height + 'px';
    const puff = mk('span', 'puff'), ps = b.width * 2.2;
    puff.style.left = (b.left + b.width / 2 - ps / 2) + 'px'; puff.style.top = (b.top + b.height * .7 - ps / 2) + 'px'; puff.style.width = ps + 'px'; puff.style.height = ps + 'px';
    rig.append(puff, fly);
    puff.animate([{opacity: 0, transform: 'scale(.3)'}, {opacity: 1, transform: 'scale(.8)', offset: .25}, {opacity: 0, transform: 'scale(1.6)'}], {duration: 650, easing: 'ease-out', fill: 'forwards'});
    dx = innerWidth / 2 - (b.left + b.width / 2); dy = innerHeight * .46 - (b.top + b.height / 2);
    trackGold(fly);
    fly.animate([{transform: 'translate(0px,0px) rotate(0deg)'}, {transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(-45deg)'}], {duration: 720, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards'}).finished.then(() => { try { climb(); } catch (e) { sky.boost(0); if (fly) fly.style.visibility = 'hidden'; say(); setTimeout(() => fadeOut(640), 4500); } });   // v2.23: never strand the rocket
  } else { JayRain.gold({lock: true}); setTimeout(climb, 160); }
}
function showPad(){
  const pad = document.querySelector('.pad'); if (!pad) return;
  pad.classList.add('in'); if (!goldNow()) pad.querySelectorAll('button').forEach(revealTap); syncPad();
}
function applyGold(){
  if (goldBusy) return; goldBusy = true;
  try {
    const pad = document.querySelector('.pad'); if (!pad) return;
    const on = goldNow();
    if (on && !goldLatch){ idle(); pad.querySelectorAll('button').forEach(gateTap); }
    else if (!on && goldLatch && pad.classList.contains('in')) pad.querySelectorAll('button').forEach(revealTap);
    goldLatch = on;
    if (pad.classList.contains('off') !== on) pad.classList.toggle('off', on);
    if (on){ pad.setAttribute('aria-hidden', 'true'); pad.setAttribute('inert', ''); }
    else { pad.removeAttribute('aria-hidden'); pad.removeAttribute('inert'); }
  } finally { goldBusy = false; }
}
function armGold(){
  if (armGold.done || !window.JayRain) return; armGold.done = true;
  const g = JayRain.gold, off = JayRain.goldOff;
  if (typeof g === 'function') JayRain.gold = function (){ const r = g.apply(this, arguments); applyGold(); return r; };
  if (typeof off === 'function') JayRain.goldOff = function (){ const r = off.apply(this, arguments); applyGold(); return r; };
  applyGold();
}
{
  const pad = document.querySelector('.pad');
  if (pad) pad.querySelectorAll('button').forEach(gateTap);
  if (pad) pad.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; press(b.getAttribute('data-k'), false); });
  addEventListener('keydown', e => {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey || lock) return;
    if (typing() || goldNow()) return;
    const inPad = e.target && e.target.closest && e.target.closest('.pad');
    if (inPad && (e.key === 'Enter' || e.key === ' ')) return;
    let k = KEY[e.key] || '';
    if (!k && e.key === 'Enter') k = 'enter';
    else if (!k && e.key.length === 1) k = e.key.toLowerCase();
    if (k && press(k, true)) e.preventDefault();
  });
  if (pad){ const mo = new MutationObserver(applyGold); mo.observe(document.documentElement, {attributes: true, attributeFilter: ['class']}); mo.observe(document.body, {attributes: true, attributeFilter: ['class'], subtree: true}); }
  document.addEventListener('DOMContentLoaded', armGold);
  applyGold();
}
placeCable(); addEventListener('resize', placeCable); if (window.ResizeObserver) new ResizeObserver(placeCable).observe(form); if (document.fonts) document.fonts.ready.then(placeCable);
const chgStep = () => { const v = emailIn.value, n = String(looksDone() ? 3 : v.includes('@') ? 2 : v.length ? 1 : 0); if (form.dataset.chg !== n) form.dataset.chg = n; };
const syncOk = () => { const ok = looksDone(); form.classList.toggle('ok', ok); form.classList.toggle('gold-ok', ok); chgStep(); };
['input', 'change', 'keyup'].forEach(ev => emailIn.addEventListener(ev, syncOk)); addEventListener('pageshow', syncOk); syncOk();
const HEART = {pop: 300, hold: 160, burn: 950, emberEvery: 40, textLead: 150};
const HEART_D = 'M16 29C16 29 3 20.5 3 11.5C3 7 6.5 4 10.5 4C13 4 15 5.5 16 7.5C17 5.5 19 4 21.5 4C25.5 4 29 7 29 11.5C29 20.5 16 29 16 29Z';
const HEART_FILL = {'h-t': ['#5FD6DA', '#1AADB3', '#0E7C81'], 'h-o': ['#FFF1A6', '#FFD700', '#C99A00'], 'h-h': ['#FFFFFF', '#FFF6C2', '#FFE066']};
const heartSvg = k => { const [a, b, c] = HEART_FILL[k];
  return `<svg class="${k}" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><defs><linearGradient id="hg-${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><path d="${HEART_D}" fill="url(#hg-${k})"/>` +
    (k === 'h-h' ? '' : '<path d="M8.6 8.7C7 9.6 6.1 11 6.1 12.8" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.9" stroke-linecap="round"/>') + '</svg>'; };
const burnHeart = hb => new Promise(done => {
  const [teal, orange, hot] = hb.querySelectorAll('svg');
  state.heart = {phase: 'pop', t0: performance.now()};
  const finish = () => { hb.classList.add('lit'); state.heart.phase = 'lit'; state.heart.took = Math.round(performance.now() - state.heart.t0); };
  if (!hb.animate){ finish(); return done(); }
  if (reduced){
    state.heart.phase = 'fade';
    orange.style.clipPath = 'none';
    orange.animate([{opacity: 0}, {opacity: 1}], {duration: 420, fill: 'both'});
    teal.animate([{opacity: 1}, {opacity: 0}], {duration: 420, fill: 'forwards'}).finished.then(() => { finish(); done(); });
    return;
  }
  hb.animate([{opacity: 0, transform: 'scale(.4) translateY(4px)'}, {opacity: 1, transform: 'none'}], {duration: HEART.pop, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards'});
  const start = HEART.pop + HEART.hold, opt = {duration: HEART.burn, delay: start, easing: 'linear', fill: 'both'};
  orange.animate([{clipPath: 'inset(100% 0 0 0)'}, {clipPath: 'inset(0% 0 0 0)'}], opt);
  hot.animate([{clipPath: 'inset(92% 0 -4% 0)', opacity: 0}, {opacity: 1, offset: .1}, {opacity: 1, offset: .82}, {clipPath: 'inset(-8% 0 96% 0)', opacity: 0}], opt);
  teal.animate([{opacity: 1}, {opacity: 0}], {duration: 220, delay: start + HEART.burn - 180, fill: 'both'});
  hb.animate([{filter: `drop-shadow(0 0 5px rgba(${getComputedStyle(document.documentElement).getPropertyValue('--c-rgb')},.85))`}, {filter: 'drop-shadow(0 0 8px rgba(255,236,150,.95))', offset: .6}, {filter: 'drop-shadow(0 0 5px rgba(255,215,0,.75))'}], opt);
  const t0 = performance.now(); let last = 0, raf = 0;
  const embers = now => {
    const p = (now - t0 - start)/HEART.burn;
    if (p >= 0 && p <= 1 && now - last >= HEART.emberEvery){
      last = now; state.heart.phase = 'burn';
      const s = hb.getBoundingClientRect().width, y = (1 - p)*s*.84 + s*.08, half = p < .75 ? .42 : .42 - (p - .75)*.9;
      const e = mk('span', Math.random() < .25 ? 'em hot' : 'em'); e.textContent = rg();
      const x = s*(.5 + (Math.random()*2 - 1)*Math.max(.12, half));
      hb.appendChild(e);
      e.animate([{transform: `translate(${x}px,${y}px) scale(1)`, opacity: .95}, {transform: `translate(${x + (Math.random() - .5)*10}px,${y - 10 - Math.random()*16}px) scale(.6)`, opacity: 0}], {duration: 420 + Math.random()*320, easing: 'ease-out', fill: 'both'}).finished.then(() => e.remove());
    }
    if (p < 1) raf = requestAnimationFrame(embers);
  };
  raf = requestAnimationFrame(embers);
  setTimeout(done, start + HEART.burn - HEART.textLead);
  setTimeout(finish, start + HEART.burn + 60);
});
const LIFTOFF = {turn: 180, climbMin: 820, climbMax: 1100, perPx: 1, wakeEvery: 26, puff: 650, goldPer: 4, goldHot: .35,
  burn: 420, plume: 16, plumeMs: 1500};
const launchRocket = () => new Promise(done => {
  const btn = form.querySelector('.rkb'), svg = btn && btn.querySelector('.rk');
  state.rocket = {phase: 'turn', t0: performance.now()};
  if (!svg) return done();
  if (reduced || !svg.animate){
    state.rocket.phase = 'fade';
    const f = svg.animate ? svg.animate([{opacity: 1}, {opacity: 0}], {duration: 220, fill: 'forwards'}) : null;
    return f ? f.finished.then(() => { state.rocket.phase = 'gone'; done(); }) : done();
  }
  const r = btn.getBoundingClientRect(), sky = mk('div', 'rk-sky gold'); sky.setAttribute('aria-hidden', 'true'); document.body.appendChild(sky);
  Object.assign(svg.style, {left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px'});
  sky.appendChild(svg);
  trackGold(svg);
  const dist = r.bottom + r.height*2.5 + 40;
  const climb = Math.round(Math.min(LIFTOFF.climbMax, Math.max(LIFTOFF.climbMin, dist*LIFTOFF.perPx)));
  const puff = mk('span', 'puff'), ps = r.width*2.2;
  Object.assign(puff.style, {left: (r.left + r.width/2 - ps/2) + 'px', top: (r.top + r.height*.7 - ps/2) + 'px', width: ps + 'px', height: ps + 'px'});
  sky.insertBefore(puff, svg);
  puff.animate([{opacity: 0, transform: 'scale(.3)'}, {opacity: 1, transform: 'scale(.8)', offset: .25}, {opacity: 0, transform: 'scale(1.6)'}], {duration: LIFTOFF.puff, delay: LIFTOFF.turn*.6, easing: 'ease-out', fill: 'both'});
  const au = goldRocket(svg, sky, 'au', false), band = goldRocket(svg, sky, 'au-band', true);
  const cut = u => `polygon(-200% ${-200 - u}%, 300% ${300 - u}%, 300% 400%, -200% 400%)`;
  const strip = u => `polygon(-200% ${-200 - u}%, 300% ${300 - u}%, 300% ${314 - u}%, -200% ${-186 - u}%)`;
  const burnOpt = {duration: LIFTOFF.burn, easing: 'cubic-bezier(.35,.1,.5,1)', fill: 'both'};
  au.animate([{clipPath: cut(-100)}, {clipPath: cut(100)}], burnOpt);
  band.animate([{clipPath: strip(-100), opacity: 0}, {opacity: 1, offset: .12}, {opacity: 1, offset: .8}, {clipPath: strip(114), opacity: 0}], burnOpt);
  state.rocket.gold = 'burning';
  setTimeout(() => { svg.style.opacity = '0'; band.remove(); state.rocket.gold = 'gold'; }, LIFTOFF.burn + 20);
  const both = (kf, o) => [svg, au, band].map(e => e.isConnected ? e.animate(kf, o) : null)[0];
  const plume = () => { const px = r.left + r.width/2, py = r.bottom + r.height*.15, base = r.width;
    for (let i = 0; i < LIFTOFF.plume; i++){
      const side = i % 2 ? 1 : -1, k = (i >> 1)/(LIFTOFF.plume/2), s = base*(.9 + Math.random()*.9), e = mk('span', i < 3 ? 'plm au' : Math.random() < .35 ? 'plm g' : 'plm');
      const x0 = px - s/2 + side*base*.1, y0 = py - s/2, dx = side*base*(.6 + k*2.4 + Math.random()*.6), dy = -base*(.1 + Math.random()*.45) - k*base*.2;
      Object.assign(e.style, {width: s + 'px', height: s + 'px'}); e.style.transform = `translate(${x0}px,${y0}px) scale(.3)`; sky.insertBefore(e, svg);
      e.animate([{transform: `translate(${x0}px,${y0}px) scale(.3)`, opacity: 0}, {opacity: .9, offset: .18}, {transform: `translate(${x0 + dx}px,${y0 + dy}px) scale(${1.8 + k*1.4})`, opacity: 0}],
        {duration: LIFTOFF.plumeMs*(.75 + Math.random()*.4), delay: LIFTOFF.turn*.7 + k*140, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'}).finished.then(() => e.remove(), () => {});
    } };
  plume();
  const turn = both([{transform: 'rotate(0deg)'}, {transform: 'rotate(-45deg)'}], {duration: LIFTOFF.turn, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'forwards'});
  turn.finished.then(() => {
    state.rocket.phase = 'climb'; state.rocket.climb = climb; state.rocket.dist = Math.round(dist);
    form.inert = true; form.classList.add('gone');
    const fly = both([{transform: 'translateY(0) rotate(-45deg)'}, {transform: `translateY(${-dist}px) rotate(-45deg)`}], {duration: climb, easing: 'cubic-bezier(.5,0,.85,.35)', fill: 'forwards'});
    let lastWake = 0, raf = 0;
    const wake = now => {
      if (now - lastWake >= LIFTOFF.wakeEvery){
        lastWake = now;
        const b = svg.getBoundingClientRect();
        if (b.bottom > -40) for (let g = 0; g < LIFTOFF.goldPer; g++){
          const w = mk('span', Math.random() < LIFTOFF.goldHot ? 'wk hot' : 'wk'); w.textContent = rg();
          const x = b.left + b.width/2 + (Math.random() - .5)*b.width*.35, y = b.bottom + b.height*.35;
          w.style.transform = `translate(${x}px,${y}px)`; sky.appendChild(w);
          const dx = (Math.random() - .5)*34, dy = 26 + Math.random()*46;
          w.animate([{transform: `translate(${x}px,${y}px) scale(1)`, opacity: .95}, {transform: `translate(${x + dx}px,${y + dy}px) scale(.7)`, opacity: 0}], {duration: 640 + Math.random()*420, easing: 'ease-out', fill: 'forwards'}).finished.then(() => w.remove());
        }
      }
      raf = requestAnimationFrame(wake);
    };
    raf = requestAnimationFrame(wake);
    fly.finished.then(() => {
      cancelAnimationFrame(raf); svg.style.visibility = 'hidden'; au.style.visibility = 'hidden'; state.rocket.phase = 'gone'; state.rocket.took = Math.round(performance.now() - state.rocket.t0);
      setTimeout(() => sky.remove(), 1600);
      done();
    });
  });
});
const FAIL = {reducedMs: 360, turn: 180, swirlMin: 1150, swirlMax: 1450, swirlPerPx: .7, dive: 700, crash: 340, back: 280, wakeEvery: 34, smokeEvery: 22};
function failLiftoff(){
  const btn = form.querySelector('.rkb'), svg = btn && btn.querySelector('.rk'), fl = svg && svg.querySelector('.rk-fl');
  if (!fl || !svg.animate || form.classList.contains('gone') || btn.disabled) return;
  const f = state.fail = state.fail || {count: 0, ignored: 0};
  if (f.playing){ f.ignored++; return; }
  f.playing = true; f.count++; f.t0 = performance.now(); f.phase = 'turn';
  failAnnounce();
  if (reduced){
    failGlow(0, true);
    const end = () => { f.playing = false; f.phase = 'idle'; f.took = Math.round(performance.now() - f.t0); };
    fl.animate([{opacity: .85}, {opacity: .25, offset: .3}, {opacity: 1, offset: .6}, {opacity: .85}], {duration: FAIL.reducedMs, easing: 'linear'}).finished.then(end, end);
    return;
  }
  const r = btn.getBoundingClientRect(), W = innerWidth, H = innerHeight, sz = r.width, S = [r.left + sz/2, r.top + r.height/2];
  const sky = mk('div', 'rk-sky fake'); sky.setAttribute('aria-hidden', 'true'); document.body.appendChild(sky);
  const ghost = svg.cloneNode(true); ghost.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
  Object.assign(ghost.style, {left: r.left + 'px', top: r.top + 'px', width: sz + 'px', height: r.height + 'px', transformOrigin: '50% 50%'}); sky.appendChild(ghost);
  svg.style.transition = 'none'; svg.style.opacity = '0';
  const Lx = Math.max(sz, S[0] - .8*Math.min(W, 700)), Rx = Math.min(W - sz, S[0] + .35*Math.min(W, 700)), Ty = .12*H, By = .56*H;
  const at = (u, v) => [Lx + u*(Rx - Lx), Ty + v*(By - Ty)];
  const lift = [S[0], S[1] - Math.min(.2*H, 170)];
  const P0 = [S, lift, at(.8, .05), at(.2, .12), at(.05, .6), at(.5, .85), at(.85, .45), at(.55, .15), [W*.78, H*.6], [W - sz*.35, H - sz*.35]];
  const cr = (p0, p1, p2, p3, t) => { const t2 = t*t, t3 = t2*t; return [0, 1].map(k => .5*((2*p1[k]) + (-p0[k] + p2[k])*t + (2*p0[k] - 5*p1[k] + 4*p2[k] - p3[k])*t2 + (-p0[k] + 3*p1[k] - 3*p2[k] + p3[k])*t3)); };
  const sample = P => {
    const pts = [], seg = [];
    for (let i = 0; i < P.length - 1; i++){ const p0 = P[Math.max(0, i - 1)], p3 = P[Math.min(P.length - 1, i + 2)]; seg[i] = pts.length; for (let j = 0; j < 40; j++) pts.push(cr(p0, P[i], P[i + 1], p3, j/40)); }
    pts.push(P[P.length - 1]);
    const len = [0]; for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return {P, pts, seg, len};
  };
  const clock = sample(P0);
  const swirl = Math.round(Math.min(FAIL.swirlMax, Math.max(FAIL.swirlMin, clock.len[clock.seg[7]]*FAIL.swirlPerPx)));
  const R = (a, b) => a + Math.random()*(b - a), m = sz*.6, ce = sz*.35;
  const box = emailIn.getBoundingClientRect(), bp = sz*.75;
  let last = null; try { last = sessionStorage.getItem('jtn.failCorner'); } catch (e) {}
  const top = /^[tb][lr]$/.test(last || '') ? last[0] === 'b' : Math.random() < .5, left = Math.random() < .5, corner = (top ? 't' : 'b') + (left ? 'l' : 'r');
  const zw = Math.min(360, Math.max(2.5*sz, .3*W)), zh = Math.min(320, Math.max(2.5*sz, .35*H)), off = sz*1.1;
  const inZone = (x, y) => (left ? x < zw : x > W - zw) || (top ? y < zh : y > H - zh);
  const ex = a => left ? a : W - a, ey = a => top ? a : H - a;
  const exitAt = () => Math.random() < .5
    ? {T: [ex(R(-off*.3, zw - sz)), ey(-off)], edge: top ? 'top' : 'bottom'}
    : {T: [ex(-off), ey(R(-off*.3, zh - sz*.5))], edge: left ? 'left' : 'right'};
  const onScr = (x, y) => x >= sz*.3 && x <= W - sz*.3 && y >= sz*.3 && y <= H - sz*.3;
  const nearBox = (x, y) => x > box.left - bp && x < box.right + bp && y > box.top - bp && y < box.bottom + bp;
  const randomFlight = (T, edge) => {
    const lf = [S[0], S[1] - Math.min(R(.12, .3)*H, R(110, 230))];
    const loops = R(1, 2.5), dir = Math.random() < .5 ? 1 : -1, wob = R(.04, .16), k = Math.min(1, 1.6/(loops + .4));
    const rx = Math.min(R(.16, .3)*Math.min(W, 700)*k, (W - 2*m)/2 - 1), ry = Math.min(R(.09, .17)*H*k, (H - 2*m)/2 - 1);
    if (rx < sz || ry < sz) return null;
    const cx = R(m + rx, W - m - rx), cy = R(m + ry, H - m - ry);
    const a0 = Math.atan2((lf[1] - cy)/ry, (lf[0] - cx)/rx), n = Math.max(6, Math.round(loops*8)), L = [];
    for (let i = 0; i <= n; i++){ const a = a0 + dir*2*Math.PI*loops*i/n, q = 1 + (Math.random() - .5)*2*wob; L.push([cx + Math.cos(a)*rx*q, cy + Math.sin(a)*ry*q]); }
    const E = L[L.length - 1], dx = T[0] - E[0], dy = T[1] - E[1], bend = R(-.35, .35), at2 = R(.35, .7);
    const mid = [Math.min(W - m, Math.max(m, E[0] + dx*at2 - dy*bend)), Math.min(H - m, Math.max(m, E[1] + dy*at2 + dx*bend))];
    const c = sample([S, lf, ...L, mid, T]), d0 = c.seg[2 + n];
    for (let i = 0; i < c.pts.length; i++){ const [x, y] = c.pts[i];
      if (i < c.seg[1]){ if (x < S[0] - 2 && nearBox(x, y)) return null; continue; }
      if (nearBox(x, y) || (!onScr(x, y) && (i < d0 || !inZone(x, y)))) return null; }
    return Object.assign(c, {loops: +loops.toFixed(2), dir: dir > 0 ? 'cw' : 'ccw', edge, swirlEnd: 2 + n, wobAmp: R(2, 8), wobRate: R(26, 52)});
  };
  let fly = null, tries = 0;
  while (!fly && tries < 400){ tries++; const e = exitAt(); fly = randomFlight(e.T, e.edge); }
  if (!fly){
    fly = Object.assign(sample([...P0.slice(0, -2), [left ? W*.22 : W*.78, top ? H*.25 : H*.6], [ex(-off), ey(sz)]]), {loops: 1.5, dir: 'fixed', edge: left ? 'left' : 'right', swirlEnd: 7, wobAmp: 0, wobRate: 40});
  }
  try { sessionStorage.setItem('jtn.failCorner', corner); } catch (e) {}
  { const T = fly.pts[fly.pts.length - 1]; f.exit = {corner, last, edge: fly.edge, x: Math.round(T[0]), y: Math.round(T[1]), tries, fallback: fly.dir === 'fixed'}; }
  const {P, pts, len} = fly;
  const L7 = len[fly.seg[fly.swirlEnd]], Lend = len[len.length - 1];
  const tSwirl = FAIL.turn, tDive = tSwirl + swirl, tCrash = tDive + FAIL.dive, tBack = tCrash + FAIL.crash, tEnd = tBack + FAIL.back;
  const posAt = s => { let lo = 0, hi = len.length - 1; while (lo < hi){ const m = (lo + hi) >> 1; if (len[m] < s) lo = m + 1; else hi = m; } const i = Math.max(1, lo), k = (s - len[i - 1])/Math.max(1e-6, len[i] - len[i - 1]);
    return {x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0])*k, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1])*k, a: Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0])*180/Math.PI}; };
  const ease = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2;
  let rot = 0, lastWake = 0, lastSmoke = 0, raf = 0, crashed = false, done = false; const t0 = performance.now();
  const bit = (cls, x, y, size, kf, dur) => { const e = mk('span', cls); if (size) Object.assign(e.style, {width: size + 'px', height: size + 'px'}); e.style.transform = `translate(${x}px,${y}px)`; sky.appendChild(e);
    e.animate(kf, {duration: dur, easing: 'ease-out', fill: 'forwards'}).finished.then(() => e.remove(), () => {}); return e; };
  const finish = () => { if (done) return; done = true; cancelAnimationFrame(raf); f.playing = false; f.phase = 'idle'; f.abort = null; f.took = Math.round(performance.now() - f.t0); };
  const restore = () => { svg.style.transition = ''; svg.style.opacity = ''; };
  f.abort = () => { cancelAnimationFrame(raf); sky.remove(); restore(); svg.getAnimations().forEach(a => a.cancel()); glowStop(); finish(); f.aborted = (f.aborted || 0) + 1; };
  const frame = now => {
    const t = now - t0;
    let x = S[0], y = S[1], target = rot;
    if (t < tSwirl){ target = -45*ease(t/FAIL.turn); f.phase = 'turn'; }
    else if (t < tCrash){
      const diving = t >= tDive; f.phase = diving ? 'dive' : 'swirl';
      const s = diving ? L7 + (Lend - L7)*Math.pow((t - tDive)/FAIL.dive, 1.7) : L7*ease((t - tSwirl)/swirl);
      const p = posAt(Math.min(Lend, s)); x = p.x; y = p.y;
      let a = p.a + 45; while (a - rot > 180) a -= 360; while (a - rot < -180) a += 360;
      target = a + (diving ? Math.sin(t/38)*7 : Math.sin(t/fly.wobRate)*fly.wobAmp);
      if (diving && !ghost.classList.contains('sput')) ghost.classList.add('sput');
      const hd = (rot - 45)*Math.PI/180, tx = x - Math.cos(hd)*sz*.42, ty = y - Math.sin(hd)*sz*.42;
      if (!diving && now - lastWake >= FAIL.wakeEvery){ lastWake = now;
        const dx = -Math.cos(hd)*30 + (Math.random() - .5)*20, dy = -Math.sin(hd)*30 + (Math.random() - .5)*20;
        const w = bit(Math.random() < .22 ? 'wk hot' : 'wk', tx, ty, 0, [{transform: `translate(${tx}px,${ty}px) scale(1)`, opacity: .95}, {transform: `translate(${tx + dx}px,${ty + dy}px) scale(.7)`, opacity: 0}], 560 + Math.random()*300); w.textContent = rg(); }
      if (diving && now - lastSmoke >= FAIL.smokeEvery){ lastSmoke = now;
        const k = sz*(.45 + Math.random()*.35);
        bit(Math.random() < .3 ? 'smk grey' : 'smk', tx - k/2, ty - k/2, k, [{transform: `translate(${tx - k/2}px,${ty - k/2}px) scale(.35)`, opacity: .9}, {transform: `translate(${tx - k/2 + (Math.random() - .5)*16}px,${ty - k/2 - 10 - Math.random()*14}px) scale(1.7)`, opacity: 0}], 700 + Math.random()*350); }
    } else {
      const p = posAt(Lend); x = p.x; y = p.y;
      if (!crashed){ crashed = true; f.phase = 'crash';
        const cx = Math.max(18, Math.min(W - 18, x)), cy = Math.max(18, Math.min(H - 18, y)), ai = Math.atan2(H/2 - cy, W/2 - cx);
        ghost.animate([{opacity: 1}, {opacity: 0}], {duration: 110, fill: 'forwards'});
        const fb = sz*1.6; bit('smk hot', cx - fb/2, cy - fb/2, fb, [{transform: `translate(${cx - fb/2}px,${cy - fb/2}px) scale(.3)`, opacity: 1}, {transform: `translate(${cx - fb/2}px,${cy - fb/2}px) scale(1.2)`, opacity: 0}], 380);
        for (let i = 0; i < 6; i++){ const a = ai - Math.PI/4 + Math.PI*.5*i/5 + (Math.random() - .5)*.3, d = sz*(.5 + Math.random()*.5), k = sz*(.7 + Math.random()*.5);
          bit(i % 3 ? 'smk' : 'smk grey', cx - k/2, cy - k/2, k, [{transform: `translate(${cx - k/2}px,${cy - k/2}px) scale(.3)`, opacity: .95}, {transform: `translate(${cx - k/2 + Math.cos(a)*d}px,${cy - k/2 + Math.sin(a)*d}px) scale(1.5)`, opacity: 0}], 620 + Math.random()*260); }
        for (let i = 0; i < 5; i++){ const a = ai + Math.PI*(.4*Math.random() - .2), d = sz*(.8 + Math.random()*.9);
          const e = bit('spk', cx, cy, 0, [{transform: `translate(${cx}px,${cy}px)`, opacity: 1}, {transform: `translate(${cx + Math.cos(a)*d}px,${cy + Math.sin(a)*d}px)`, opacity: 0}], 420 + Math.random()*200); e.textContent = rg(); }
      }
      if (t >= tBack && svg.style.opacity === '0'){ f.phase = 'back'; restore();
        svg.animate([{transform: 'scale(.55)', opacity: 0}, {transform: 'scale(1.08)', opacity: 1, offset: .7}, {transform: 'none'}], {duration: FAIL.back, easing: 'ease-out'}); }
      if (t >= tEnd){ finish(); setTimeout(() => sky.remove(), 900); return; }
    }
    rot += (target - rot)*(t < tSwirl ? 1 : .35);
    ghost.style.transform = `translate(${x - S[0]}px,${y - S[1]}px) rotate(${rot}deg)`;
    raf = requestAnimationFrame(frame);
  };
  f.plan = {swirl, total: tEnd, pathPx: Math.round(Lend), crash: P[P.length - 1].map(Math.round), loops: fly.loops, dir: fly.dir, edge: fly.edge, tries, glowAt: Math.round(tCrash - GLOW.lead*GLOW.pulseMs), glowEnd: Math.round(tCrash - GLOW.lead*GLOW.pulseMs + GLOW.pulses*GLOW.pulseMs), crashAt: tCrash};
  failGlow(tCrash - GLOW.lead*GLOW.pulseMs, true);
  raf = requestAnimationFrame(frame);
}
const GLOW = {pulses: 7, lead: 1.5, pulseMs: 500, reducedMs: 700, reducedPeak: .55};
let glowRaf = 0, glowFocusing = false;
const glowSet = g => {
  if (g <= 0){ ['--eg-c', '--eg-pc', '--eg-s'].forEach(p => emailIn.style.removeProperty(p)); if (!emailIn.style.length) emailIn.removeAttribute('style'); return; }
  const TR = getComputedStyle(document.documentElement).getPropertyValue('--c-rgb').split(',').map(Number), TS = TR.join(',');
  const mix = a => a.map((v, i) => Math.round(v + (TR[i] - v)*g)).join(',');
  const rs = getComputedStyle(document.documentElement), FG = rs.getPropertyValue('--fg-rgb').split(',').map(Number), INK = rs.getPropertyValue('--ink-rgb').split(',').map(Number);
  emailIn.style.setProperty('--eg-c', `rgb(${mix(FG)})`);
  emailIn.style.setProperty('--eg-pc', `rgba(${mix(INK)},${(.34 + .66*g).toFixed(3)})`);
  emailIn.style.setProperty('--eg-s', `0 0 ${(3 + 7*g).toFixed(1)}px rgba(${TS},${(.95*g).toFixed(3)}),0 0 ${(10 + 12*g).toFixed(1)}px rgba(${TS},${(.6*g).toFixed(3)})`);
};
const glowStop = () => { if (glowRaf){ cancelAnimationFrame(glowRaf); glowRaf = 0; if (state.fail) state.fail.glow = 'stopped'; } glowSet(0); };
let failPointer = '';
form.querySelector('button').addEventListener('pointerdown', e => { failPointer = e.pointerType || ''; }, {passive: true});
emailIn.addEventListener('keydown', e => { if (e.key === 'Enter') failPointer = ''; });
const touchish = () => failPointer === 'touch' || failPointer === 'pen' || matchMedia('(pointer: coarse)').matches || matchMedia('(hover: none)').matches;
const glowFocus = () => {
  if (touchish()) return;
  const a = document.activeElement;
  if (form.classList.contains('gone') || (a && a !== document.body && a !== form.querySelector('button'))) return;
  glowFocusing = true; emailIn.focus({preventScroll: true}); glowFocusing = false;
};
function failGlow(startIn, focusAfter){
  glowStop(); const f = state.fail, t0 = performance.now() + Math.max(0, startIn), dur = reduced ? GLOW.reducedMs : GLOW.pulses*GLOW.pulseMs;
  f.glow = 'wait';
  const step = now => {
    const t = now - t0;
    if (t >= dur){ glowRaf = 0; glowSet(0); f.glow = 'done'; if (focusAfter) glowFocus(); return; }
    if (t >= 0){ f.glow = 'on'; glowSet(reduced ? GLOW.reducedPeak*Math.sin(Math.PI*t/dur) : Math.pow(Math.sin(Math.PI*(t % GLOW.pulseMs)/GLOW.pulseMs), 2)); }
    glowRaf = requestAnimationFrame(step);
  };
  glowRaf = requestAnimationFrame(step);
}
emailIn.addEventListener('input', glowStop);
emailIn.addEventListener('pointerdown', glowStop);
emailIn.addEventListener('focus', () => { if (!glowFocusing) glowStop(); });
const failNoteEl = mk('span', 'sr'); failNoteEl.setAttribute('aria-live', 'polite'); form.appendChild(failNoteEl);
const failAnnounce = () => { emailIn.setAttribute('aria-invalid', 'true'); failNoteEl.textContent = ''; requestAnimationFrame(() => { failNoteEl.textContent = COPY.failNote; }); };
const failClear = () => { emailIn.removeAttribute('aria-invalid'); failNoteEl.textContent = ''; };
emailIn.addEventListener('input', () => { if (emailIn.hasAttribute('aria-invalid')) failClear(); });
const kbSettle = () => new Promise(res => {
  const had = document.activeElement === emailIn; if (had) emailIn.blur();
  if (!had || !touchish()) return res();
  const vv = window.visualViewport; let seen = false, quiet = 0, done = false;
  const fin = () => { if (done) return; done = true; clearTimeout(quiet); clearTimeout(first); clearTimeout(cap); if (vv){ vv.removeEventListener('resize', ev); vv.removeEventListener('scroll', ev); } requestAnimationFrame(() => res()); };
  const ev = () => { seen = true; clearTimeout(quiet); quiet = setTimeout(fin, 90); };
  const first = setTimeout(() => { if (!seen) fin(); }, 300), cap = setTimeout(fin, 700);
  if (vv){ vv.addEventListener('resize', ev); vv.addEventListener('scroll', ev); }
});
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!looksDone()){ syncOk(); if (touchish() && document.activeElement === emailIn){ kbSettle().then(failLiftoff); return; } failLiftoff(); return; }
  if (state.fail && state.fail.abort) state.fail.abort(); glowStop(); failClear();
  const btn = form.querySelector('button'); btn.disabled = true;
  form.classList.add('ign');
  const title = document.querySelector('.mast .pages');
  if (title) title.classList.add('gld');
  const settled = kbSettle();
  /* v1.67 (jay 2026.10.03): free ref tracking (buttondown metadata, no paid tags): tag=site always stays, a ?ref= ADDS a second tag (was: replaced site),
     metadata__ref = the ref (else "site"), metadata__page = the path. no email or other PII */
  { const r = (window.JayRain && JayRain.ref && JayRain.ref()) || '', tg = form.querySelector('input[name=tag]');
    if (tg) tg.value = 'site'; form.querySelectorAll('input[data-ref-tag]').forEach(x => x.remove());
    if (r && r !== 'site' && tg){ const x = mk('input'); x.type = 'hidden'; x.name = 'tag'; x.value = r; x.dataset.refTag = ''; tg.after(x); }
    const mr = form.querySelector('input[name=metadata__ref]'), mp = form.querySelector('input[name=metadata__page]');
    if (mr) mr.value = r || 'site'; if (mp) mp.value = (location.pathname || '/').replace(/[^a-z0-9\/._-]/gi, '').slice(0, 80) || '/'; }
  try { const res = await fetch(form.action, {method: 'POST', mode: 'cors', body: new FormData(form)}); if (!res.ok) throw new Error(res.status); }
  catch (err) { form.classList.remove('ign'); btn.disabled = false; form.submit(); return; }
  await settled;
  { const r = (window.JayRain && JayRain.ref && JayRain.ref()) || '';   // v1.65: GA4 sign_up as the rocket lifts off (no email, only the ?ref= tag)
    if (typeof gtag === 'function') gtag('event', 'sign_up', r ? {method: 'email', ref: r} : {method: 'email'}); }
  await launchRocket();
  form.inert = true; form.classList.add('gone');
  statusEl.textContent = COPY.thanks;
  statusEl.tabIndex = -1; statusEl.style.outline = 'none'; statusEl.focus({preventScroll: true});
  { const r = statusEl.getBoundingClientRect(); JayRain.gold({ms: 1700, y: (r.top + r.bottom)/2, lock: true}); }
});

showPad();
armGold();
})();
