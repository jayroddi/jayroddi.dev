/* Fixed-frame graph. Nodes are anonymous ids. Nothing in the file is labeled.
   The camera does not orbit, zoom, or pan. Spin comes from the keys below. */

import * as THREE from 'three';
import { GROUP_RGB, GOLD_RGB } from './palette.js';
import {
  advanceWave, controlView, createPad, keyboardPress, padTone, pressPad,
  releasePad, revealAllowed, speedOf, turnAxis, waveDuration, waveFrame
} from './gate.js';
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
const waveMs = waveDuration(location.search);
const stillParam = new URLSearchParams(location.search).get('still');
const stillTime = stillParam == null || stillParam === '' || Number.isNaN(Number(stillParam)) ? null : Number(stillParam);

let pad = createPad();
let revealed = false;
let opened = false;
let noted = false;
let scrollBase = 0;
let badTimer = 0;

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

const HUB_TRAVEL = [2.7, 3.15, 3.55, 2.9, 3.85, 3.3, 2.5, 3.65];
const HUB_REST = 1;

function chooseHubs(positions, degree, groupOf) {
  const n = degree.length;
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  order.sort((a, b) => degree[b] - degree[a] || a - b);
  const picked = [];
  const minSep = 14;
  const radiusOf = (i) => Math.hypot(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
  const tooClose = (i) => picked.some((j) => {
    const dx = positions[i * 3] - positions[j * 3];
    const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
    const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
    return dx * dx + dy * dy + dz * dz < minSep * minSep;
  });
  const take = (i) => {
    if (picked.includes(i) || picked.length >= 8) return false;
    if (radiusOf(i) > 55 || tooClose(i)) return false;
    picked.push(i);
    return true;
  };
  for (let g = 0; g < 4; g++) {
    for (const i of order) {
      if (groupOf[i] !== g) continue;
      if (take(i)) break;
    }
  }
  for (const i of order) {
    if (picked.length >= 8 || degree[i] < 20) break;
    take(i);
  }
  return picked;
}

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
const int HUBS = 8;
uniform vec3 uHubPos[HUBS];
uniform vec3 uHubColor[HUBS];
uniform float uHubOffset[HUBS];
uniform float uHubTravel[HUBS];
uniform float uHubOn[HUBS];
uniform float uHubAmp[HUBS];
uniform float uReach;
uniform float uShell;
uniform float uRest;
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
    float front = u * uReach;
    float width = mix(3.2, 18.0, u);
    float band = exp(-pow((d - front) / width, 2.0));
    float nucleus = exp(-pow(d / 4.6, 2.0)) * (1.0 - smoothstep(0.0, 0.32, u));
    float soften = 1.0 - smoothstep(0.18, 0.96, u);
    float edge = 1.0 - smoothstep(uReach * 0.58, uReach * 0.94, d);
    float amp = nucleus * 2.8 + band * soften * edge;
    sum += uHubColor[i] * amp * firing;
  }
  return sum * shellFade;
}
`;

const GOLD_AT = `
uniform float uGoldFront;
uniform float uGoldBand;
uniform float uGoldLock;
float goldAt(vec3 p) {
  if (uGoldLock > 0.5) return 1.0;
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
      uniform vec3 uGoldColor;
      ${RIPPLE}
      ${GOLD_AT}
      void main() {
        float g = goldAt(position);
        float alive = 1.0 - g;
        float wobble = sin(uTime * (0.48 + aHub * 0.4) + aPhase) * uMotion;
        vec3 glow = rippleGlow(position) * uMotion * alive;
        float wave = max(glow.r, max(glow.g, glow.b));
        float pulse = 1.0 + alive * ((0.028 + aHub * 0.075) * wobble + wave * 1.55);
        vec3 tinted = aColor * (0.94 + alive * (0.06 + aHub * 0.1) * wobble) + glow;
        vColor = g >= 1.0 ? uGoldColor : mix(tinted, uGoldColor, g);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * pulse * uScale / -mv.z, 1.0, 64.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform sampler2D uTex;
      in vec3 vColor;
      out vec4 fragColor;
      void main() {
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
      uniform float uWidth;
      ${GOLD_AT}
      void main() {
        vec3 p = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vec3 q = (modelViewMatrix * vec4(aOther, 1.0)).xyz;
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
      out vec4 fragColor;
      uniform float uTime;
      uniform float uMotion;
      uniform vec3 uGoldColor;
      ${RIPPLE}
      void main() {
        float d = abs(vSide);
        float glow = smoothstep(1.0, 0.08, d);
        float core = smoothstep(0.28, 0.0, d);
        float g = vGold;
        float alive = 1.0 - g;
        float travel = sin(uTime * 0.42 + vAlong * 6.2 + vPhase);
        float breathe = sin(uTime * 0.31 + vPhase);
        float life = 1.0 + uMotion * alive * (0.1 * travel + 0.08 * breathe);
        vec3 hubGlow = rippleGlow(mix(vLocal, vLocalOther, vAlong)) * uMotion * alive;
        float wave = max(hubGlow.r, max(hubGlow.g, hubGlow.b));
        float a = (glow * 0.07 + core * 0.28) * life * vGain;
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

function sync() {
  const view = controlView(pad.run.phase);
  const tone = padTone(pad.run.phase, pad.bad);
  const turn = turnAxis(pad.run.direction);
  if (padEl) {
    padEl.hidden = !view.pad;
    padEl.classList.toggle('go', pad.run.phase === 'go' || pad.run.phase === 'wave');
    padEl.classList.toggle('bad', pad.bad);
    padEl.style.setProperty('--pad-k', String(Math.min(11, pad.run.prefix)));
    padEl.dataset.step = String(Math.min(11, pad.run.prefix));
    padEl.setAttribute('aria-disabled', pad.run.phase === 'wave' ? 'true' : 'false');
  }
  if (arrowEl) arrowEl.hidden = !view.arrow;
  if (view.nowReady && nowEl) nowEl.hidden = false;
  document.body.dataset.brain = revealed ? 'now' : (pad.bad ? 'bad' : pad.run.phase);
  if (!host) return;
  host.dataset.phase = pad.run.phase;
  host.dataset.prefix = String(pad.run.prefix);
  host.dataset.speed = speedOf(pad.run, reduceMotion).toFixed(2);
  host.dataset.direction = pad.run.direction || '';
  host.dataset.tone = tone;
  host.dataset.arrow = view.arrow ? '1' : '0';
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
    const heading = document.getElementById('now-title');
    nowEl.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }
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
  if (pad.run.phase === 'open') return;
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

  const groupOf = nodes.map((node) => (node.g == null ? 2 : node.g));
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
    const base = linear(GROUP_RGB[groupOf[i]]);
    const hot = linear(towardWhite(GROUP_RGB[groupOf[i]], shell ? 0.28 : 0.5));
    haloColor.set(base, i * 3);
    coreColor.set(hot, i * 3);
    const size = shell ? 15 : 4.6 + hub * 6.5;
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
    const ca = linear(towardWhite(GROUP_RGB[groupOf[a]], 0.42));
    const cb = linear(towardWhite(GROUP_RGB[groupOf[b]], 0.42));
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

  const renderer = new THREE.WebGLRenderer({
    antialias: window.innerWidth >= 760,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 4000);

  const time = { value: 0 };
  const motion = { value: reduceMotion ? 0 : 1 };
  const hubPos = Array.from({ length: 8 }, () => new THREE.Vector3());
  const hubOffset = new Float32Array(8);
  const hubTravel = new Float32Array(8);
  const hubOn = new Float32Array(8);
  const hubAmp = new Float32Array(8);
  const hubColor = Array.from({ length: 8 }, () => new THREE.Vector3());
  const hubs = chooseHubs(positions, degree, groupOf);
  hubs.forEach((hubIndex, nHub) => {
    hubPos[nHub].set(positions[hubIndex * 3], positions[hubIndex * 3 + 1], positions[hubIndex * 3 + 2]);
    const rgb = linear(GROUP_RGB[groupOf[hubIndex]]);
    hubColor[nHub].set(rgb[0], rgb[1], rgb[2]);
    hubTravel[nHub] = HUB_TRAVEL[nHub];
    const period = HUB_TRAVEL[nHub] + HUB_REST;
    hubOffset[nHub] = (nHub * 1.37) % period;
    hubOn[nHub] = 1;
    const weight = degree[hubIndex];
    hubAmp[nHub] = weight >= 80 ? 1 : weight >= 12 ? 0.86 : 0.72;
  });
  const goldLinear = linear(GOLD_RGB);
  const ripple = {
    uHubPos: { value: hubPos },
    uHubColor: { value: hubColor },
    uHubOffset: { value: hubOffset },
    uHubTravel: { value: hubTravel },
    uHubOn: { value: hubOn },
    uHubAmp: { value: hubAmp },
    uReach: { value: 40 },
    uShell: { value: maxR },
    uRest: { value: HUB_REST },
    uTime: time,
    uMotion: motion,
    uGoldFront: { value: 0 },
    uGoldBand: { value: Math.max(4, maxR * 0.08) },
    uGoldLock: { value: 0 },
    uGoldColor: { value: new THREE.Vector3(goldLinear[0], goldLinear[1], goldLinear[2]) }
  };
  const pointScale = (width, height) => {
    const short = Math.min(width, height);
    return short * (width < 760 ? 1.55 : 0.58);
  };
  const boxSize = () => {
    const rect = host.getBoundingClientRect();
    return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
  };
  const pointUniforms = {
    uTex: { value: glowTexture() },
    uScale: { value: pointScale(boxSize().width, boxSize().height) },
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
  const place = () => {
    const box = boxSize();
    const aspect = box.width / box.height;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const limit = Math.min(vFov, hFov);
    const dist = (maxR * 1.16) / Math.sin(limit / 2);
    camera.aspect = aspect;
    camera.position.copy(focus).addScaledVector(eye, dist);
    camera.near = Math.max(0.1, dist / 80);
    camera.far = dist + maxR * 8;
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    pointUniforms.uScale.value = pointScale(box.width, box.height);
    linkUniforms.uWidth.value = box.width < 760 ? 0.62 : 0.85;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, box.width < 760 ? 1.35 : 1.6));
    renderer.setSize(box.width, box.height, false);
  };
  place();
  if (window.ResizeObserver) new ResizeObserver(() => place()).observe(host);
  window.addEventListener('resize', place);

  const applyGold = (frame) => {
    ripple.uGoldFront.value = frame.front;
    ripple.uGoldBand.value = frame.band;
    ripple.uGoldLock.value = frame.lock;
    host.dataset.wave = frame.progress.toFixed(3);
    host.dataset.gold = String(frame.lock);
    if (frame.lock) {
      for (let i = 0; i < hubOn.length; i++) hubOn[i] = 0;
    }
  };

  const clock = new THREE.Clock();
  let last = performance.now();
  const frame = (now) => {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (document.hidden) return;
    const t = reduceMotion ? 0 : (stillTime != null ? stillTime : clock.getElapsedTime());
    const breath = reduceMotion ? 1 : 1 + Math.sin(t * 0.37) * 0.016;
    cloud.scale.setScalar(breath);
    time.value = t;
    motion.value = reduceMotion || stillTime != null ? 0 : 1;
    if (!reduceMotion && stillTime == null) {
      const speed = speedOf(pad.run, false);
      const turn = turnAxis(pad.run.direction);
      camera.updateMatrixWorld();
      camera.matrixWorld.extractBasis(camRight, camUp, camForward);
      const axis = turn.axis === 'right' ? camRight : camUp;
      if (speed > 0) cloud.rotateOnWorldAxis(axis, turn.sign * speed * dt);
    }
    if (pad.run.phase === 'wave' && pad.run.startAt != null) {
      /* a number on window.__waveElapsed holds the wave for a still. unset, the clock is real. */
      const held = window.__waveElapsed;
      const elapsed = typeof held === 'number' && Number.isFinite(held) ? held : performance.now() - pad.run.startAt;
      const frameW = waveFrame(elapsed, maxR, waveMs);
      applyGold(frameW);
      const next = typeof held === 'number' ? pad.run : advanceWave(pad.run, pad.run.startAt + elapsed, waveMs);
      if (next !== pad.run) {
        pad = { run: next, lockedUntil: pad.lockedUntil, bad: false };
        sync();
        markOpen();
      }
    } else if (pad.run.phase === 'open') {
      applyGold(waveFrame(waveMs, maxR, waveMs));
    }
    renderer.render(scene, camera);
  };
  frame(performance.now());

  host.dataset.ready = '1';
  host.dataset.nodes = String(n);
  host.dataset.links = String(links.length);
  host.dataset.hubs = String(hubs.length);
  host.dataset.wave = '0.000';
  host.dataset.gold = '0';
  sync();
}

fetch('graph.json', { cache: 'no-cache' })
  .then((res) => {
    if (!res.ok) refuse();
    return res.json();
  })
  .then((data) => {
    assertGraph(data);
    const worker = new Worker(new URL('./layout-worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      worker.terminate();
      build(data, event.data);
    };
    worker.onerror = () => {
      worker.terminate();
      console.error('graph layout failed');
    };
    worker.postMessage({ nodes: data.nodes, links: data.links });
  })
  .catch((error) => {
    console.error(error && error.message ? error.message : 'graph failed');
  });
