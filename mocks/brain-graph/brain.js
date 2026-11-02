/* Full-viewport graph. Nodes are anonymous ids. Nothing in the file is labeled. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const ROOT = new Set(['v', 'nodes', 'links']);
const NODE = new Set(['id', 'g']);
const LINK = new Set(['s', 't']);

const GROUPS = [
  [0x1a, 0xad, 0xb3],
  [0xff, 0x4d, 0x1a],
  [0x9a, 0x84, 0x64],
  [0x6a, 0x86, 0x90]
].map((rgb) => rgb.map((channel) => channel / 255));

const host = document.getElementById('graph');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      void main() {
        float wobble = sin(uTime * (0.48 + aHub * 0.4) + aPhase) * uMotion;
        float pulse = 1.0 + (0.028 + aHub * 0.075) * wobble;
        vColor = aColor * (0.94 + (0.06 + aHub * 0.1) * wobble);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * pulse * uScale / -mv.z, 1.0, 42.0);
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
      uniform float uWidth;
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
      }
    `,
    fragmentShader: `
      precision mediump float;
      in vec3 vColor;
      in float vSide;
      in float vAlong;
      in float vPhase;
      in float vGain;
      out vec4 fragColor;
      uniform float uTime;
      uniform float uMotion;
      void main() {
        float d = abs(vSide);
        float glow = smoothstep(1.0, 0.08, d);
        float core = smoothstep(0.28, 0.0, d);
        float travel = sin(uTime * 0.42 + vAlong * 6.2 + vPhase);
        float breathe = sin(uTime * 0.31 + vPhase);
        float life = 1.0 + uMotion * (0.1 * travel + 0.08 * breathe);
        float a = (glow * 0.12 + core * 0.48) * life * vGain;
        fragColor = vec4(vColor * a, a);
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
    const base = linear(GROUPS[groupOf[i]]);
    const hot = linear(towardWhite(GROUPS[groupOf[i]], shell ? 0.28 : 0.5));
    haloColor.set(base, i * 3);
    coreColor.set(hot, i * 3);
    const size = shell ? 24 : 6.8 + hub * 11;
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
    const ca = linear(towardWhite(GROUPS[groupOf[a]], 0.42));
    const cb = linear(towardWhite(GROUPS[groupOf[b]], 0.42));
    const ph = phase(i + 17);
    const span = Math.hypot(bx - ax, by - ay, bz - az);
    const gain = 0.72 / (1 + span / 86);
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
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.7;
  controls.panSpeed = 0.6;
  controls.screenSpacePanning = true;
  controls.enablePan = true;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.62;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  const pointUniforms = {
    uTex: { value: glowTexture() },
    uScale: { value: Math.min(window.innerWidth, window.innerHeight) * 0.58 },
    uTime: { value: 0 },
    uMotion: { value: reduceMotion ? 0 : 1 }
  };
  const linkUniforms = {
    uWidth: { value: window.innerWidth < 760 ? 1.05 : 1.5 },
    uTime: { value: 0 },
    uMotion: { value: reduceMotion ? 0 : 1 }
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
  const place = () => {
    const aspect = window.innerWidth / window.innerHeight;
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    const limit = Math.min(vFov, hFov);
    const dist = (maxR * 1.16) / Math.sin(limit / 2);
    camera.aspect = aspect;
    camera.position.copy(focus).addScaledVector(eye, dist);
    camera.near = Math.max(0.1, dist / 80);
    camera.far = dist + maxR * 8;
    camera.updateProjectionMatrix();
    controls.target.copy(focus);
    controls.minDistance = dist * 0.28;
    controls.maxDistance = dist * 3.4;
    controls.update();
    pointUniforms.uScale.value = Math.min(window.innerWidth, window.innerHeight) * 0.58;
    linkUniforms.uWidth.value = window.innerWidth < 760 ? 1.05 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
  };
  place();
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    pointUniforms.uScale.value = Math.min(window.innerWidth, window.innerHeight) * 0.58;
    linkUniforms.uWidth.value = window.innerWidth < 760 ? 1.05 : 1.5;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 760 ? 1.35 : 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  let resumeAt = 0;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    resumeAt = Infinity;
  });
  controls.addEventListener('end', () => {
    resumeAt = performance.now() + 2400;
  });

  const right = new THREE.Vector3();
  renderer.domElement.addEventListener('wheel', (event) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    const distance = camera.position.distanceTo(controls.target);
    const world = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
    const step = event.deltaX * (world / renderer.domElement.clientHeight) * 0.85;
    right.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(-step);
    camera.position.add(right);
    controls.target.add(right);
  }, { passive: false });

  renderer.domElement.addEventListener('pointerdown', (event) => {
    controls.mouseButtons.LEFT = event.shiftKey ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
  }, true);
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

  const clock = new THREE.Clock();
  const frame = () => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = reduceMotion ? 0 : clock.getElapsedTime();
    const breath = reduceMotion ? 1 : 1 + Math.sin(t * 0.37) * 0.016;
    cloud.scale.setScalar(breath);
    pointUniforms.uTime.value = t;
    linkUniforms.uTime.value = t;
    if (!reduceMotion && resumeAt !== Infinity && performance.now() >= resumeAt) controls.autoRotate = true;
    controls.update();
    renderer.render(scene, camera);
  };
  frame();

  host.dataset.ready = '1';
  host.dataset.nodes = String(n);
  host.dataset.links = String(links.length);
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
