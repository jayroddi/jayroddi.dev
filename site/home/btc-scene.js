/* Homepage bitcoin scene.
   History runs into a wall at now. Past the wall, theoretical paths
   fan out from recent daily volatility. Not a forecast.
   Prices come from the bundled CoinMetrics series, with a live read
   attempted first. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const root = document.getElementById('btc');
const stage = root && root.querySelector('.btc-scene');
if (root && stage) boot();

function boot() {
  loadPrices()
    .then((px) => build(px))
    .catch(() => { stage.textContent = 'btc history unavailable'; });
}

async function loadPrices() {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch('https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=PriceUSD&frequency=1d&page_size=10000', { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('live');
    const json = await res.json();
    const px = (json.data || []).map((row) => Number(row.PriceUSD)).filter((n) => n > 0);
    if (px.length < 120) throw new Error('short');
    return px;
  } catch (err) {
    const res = await fetch('/brain/btc.json', { cache: 'no-cache' });
    if (!res.ok) throw err;
    const data = await res.json();
    const px = (data.px || []).filter((n) => n > 0);
    if (px.length < 30) throw err;
    return px;
  }
}

function sample(values, count) {
  if (values.length <= count) return values.slice();
  const out = [];
  for (let i = 0; i < count; i += 1) {
    out.push(values[Math.round(i * (values.length - 1) / (count - 1))]);
  }
  return out;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rand) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

function build(series) {
  const recent = series.slice(-1000);
  const hist = sample(recent, 280);
  const look = recent.slice(-90);
  const rets = [];
  for (let i = 1; i < look.length; i += 1) rets.push(Math.log(look[i] / look[i - 1]));
  const mu = rets.reduce((s, n) => s + n, 0) / rets.length;
  const variance = rets.reduce((s, n) => s + (n - mu) ** 2, 0) / rets.length;
  const sigma = Math.sqrt(Math.max(variance, 1e-8));
  const steps = 150;
  const count = 96;
  const last = hist[hist.length - 1];
  const rand = rng(Math.round(last * 100));
  const paths = [];
  for (let p = 0; p < count; p += 1) {
    const path = new Array(steps + 1);
    path[0] = last;
    let price = last;
    const zBias = (rand() - 0.5) * 0.22;
    for (let s = 1; s <= steps; s += 1) {
      price *= Math.exp(mu + sigma * gauss(rand));
      path[s] = price;
    }
    path.zBias = zBias;
    paths.push(path);
  }
  const low = [];
  const high = [];
  const mid = [];
  for (let s = 0; s <= steps; s += 1) {
    const col = paths.map((path) => path[s]).sort((a, b) => a - b);
    low.push(col[Math.floor(col.length * 0.12)]);
    high.push(col[Math.floor(col.length * 0.88)]);
    mid.push(col[Math.floor(col.length * 0.5)]);
  }

  const logs = hist.map(Math.log).concat(low.map(Math.log), high.map(Math.log));
  const y0 = Math.min(...logs);
  const y1 = Math.max(...logs);
  const yOf = (price) => ((Math.log(price) - y0) / (y1 - y0)) * 1.7 - 0.85;
  const histX = (i) => (i / (hist.length - 1)) * 1.55 - 1.55;
  const futX = (s) => (s / steps) * 1.25;
  const zOf = (s, bias) => bias * (s / steps);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (err) {
    stage.textContent = 'btc history unavailable';
    return;
  }
  renderer.setClearColor(0x000000, 0);
  stage.replaceChildren(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  const target = new THREE.Vector3(0.05, 0, 0);
  let azimuth = 0.42;
  let polar = 1.08;
  const radius = 3.35;

  const gold = 0xffd700;
  const teal = 0x1aadb3;

  const histGeom = new THREE.BufferGeometry();
  const histPos = new Float32Array(hist.length * 3);
  hist.forEach((price, i) => {
    histPos[i * 3] = histX(i);
    histPos[i * 3 + 1] = yOf(price);
    histPos[i * 3 + 2] = 0;
  });
  histGeom.setAttribute('position', new THREE.BufferAttribute(histPos, 3));
  scene.add(new THREE.Line(histGeom, new THREE.LineBasicMaterial({ color: gold })));

  const fanGeom = new THREE.BufferGeometry();
  const fanPos = new Float32Array(count * steps * 2 * 3);
  let cursor = 0;
  for (let s = 0; s < steps; s += 1) {
    paths.forEach((path) => {
      fanPos[cursor++] = futX(s);
      fanPos[cursor++] = yOf(path[s]);
      fanPos[cursor++] = zOf(s, path.zBias);
      fanPos[cursor++] = futX(s + 1);
      fanPos[cursor++] = yOf(path[s + 1]);
      fanPos[cursor++] = zOf(s + 1, path.zBias);
    });
  }
  fanGeom.setAttribute('position', new THREE.BufferAttribute(fanPos, 3));
  fanGeom.setDrawRange(0, 0);
  const fan = new THREE.LineSegments(fanGeom, new THREE.LineBasicMaterial({
    color: teal,
    transparent: true,
    opacity: 0.28
  }));
  scene.add(fan);

  const midGeom = new THREE.BufferGeometry();
  const midPos = new Float32Array((steps + 1) * 3);
  mid.forEach((price, s) => {
    midPos[s * 3] = futX(s);
    midPos[s * 3 + 1] = yOf(price);
    midPos[s * 3 + 2] = 0;
  });
  midGeom.setAttribute('position', new THREE.BufferAttribute(midPos, 3));
  midGeom.setDrawRange(0, 0);
  scene.add(new THREE.Line(midGeom, new THREE.LineBasicMaterial({ color: gold })));

  const glowPos = [];
  const glowIdx = [];
  for (let s = 0; s < steps; s += 1) {
    const x0 = futX(s);
    const x1 = futX(s + 1);
    const z0 = 0.05 + 0.55 * (s / steps);
    const z1 = 0.05 + 0.55 * ((s + 1) / steps);
    const base = glowPos.length / 3;
    glowPos.push(x0, yOf(low[s]), -z0, x0, yOf(high[s]), z0, x1, yOf(low[s + 1]), -z1, x1, yOf(high[s + 1]), z1);
    glowIdx.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
  }
  const glowGeom = new THREE.BufferGeometry();
  glowGeom.setAttribute('position', new THREE.Float32BufferAttribute(glowPos, 3));
  glowGeom.setIndex(glowIdx);
  glowGeom.computeVertexNormals();
  const glow = new THREE.Mesh(glowGeom, new THREE.MeshBasicMaterial({
    color: teal,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false
  }));
  scene.add(glow);

  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 2.05),
    new THREE.MeshBasicMaterial({
      color: 0xd7fff8,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false
    })
  );
  wall.rotation.y = Math.PI / 2;
  scene.add(wall);
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(wall.geometry),
    new THREE.LineBasicMaterial({ color: 0x1aadb3, transparent: true, opacity: 0.45 })
  );
  wall.add(edge);

  const nowDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.028, 12, 12),
    new THREE.MeshBasicMaterial({ color: gold })
  );
  nowDot.position.set(0, yOf(last), 0);
  scene.add(nowDot);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reveal = reduce ? 1 : 0;
  let running = false;
  let frame = 0;
  let visible = true;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const started = performance.now();

  function applyReveal(amount) {
    const stepsShown = Math.max(0, Math.min(steps, Math.round(amount * steps)));
    fanGeom.setDrawRange(0, stepsShown * count * 2);
    midGeom.setDrawRange(0, Math.max(stepsShown + 1, 1));
    glow.material.opacity = 0.16 * amount;
  }

  function placeCamera() {
    camera.position.set(
      target.x + radius * Math.sin(polar) * Math.sin(azimuth),
      target.y + radius * Math.cos(polar),
      radius * Math.sin(polar) * Math.cos(azimuth)
    );
    camera.lookAt(target);
  }

  function resize() {
    const width = stage.clientWidth || 320;
    const height = stage.clientHeight || 220;
    const ratio = Math.min(window.devicePixelRatio || 1, width < 500 ? 1 : 1.5);
    renderer.setPixelRatio(ratio);
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  function render() {
    placeCamera();
    renderer.render(scene, camera);
  }

  function loop(now) {
    frame = 0;
    if (!visible) return;
    if (!reduce) {
      reveal = Math.min(1, (now - started) / 2800);
      azimuth += 0.0016;
    }
    applyReveal(reveal);
    render();
    if (!reduce && visible) frame = requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    if (reduce) {
      applyReveal(1);
      render();
      return;
    }
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  resize();
  applyReveal(reveal);
  render();
  new ResizeObserver(resize).observe(stage);
  const seen = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) start();
    else stop();
  }, { threshold: 0.05 });
  seen.observe(stage);

  stage.addEventListener('pointerdown', (event) => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointerup', () => { dragging = false; });
  stage.addEventListener('pointercancel', () => { dragging = false; });
  stage.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const dx = event.clientX - lastX;
    const dy = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    if (Math.abs(dx) < Math.abs(dy)) return;
    azimuth -= dx * 0.005;
    if (reduce) render();
  });
}
