/* Fixed-frame graph. Nodes are anonymous ids. Nothing in the file is labeled.
   The camera does not orbit, zoom, or pan. Spin comes from the keys below. */

import * as THREE from 'three';
import { layout } from './layout.js';
import { CLASS_RGB, GOLD_RGB, presentClasses, pulseHubs } from './palette.js';
import {
  BURST_MS, BURST_REDUCED_MS, advanceWave, autoSpin, controlView, createPad, gesturesAllowed,
  keyboardPress, padTone, padVisible, playDuration, playFrame, pointScaleFor, pressPad, releasePad,
  revealAllowed, shaking, shouldCelebrate, speedOf, spinSign
} from './gate.js?v=15';
import {
  DISCLOSURE, UNLOCK_ENABLED, buildClientPing, disclosureNeeded, maybeNotify
} from './unlock-client.js';

const ROOT = new Set(['v', 'nodes', 'links']);
const NODE = new Set(['id', 'g']);
const LINK = new Set(['s', 't']);

const host = document.getElementById('graph');
const padEl = document.querySelector('.pad');
const arrowEl = document.querySelector('.brain-next');
const nowEl = document.getElementById('now');
const statusEl = document.getElementById('brain-status');
const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduceMotion = motionQuery.matches;
const stillParam = new URLSearchParams(location.search).get('still');
const stillTime = stillParam == null || stillParam === '' || Number.isNaN(Number(stillParam)) ? null : Number(stillParam);

let pad = createPad();
let revealed = false;
let opened = false;
let noted = false;
let celebrated = false;
let controlsGone = false;
let scrollBase = 0;
let badTimer = 0;
let retireTimer = 0;

function refuse() {
  throw new Error('graph.json has a field this mock will not draw');
}

function assertGraph(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) refuse();
  for (const key of Object.keys(data)) if (!ROOT.has(key)) refuse();
  if (data.v !== 1 || !Array.isArray(data.nodes) || !Array.isArray(data.links)) refuse();
  const ids = new Set();
  for (const node of data.nodes) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) refuse();
    for (const key of Object.keys(node)) if (!NODE.has(key)) refuse();
    if (!Number.isInteger(node.id) || node.id < 0 || ids.has(node.id)) refuse();
    ids.add(node.id);
    if (node.g != null && (!Number.isInteger(node.g) || node.g < 0 || node.g > 3)) refuse();
  }
  for (const link of data.links) {
    if (!link || typeof link !== 'object' || Array.isArray(link)) refuse();
    for (const key of Object.keys(link)) if (!LINK.has(key)) refuse();
    if (!Number.isInteger(link.s) || !Number.isInteger(link.t)) refuse();
    if (link.s === link.t || !ids.has(link.s) || !ids.has(link.t)) refuse();
  }
}

function toLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function linear(rgb) {
  return rgb.map(toLinear);
}

function towardWhite(rgb, amount) {
  return rgb.map((channel) => channel + (1 - channel) * amount);
}

const HUB_TRAVEL = [2.7, 3.15, 3.55, 2.9, 3.85, 3.3, 2.5, 3.65, 3.05];
const HUB_REST = 1;
const HUBS = 9;

function phase(n) {
  let x = Math.imul(n + 1, 374761393);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296 * Math.PI * 2;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.16, 'rgba(255,255,255,0.9)');
  grd.addColorStop(0.36, 'rgba(255,255,255,0.22)');
  grd.addColorStop(0.62, 'rgba(255,255,255,0.05)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const RIPPLE = `
const int HUBS = 9;
uniform vec3 uHubPos[HUBS];
uniform vec3 uHubColor[HUBS];
uniform float uHubOffset[HUBS];
uniform float uHubTravel[HUBS];
uniform float uHubOn[HUBS];
uniform float uHubAmp[HUBS];
uniform float uReach;
uniform float uShell;
uniform float uRest;
uniform highp float uGoldPulse;
uniform highp vec3 uGoldColor;
vec3 rippleGlow(vec3 p) {
  float radius = length(p);
  float shellFade = 1.0 - smoothstep(uShell * 0.66, uShell * 0.82, radius);
  if (shellFade <= 0.0) return vec3(0.0);
  vec3 sum = vec3(0.0);
  for (int i = 0; i < HUBS; i++) {
    float travelT = max(uHubTravel[i], 0.001);
    float local = mod(uTime + uHubOffset[i], travelT + uRest);
    float firing = (1.0 - step(travelT, local)) * uHubOn[i] * uHubAmp[i];
    float u = clamp(local / travelT, 0.0, 1.0);
    float d = distance(p, uHubPos[i]);
    float nucleus = exp(-pow(d / 4.6, 2.0)) * (1.0 - smoothstep(0.0, 0.45, u)) * 2.8;
    float bloomR = mix(3.5, max(uReach, 3.5), u);
    float bloom = exp(-pow(d / bloomR, 2.0)) * (1.0 - smoothstep(0.12, 1.0, u)) * 0.85;
    vec3 fire = uGoldPulse > 0.5 ? uGoldColor : uHubColor[i];
    sum += fire * (nucleus + bloom) * firing;
  }
  return sum * shellFade;
}
`;

const STAGE = `
uniform float uExplodeTime;
uniform float uTravel;
uniform float uRebuild;
uniform float uAppearFront;
uniform float uAppearBand;
uniform float uExplodeDist;
uniform float uShake;
vec3 shaken(vec3 home) {
  if (uShake < 0.5) return home;
  float len = max(length(home), 0.001);
  float seed = fract(sin(dot(home, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
  float t = uTime * 16.0 + seed * 6.28318;
  vec3 wob = vec3(sin(t), sin(t * 1.31 + 1.7), sin(t * 0.87 + 3.4));
  vec3 p = home + wob * (len * 0.2);
  float plen = length(p);
  if (plen > len) p *= len / plen;
  return p;
}
vec3 flown(vec3 home) {
  vec3 base = shaken(home);
  if (uTravel < 0.001) return base;
  vec3 dir = base / max(length(base), 0.001);
  return base + dir * smoothstep(0.0, 1.0, uTravel) * uExplodeDist;
}
float shown(vec3 home) {
  if (uRebuild < 0.5) {
    if (uExplodeTime < 0.001) return 1.0;
    return 1.0 - smoothstep(0.25, 0.92, uExplodeTime);
  }
  float t = clamp((uAppearFront - length(home)) / max(uAppearBand, 0.001), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
`;

const GOLD_AT = `
uniform float uGoldFront;
uniform float uGoldBand;
uniform float uGoldLock;
float goldAt(vec3 p) {
  if (uGoldLock > 0.5 || uGoldPulse > 0.5) return 1.0;
  float rad = length(p);
  float t = clamp((uGoldFront - rad) / max(uGoldBand, 0.001), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}
`;

function pointMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader: `
      in float aSize;
      in float aPhase;
      in float aHub;
      in vec3 aColor;
      out vec3 vColor;
      uniform float uScale;
      uniform float uTime;
      uniform float uMotion;
      out float vShow;
      ${RIPPLE}
      ${GOLD_AT}
      ${STAGE}
      void main() {
        float g = goldAt(position);
        float wobble = sin(uTime * (0.48 + aHub * 0.4) + aPhase) * uMotion;
        vec3 glow = rippleGlow(position) * uMotion;
        float wave = max(glow.r, max(glow.g, glow.b));
        float pulse = 1.0 + ((0.028 + aHub * 0.075) * wobble + wave * 1.55);
        vec3 tinted = aColor * (0.94 + (0.06 + aHub * 0.1) * wobble) + glow;
        vColor = g >= 1.0 ? uGoldColor + glow : mix(tinted, uGoldColor, g);
        float show = shown(position);
        vShow = show;
        vec4 mv = modelViewMatrix * vec4(flown(position), 1.0);
        float size = aSize * pulse * uScale * show / -mv.z;
        gl_PointSize = show < 0.02 ? 0.0 : clamp(size, 1.0, 64.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform sampler2D uTex;
      in vec3 vColor;
      in float vShow;
      out vec4 fragColor;
      void main() {
        if (vShow < 0.02) discard;
        float a = texture(uTex, gl_PointCoord).a;
        fragColor = vec4(vColor * a, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false
  });
}

function linkMaterial(uniforms) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms,
    vertexShader: `
      in vec3 aOther;
      in float aSide;
      in float aAlong;
      in float aPhase;
      in float aGain;
      in vec3 aColor;
      out vec3 vColor;
      out float vSide;
      out float vAlong;
      out float vPhase;
      out float vGain;
      out float vGold;
      out vec3 vLocal;
      out vec3 vLocalOther;
      out float vShow;
      uniform float uWidth;
      uniform mediump float uTime;
      uniform highp float uGoldPulse;
      ${GOLD_AT}
      ${STAGE}
      void main() {
        float show = min(shown(position), shown(aOther));
        vShow = show;
        vec3 p = (modelViewMatrix * vec4(flown(position), 1.0)).xyz;
        vec3 q = (modelViewMatrix * vec4(flown(aOther), 1.0)).xyz;
        vec3 dir = q - p;
        float span = length(dir);
        dir = span > 0.0001 ? dir / span : vec3(1.0, 0.0, 0.0);
        vec3 view = length(p) > 0.0001 ? normalize(p) : vec3(0.0, 0.0, 1.0);
        vec3 side = cross(dir, view);
        float sl = length(side);
        side = sl > 0.001 ? side / sl : vec3(1.0, 0.0, 0.0);
        vec3 outP = p + side * aSide * uWidth;
        gl_Position = projectionMatrix * vec4(outP, 1.0);
        vColor = aColor;
        vSide = aSide;
        vAlong = aAlong;
        vPhase = aPhase;
        vGain = aGain;
        vGold = goldAt(position);
        vLocal = position;
        vLocalOther = aOther;
      }
    `,
    fragmentShader: `
      precision mediump float;
      in vec3 vColor;
      in float vSide;
      in float vAlong;
      in float vPhase;
      in float vGain;
      in float vGold;
      in vec3 vLocal;
      in vec3 vLocalOther;
      in float vShow;
      out vec4 fragColor;
      uniform float uTime;
      uniform float uMotion;
      ${RIPPLE}
      void main() {
        if (vShow < 0.02) discard;
        float d = abs(vSide);
        float glow = smoothstep(1.0, 0.08, d);
        float core = smoothstep(0.28, 0.0, d);
        float g = vGold;
        float travel = sin(uTime * 0.42 + vAlong * 6.2 + vPhase);
        float breathe = sin(uTime * 0.31 + vPhase);
        float life = 1.0 + uMotion * (0.1 * travel + 0.08 * breathe);
        vec3 hubGlow = rippleGlow(mix(vLocal, vLocalOther, vAlong)) * uMotion;
        float wave = max(hubGlow.r, max(hubGlow.g, hubGlow.b));
        float a = (glow * 0.07 + core * 0.28) * life * vGain * vShow;
        a *= 1.0 + wave * 2.4;
        vec3 col = g >= 1.0 ? uGoldColor : mix(vColor, uGoldColor, g);
        fragColor = vec4(col * a + hubGlow * (0.45 + core), a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false
  });
}

function rememberSession() {
  const key = 'brain-session';
  try {
    const have = sessionStorage.getItem(key);
    if (have) return have;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch (e) {
    return crypto.randomUUID();
  }
}

function noteUnlock() {
  if (noted) return;
  noted = true;
  try {
    const ping = buildClientPing({
      sessionId: rememberSession(),
      eventId: crypto.randomUUID(),
      durationMs: pad.run.durationMs || 0,
      lang: navigator.language || '',
      tz: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })(),
      viewport: { w: Math.round(window.innerWidth), h: Math.round(window.innerHeight) },
      referrer: document.referrer || '',
      page: location.pathname || '/brain/',
      ua: navigator.userAgent || ''
    });
    const store = {
      get(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } },
      set(key, value) { try { sessionStorage.setItem(key, value); } catch (e) {} }
    };
    maybeNotify(ping, {
      enabled: UNLOCK_ENABLED,
      transport: null,
      store,
      dedupeKey: 'brain-unlock-sent'
    }).catch(() => {});
  } catch (e) {}
}

function waveElapsed() {
  if (pad.run.phase !== 'wave' || pad.run.startAt == null) return 0;
  return performance.now() - pad.run.startAt;
}

function sync() {
  const view = controlView(pad.run.phase);
  const tone = padTone(pad.run.phase, pad.bad);
  const turn = spinSign(pad.run);
  const showPad = !controlsGone && padVisible(pad.run.phase, waveElapsed(), reduceMotion);
  if (padEl) {
    padEl.hidden = !showPad;
    padEl.inert = !showPad;
    if (showPad) padEl.removeAttribute('aria-hidden');
    else padEl.setAttribute('aria-hidden', 'true');
    if (!showPad) {
      const active = document.activeElement;
      if (active && padEl.contains(active)) active.blur();
    }
    padEl.classList.toggle('go', pad.run.phase === 'go' || pad.run.phase === 'wave');
    padEl.classList.toggle('bad', pad.bad);
    padEl.style.setProperty('--pad-k', String(Math.min(11, pad.run.prefix)));
    padEl.dataset.step = String(Math.min(11, pad.run.prefix));
    padEl.setAttribute('aria-disabled', showPad && pad.run.phase === 'wave' ? 'true' : 'false');
  }
  if (arrowEl) arrowEl.hidden = !view.arrow;
  if (view.nowReady && nowEl) nowEl.hidden = false;
  document.body.dataset.brain = revealed ? 'now' : (pad.bad ? 'bad' : pad.run.phase);
  document.body.dataset.gestures = gesturesAllowed(pad.run) ? '1' : '0';
  if (pad.run.phase === 'wave' || pad.run.phase === 'open') {
    document.body.classList.add('is-gold');
    document.body.classList.add('is-burst');
  }
  if (!host) return;
  host.dataset.phase = pad.run.phase;
  host.dataset.prefix = String(pad.run.prefix);
  host.dataset.speed = speedOf(pad.run, reduceMotion).toFixed(2);
  host.dataset.spin = autoSpin(pad.run, reduceMotion).toFixed(3);
  host.dataset.direction = pad.run.direction || '';
  host.dataset.flip = pad.run.flip ? '1' : '0';
  host.dataset.shake = shaking(pad.run) ? '1' : '0';
  host.dataset.sign = String(spinSign(pad.run).sign);
  host.dataset.tone = tone;
  host.dataset.arrow = view.arrow ? '1' : '0';
  host.dataset.controls = showPad ? '1' : '0';
  host.dataset.now = revealed ? '1' : '0';
  host.dataset.reduced = reduceMotion ? '1' : '0';
  host.dataset.turn = (turn.idle ? 'idle' : turn.axis) + ':' + String(turn.sign);
}

function bump(key) {
  if (!padEl) return;
  const btn = padEl.querySelector('button[data-k="' + key + '"]');
  if (!btn) return;
  btn.classList.remove('hit');
  void btn.offsetWidth;
  btn.classList.add('hit');
  setTimeout(() => btn.classList.remove('hit'), 250);
}

function showNow(intent) {
  if (!revealAllowed(pad.run.phase, intent) || revealed || !nowEl) return;
  revealed = true;
  nowEl.hidden = false;
  nowEl.removeAttribute('aria-hidden');
  nowEl.inert = false;
  const go = () => nowEl.classList.add('is-in');
  if (reduceMotion) go();
  else requestAnimationFrame(() => requestAnimationFrame(go));
  sync();
  if (intent === 'arrow') {
    const intro = nowEl.querySelector('p.now-preview');
    nowEl.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (intro) {
      intro.tabIndex = -1;
      intro.focus({ preventScroll: true });
    }
  }
}

function burstSymbols() {
  if (!padEl || !shouldCelebrate('start', celebrated)) return;
  celebrated = true;
  if (host) host.dataset.burst = '1';
  const layer = document.createElement('div');
  layer.className = 'pad-burst';
  layer.setAttribute('aria-hidden', 'true');
  const controls = padEl.parentElement;
  const hostBox = controls ? controls.getBoundingClientRect() : null;
  const buttons = [...padEl.querySelectorAll('button')];
  const mid = (buttons.length - 1) / 2;
  buttons.forEach((btn, i) => {
    const clone = btn.cloneNode(true);
    clone.classList.remove('hit');
    clone.classList.add('burst-bit');
    const spread = i - mid;
    const angle = -Math.PI / 2 + spread * 0.42;
    const dist = reduceMotion ? 0 : 56;
    clone.style.setProperty('--bx', (Math.cos(angle) * dist).toFixed(1) + 'px');
    clone.style.setProperty('--by', (Math.sin(angle) * dist).toFixed(1) + 'px');
    if (hostBox) {
      const rect = btn.getBoundingClientRect();
      clone.style.left = (rect.left - hostBox.left) + 'px';
      clone.style.top = (rect.top - hostBox.top) + 'px';
      clone.style.width = rect.width + 'px';
      clone.style.height = rect.height + 'px';
    }
    clone.tabIndex = -1;
    layer.append(clone);
  });
  if (controls) controls.append(layer);
  /* Same turn as the clones: the stationary pad is gone before the next paint. */
  controlsGone = true;
  sync();
  const life = reduceMotion ? BURST_REDUCED_MS : BURST_MS;
  const startedAt = performance.now();
  const done = (event) => {
    if (event && performance.now() - startedAt < life * 0.85) return;
    if (layer.isConnected) layer.remove();
  };
  layer.addEventListener('animationend', done);
  setTimeout(() => done(null), life);
}

function retireControls() {
  if (pad.run.phase !== 'wave' && pad.run.phase !== 'open') return;
  controlsGone = true;
  sync();
}

function armRetire() {
  clearTimeout(retireTimer);
  if (pad.run.phase !== 'wave' || pad.run.startAt == null || controlsGone) return;
  const limit = reduceMotion ? BURST_REDUCED_MS : BURST_MS;
  const wait = Math.max(0, limit - (performance.now() - pad.run.startAt));
  retireTimer = setTimeout(retireControls, wait);
}

function markOpen() {
  if (opened) return;
  opened = true;
  if (nowEl) {
    nowEl.hidden = false;
    nowEl.setAttribute('aria-hidden', 'true');
    nowEl.inert = true;
  }
  scrollBase = window.scrollY;
  if (statusEl) statusEl.textContent = 'now is below';
  sync();
  noteUnlock();
}

function onPress(key, source) {
  const now = performance.now();
  const out = pressPad(pad, key, now, source, reduceMotion);
  pad = out.pad;
  if (out.result === 'advance' || out.result === 'start') bump(key === 'enter' ? 'start' : key);
  if (shouldCelebrate(out.result, celebrated)) {
    burstSymbols();
    armRetire();
  }
  if (out.result === 'reset') {
    if (statusEl) statusEl.textContent = 'again';
    clearTimeout(badTimer);
    const wait = Math.max(0, pad.lockedUntil - now);
    badTimer = setTimeout(() => {
      pad = releasePad(pad, performance.now());
      sync();
    }, wait);
  } else if (out.result === 'advance' || out.result === 'start') {
    if (statusEl) statusEl.textContent = '';
  }
  sync();
}

if (disclosureNeeded(UNLOCK_ENABLED)) {
  const line = document.createElement('p');
  line.className = 'brain-disclosure';
  line.textContent = DISCLOSURE;
  const controls = document.querySelector('.brain-controls');
  if (controls) controls.prepend(line);
}

if (padEl) {
  padEl.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-k]');
    if (!btn) return;
    onPress(btn.dataset.k, 'button');
  });
}
if (arrowEl) arrowEl.addEventListener('click', () => showNow('arrow'));
addEventListener('keydown', (event) => {
  if (pad.run.phase === 'open' || controlsGone) return;
  if (event.target && event.target.closest && event.target.closest('.pad') && (event.key === 'Enter' || event.key === ' ')) return;
  const key = keyboardPress(event);
  if (!key) return;
  event.preventDefault();
  onPress(key, 'keyboard');
});
addEventListener('scroll', () => {
  if (pad.run.phase !== 'open' || revealed) return;
  if (window.scrollY > scrollBase + 12) showNow('scroll');
}, { passive: true });
motionQuery.addEventListener('change', () => {
  reduceMotion = motionQuery.matches;
  armRetire();
  sync();
});
sync();

function build(data, positions) {
  const nodes = data.nodes;
  const links = data.links;
  const n = nodes.length;
  const degree = new Uint16Array(n);
  const index = new Map();
  nodes.forEach((node, i) => index.set(node.id, i));
  for (const link of links) {
    degree[index.get(link.s)] += 1;
    degree[index.get(link.t)] += 1;
  }

  const paint = presentClasses(nodes, positions);
  const haloColor = new Float32Array(n * 3);
  const coreColor = new Float32Array(n * 3);
  const haloSize = new Float32Array(n);
  const coreSize = new Float32Array(n);
  const nodePhase = new Float32Array(n);
  const nodeHub = new Float32Array(n);
  let maxR = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    if (r > maxR) maxR = r;
  }
  for (let i = 0; i < n; i++) {
    const shell = Math.hypot(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]) > maxR * 0.985;
    const hub = Math.min(1, Math.sqrt(degree[i]) / 7);
    const accent = paint.classes[i] !== 'teal';
    const rgb = CLASS_RGB[paint.classes[i]];
    const base = linear(towardWhite(rgb, accent ? 0.42 : 0));
    const hot = linear(towardWhite(rgb, accent ? 0.72 : (shell ? 0.28 : 0.5)));
    haloColor.set(base, i * 3);
    coreColor.set(hot, i * 3);
    const size = (shell ? 15 : 4.6 + hub * 6.5) * (accent ? 1.28 : 1);
    haloSize[i] = size;
    coreSize[i] = size * (shell ? 0.42 : 0.38);
    nodePhase[i] = phase(nodes[i].id);
    nodeHub[i] = shell ? 0.22 : hub;
  }

  const pos = new THREE.BufferAttribute(positions, 3);
  const phaseAttr = new THREE.BufferAttribute(nodePhase, 1);
  const hubAttr = new THREE.BufferAttribute(nodeHub, 1);
  const haloGeo = new THREE.BufferGeometry();
  const coreGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', pos);
  coreGeo.setAttribute('position', pos);
  haloGeo.setAttribute('aColor', new THREE.BufferAttribute(haloColor, 3));
  coreGeo.setAttribute('aColor', new THREE.BufferAttribute(coreColor, 3));
  haloGeo.setAttribute('aSize', new THREE.BufferAttribute(haloSize, 1));
  coreGeo.setAttribute('aSize', new THREE.BufferAttribute(coreSize, 1));
  haloGeo.setAttribute('aPhase', phaseAttr);
  coreGeo.setAttribute('aPhase', phaseAttr);
  haloGeo.setAttribute('aHub', hubAttr);
  coreGeo.setAttribute('aHub', hubAttr);

  const linkCount = links.length;
  const lPos = new Float32Array(linkCount * 4 * 3);
  const lOther = new Float32Array(linkCount * 4 * 3);
  const lSide = new Float32Array(linkCount * 4);
  const lAlong = new Float32Array(linkCount * 4);
  const lPhase = new Float32Array(linkCount * 4);
  const lGain = new Float32Array(linkCount * 4);
  const lColor = new Float32Array(linkCount * 4 * 3);
  const lIndex = new Uint32Array(linkCount * 6);
  for (let i = 0; i < linkCount; i++) {
    const a = index.get(links[i].s);
    const b = index.get(links[i].t);
    const ax = positions[a * 3];
    const ay = positions[a * 3 + 1];
    const az = positions[a * 3 + 2];
    const bx = positions[b * 3];
    const by = positions[b * 3 + 1];
    const bz = positions[b * 3 + 2];
    const accent = paint.classes[a] !== 'teal' && paint.classes[a] === paint.classes[b] ? paint.classes[a] : 'teal';
    const ca = linear(towardWhite(CLASS_RGB[accent], 0.42));
    const cb = ca;
    const ph = phase(i + 17);
    const span = Math.hypot(bx - ax, by - ay, bz - az);
    const gain = 0.36 / (1 + span / 34);
    const base = i * 4;
    for (let v = 0; v < 4; v++) {
      const end = v >> 1;
      const o = (base + v) * 3;
      lPos[o] = end ? bx : ax;
      lPos[o + 1] = end ? by : ay;
      lPos[o + 2] = end ? bz : az;
      lOther[o] = end ? ax : bx;
      lOther[o + 1] = end ? ay : by;
      lOther[o + 2] = end ? az : bz;
      lSide[base + v] = (v & 1) ? 1 : -1;
      lAlong[base + v] = end;
      lPhase[base + v] = ph;
      lGain[base + v] = gain;
      const col = end ? cb : ca;
      lColor[o] = col[0];
      lColor[o + 1] = col[1];
      lColor[o + 2] = col[2];
    }
    const t = i * 6;
    lIndex[t] = base;
    lIndex[t + 1] = base + 2;
    lIndex[t + 2] = base + 1;
    lIndex[t + 3] = base + 1;
    lIndex[t + 4] = base + 2;
    lIndex[t + 5] = base + 3;
  }
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(lPos, 3));
  linkGeo.setAttribute('aOther', new THREE.BufferAttribute(lOther, 3));
  linkGeo.setAttribute('aSide', new THREE.BufferAttribute(lSide, 1));
  linkGeo.setAttribute('aAlong', new THREE.BufferAttribute(lAlong, 1));
  linkGeo.setAttribute('aPhase', new THREE.BufferAttribute(lPhase, 1));
  linkGeo.setAttribute('aGain', new THREE.BufferAttribute(lGain, 1));
  linkGeo.setAttribute('aColor', new THREE.BufferAttribute(lColor, 3));
  linkGeo.setIndex(new THREE.BufferAttribute(lIndex, 1));

  const renderer = createRenderer();
  renderer.setClearColor(0x000000, 1);
  try {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } catch (error) {
    /* A phone can reject the drawing-buffer color space. Keep the default and still draw. */
  }
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 4000);

  const time = { value: 0 };
  const motion = { value: reduceMotion ? 0 : 1 };
  const hubPos = Array.from({ length: HUBS }, () => new THREE.Vector3());
  const hubOffset = new Float32Array(HUBS);
  const hubTravel = new Float32Array(HUBS);
  const hubOn = new Float32Array(HUBS);
  const hubAmp = new Float32Array(HUBS);
  const hubColor = Array.from({ length: HUBS }, () => new THREE.Vector3());
  const hubs = pulseHubs(positions, degree, paint.classes);
  hubs.forEach((hubIndex, nHub) => {
    hubPos[nHub].set(positions[hubIndex * 3], positions[hubIndex * 3 + 1], positions[hubIndex * 3 + 2]);
    const rgb = linear(CLASS_RGB[paint.classes[hubIndex]]);
    hubColor[nHub].set(rgb[0], rgb[1], rgb[2]);
    hubTravel[nHub] = HUB_TRAVEL[nHub];
    const period = HUB_TRAVEL[nHub] + HUB_REST;
    hubOffset[nHub] = (nHub * 1.37) % period;
    hubOn[nHub] = 1;
    hubAmp[nHub] = 1;
  });
  const goldLinear = linear(GOLD_RGB);
  const ripple = {
    uHubPos: { value: hubPos },
    uHubColor: { value: hubColor },
    uHubOffset: { value: hubOffset },
    uHubTravel: { value: hubTravel },
    uHubOn: { value: hubOn },
    uHubAmp: { value: hubAmp },
    uReach: { value: 14.5 },
    uShell: { value: maxR },
    uRest: { value: HUB_REST },
    uTime: time,
    uMotion: motion,
    uGoldFront: { value: 0 },
    uGoldBand: { value: Math.max(8, maxR * 0.14) },
    uGoldLock: { value: 0 },
    uGoldPulse: { value: 0 },
    uGoldColor: { value: new THREE.Vector3(goldLinear[0], goldLinear[1], goldLinear[2]) },
    uExplodeTime: { value: 0 },
    uTravel: { value: 0 },
    uRebuild: { value: 0 },
    uAppearFront: { value: 0 },
    uAppearBand: { value: Math.max(8, maxR * 0.14) },
    uExplodeDist: { value: reduceMotion ? 0 : 78 },
    uShake: { value: 0 }
  };
  const boxSize = () => {
    const rect = host.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  };
  const pointUniforms = {
    uTex: { value: glowTexture() },
    uScale: { value: pointScaleFor(boxSize().width, boxSize().height, 1, window.devicePixelRatio || 1) },
    ...ripple
  };
  const linkUniforms = {
    uWidth: { value: boxSize().width < 760 ? 0.62 : 0.85 },
    ...ripple
  };
  const haloMat = pointMaterial(pointUniforms);
  const coreMat = pointMaterial(pointUniforms);
  const threads = new THREE.Mesh(linkGeo, linkMaterial(linkUniforms));
  threads.renderOrder = 1;
  threads.frustumCulled = false;
  const halo = new THREE.Points(haloGeo, haloMat);
  const core = new THREE.Points(coreGeo, coreMat);
  halo.renderOrder = 2;
  core.renderOrder = 3;
  const cloud = new THREE.Group();
  cloud.add(threads, halo, core);
  scene.add(cloud);

  const focus = new THREE.Vector3();
  const eye = new THREE.Vector3(0.72, 0.38, 0.96).normalize();
  const camRight = new THREE.Vector3();
  const camUp = new THREE.Vector3();
  const camForward = new THREE.Vector3();
  let framed = 0;
  let orbitTheta = 0;
  let orbitPhi = 1;
  let orbitReady = false;
  const applyOrbit = () => {
    const pose = new THREE.Spherical(framed, orbitPhi, orbitTheta);
    camera.position.setFromSpherical(pose).add(focus);
    camera.lookAt(focus);
    host.dataset.radius = framed.toFixed(2);
    host.dataset.theta = orbitTheta.toFixed(3);
  };
  let placeTries = 0;
  /* Sit the code row just above the social pill, inside the black fade. */
  const seatFoot = () => {
    const stage = document.querySelector('.brain-stage');
    const dock = document.querySelector('.social-dock');
    if (!stage || !dock) return;
    const dockTop = dock.getBoundingClientRect().top;
    const stageBottom = stage.getBoundingClientRect().bottom;
    const pad = Math.max(64, Math.ceil(stageBottom - dockTop + 12));
    document.documentElement.style.setProperty('--brain-foot', pad + 'px');
  };
  const place = () => {
    const box = boxSize();
    if (box.width < 2 || box.height < 2) {
      if (placeTries < 45) {
        placeTries += 1;
        requestAnimationFrame(place);
      }
      return;
    }
    placeTries = 0;
    const aspect = box.width / box.height;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const limit = Math.min(vFov, hFov);
    framed = (maxR * 1.16) / Math.sin(limit / 2);
    camera.aspect = aspect;
    camera.near = Math.max(0.1, framed / 80);
    camera.far = framed + maxR * 8;
    if (!orbitReady) {
      camera.position.copy(focus).addScaledVector(eye, framed);
      camera.lookAt(focus);
      const spherical = new THREE.Spherical().setFromVector3(camera.position.clone().sub(focus));
      orbitTheta = spherical.theta;
      orbitPhi = spherical.phi;
      orbitReady = true;
    }
    applyOrbit();
    camera.updateProjectionMatrix();
    seatFoot();
    const ratio = Math.min(window.devicePixelRatio || 1, box.width < 760 ? 1.35 : 1.6);
    pointUniforms.uScale.value = pointScaleFor(box.width, box.height, ratio, window.devicePixelRatio || 1);
    linkUniforms.uWidth.value = box.width < 760 ? 0.62 : 0.85;
    renderer.setPixelRatio(ratio);
    renderer.setSize(box.width, box.height, false);
  };
  place();
  if (window.ResizeObserver) new ResizeObserver(() => place()).observe(host);
  window.addEventListener('resize', place);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', place);

  /* Idle drag orbits at a fixed distance. Wheel, pinch, and pan do not move the graph. */
  const pointers = new Set();
  let drag = null;
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (event) => {
    pointers.add(event.pointerId);
    if (pointers.size > 1) {
      drag = null;
      return;
    }
    if (!gesturesAllowed(pad.run)) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  window.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id || pointers.size > 1) return;
    if (!gesturesAllowed(pad.run)) {
      drag = null;
      return;
    }
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    drag.x = event.clientX;
    drag.y = event.clientY;
    orbitTheta -= dx * 0.005;
    orbitPhi -= dy * 0.005;
    const edge = 0.22;
    orbitPhi = Math.max(edge, Math.min(Math.PI - edge, orbitPhi));
    applyOrbit();
  });
  const releasePointer = (event) => {
    pointers.delete(event.pointerId);
    if (drag && drag.id === event.pointerId) drag = null;
  };
  window.addEventListener('pointerup', releasePointer);
  window.addEventListener('pointercancel', releasePointer);

  const stagePlay = (play) => {
    ripple.uExplodeTime.value = play.explodeTime;
    ripple.uTravel.value = play.travel;
    ripple.uRebuild.value = play.rebuild;
    ripple.uAppearFront.value = play.front;
    ripple.uAppearBand.value = play.band;
    ripple.uGoldLock.value = play.lock;
    ripple.uGoldPulse.value = play.rebuild;
    host.dataset.wave = play.progress.toFixed(3);
    host.dataset.gold = String(play.lock);
    host.dataset.explode = play.exploding ? '1' : '0';
  };

  const clock = new THREE.Clock();
  let last = performance.now();
  let spun = 0;
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (document.hidden) return;
    const hold = window.__holdTime;
    const heldClock = typeof hold === 'number' && Number.isFinite(hold);
    const t = reduceMotion ? 0 : (heldClock ? hold : stillTime != null ? stillTime : clock.getElapsedTime());
    const breath = reduceMotion ? 1 : 1 + Math.sin(t * 0.37) * 0.016;
    cloud.scale.setScalar(breath);
    time.value = t;
    motion.value = reduceMotion || stillTime != null ? 0 : 1;
    ripple.uShake.value = shaking(pad.run) && !reduceMotion ? 1 : 0;
    const spin = stillTime == null && !heldClock ? autoSpin(pad.run, reduceMotion) : 0;
    if (spin > 0) {
      const turn = spinSign(pad.run);
      camera.updateMatrixWorld();
      camera.matrixWorld.extractBasis(camRight, camUp, camForward);
      const axis = turn.axis === 'right' ? camRight : camUp;
      const step = turn.sign * spin * dt;
      cloud.rotateOnWorldAxis(axis, step);
      spun += step;
    }
    host.dataset.yaw = spun.toFixed(4);
    if (pad.run.phase === 'wave' && pad.run.startAt != null) {
      /* a number on window.__waveElapsed holds the wave for a still. unset, the clock is real. */
      const held = window.__waveElapsed;
      const elapsed = typeof held === 'number' && Number.isFinite(held) ? held : performance.now() - pad.run.startAt;
      stagePlay(playFrame(elapsed, maxR, reduceMotion));
      const next = typeof held === 'number' ? pad.run : advanceWave(pad.run, pad.run.startAt + elapsed, playDuration(reduceMotion));
      if (next !== pad.run) {
        pad = { run: next, lockedUntil: pad.lockedUntil, bad: false };
        sync();
        markOpen();
      }
    } else if (pad.run.phase === 'open') {
      const band = Math.max(8, maxR * 0.14);
      stagePlay({
        explodeTime: 0,
        travel: 0,
        rebuild: 1,
        front: maxR + band,
        band,
        lock: 1,
        progress: 1,
        exploding: false
      });
    } else {
      stagePlay({
        explodeTime: 0,
        travel: 0,
        rebuild: 0,
        front: 0,
        band: ripple.uAppearBand.value,
        lock: 0,
        progress: 0,
        exploding: false
      });
    }
    renderer.render(scene, camera);
    if (!sampled && host.dataset.radius) {
      try { sampleFrame(); } catch (error) { sampled = true; host.dataset.lit = '0'; }
    }
  };
  let sampled = false;
  const sampleFrame = () => {
    sampled = true;
    const gl = renderer.getContext();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const pixels = new Uint8Array(4 * 8 * 8);
    let lit = 0;
    for (let y = 1; y < 6; y++) {
      for (let x = 1; x < 6; x++) {
        gl.readPixels(Math.floor(w * x / 6), Math.floor(h * y / 6), 8, 8, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 24) lit += 1;
        }
      }
    }
    host.dataset.lit = String(lit);
    host.dataset.buffer = w + 'x' + h;
  };
  frame(performance.now());

  host.dataset.ready = '1';
  host.dataset.startup = 'rendered';
  host.dataset.nodes = String(n);
  host.dataset.painted = String(paint.rendered);
  host.dataset.colors = `purple:${paint.counts.purple},pink:${paint.counts.pink},orange:${paint.counts.orange},teal:${paint.counts.teal}`;
  host.dataset.links = String(links.length);
  host.dataset.hubs = String(hubs.length);
  host.dataset.wave = '0.000';
  host.dataset.gold = '0';
  sync();
}

function createRenderer() {
  const attempts = [
    { antialias: window.innerWidth >= 760, alpha: false, powerPreference: 'default' },
    { antialias: false, alpha: false, powerPreference: 'default' }
  ];
  let last;
  for (const attrs of attempts) {
    try {
      return new THREE.WebGLRenderer(attrs);
    } catch (error) {
      last = error;
    }
  }
  throw last;
}

function startupFailed(error) {
  console.error(error && error.message ? error.message : 'graph failed');
  if (host) host.dataset.startup = 'error';
}

function drawGraph(data, positions) {
  try {
    build(data, positions);
  } catch (error) {
    startupFailed(error);
  }
}

/* The worker keeps the first paint off the buttons. If it never answers, lay out here.
   A failed worker used to leave the black frame up with only the pad. */
function bootGraph(data) {
  const main = () => drawGraph(data, layout(data.nodes, data.links));
  if (new URLSearchParams(location.search).get('layout') === 'main' || typeof Worker !== 'function') {
    main();
    return;
  }
  let settled = false;
  const finish = (positions) => {
    if (settled) return;
    settled = true;
    if (positions) drawGraph(data, positions);
    else main();
  };
  try {
    const worker = new Worker(new URL('./layout-worker.js', import.meta.url), { type: 'module' });
    const timer = setTimeout(() => {
      worker.terminate();
      finish(null);
    }, 8000);
    worker.onmessage = (event) => {
      clearTimeout(timer);
      worker.terminate();
      finish(event.data);
    };
    worker.onerror = (event) => {
      if (event && event.preventDefault) event.preventDefault();
      clearTimeout(timer);
      worker.terminate();
      finish(null);
    };
    worker.postMessage({ nodes: data.nodes, links: data.links });
  } catch (error) {
    finish(null);
  }
}

fetch('graph.json', { cache: 'no-cache' })
  .then((res) => {
    if (!res.ok) refuse();
    return res.json();
  })
  .then((data) => {
    assertGraph(data);
    bootGraph(data);
  })
  .catch((error) => startupFailed(error));
