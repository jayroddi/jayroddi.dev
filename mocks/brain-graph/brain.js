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

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.14, 'rgba(255,255,255,0.92)');
  grd.addColorStop(0.32, 'rgba(255,255,255,0.28)');
  grd.addColorStop(0.58, 'rgba(255,255,255,0.06)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function pointMaterial(tex) {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    uniforms: {
      uTex: { value: tex },
      uScale: { value: window.innerHeight * 0.48 }
    },
    vertexShader: `
      in float aSize;
      in vec3 aColor;
      out vec3 vColor;
      uniform float uScale;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 64.0);
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
        fragColor = vec4(vColor * a * 0.88, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
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
  for (let i = 0; i < n; i++) {
    const base = linear(GROUPS[groupOf[i]]);
    const hot = linear(towardWhite(GROUPS[groupOf[i]], 0.42));
    haloColor.set(base, i * 3);
    coreColor.set(hot, i * 3);
    const size = 10.4 + Math.sqrt(degree[i]) * 3.4;
    haloSize[i] = size;
    coreSize[i] = size * 0.4;
  }

  const pos = new THREE.BufferAttribute(positions, 3);
  const haloGeo = new THREE.BufferGeometry();
  const coreGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', pos);
  coreGeo.setAttribute('position', pos);
  haloGeo.setAttribute('aColor', new THREE.BufferAttribute(haloColor, 3));
  coreGeo.setAttribute('aColor', new THREE.BufferAttribute(coreColor, 3));
  haloGeo.setAttribute('aSize', new THREE.BufferAttribute(haloSize, 1));
  coreGeo.setAttribute('aSize', new THREE.BufferAttribute(coreSize, 1));

  const linePos = new Float32Array(links.length * 2 * 3);
  const lineCol = new Float32Array(links.length * 2 * 3);
  const dust = linear([0.62, 0.7, 0.71]);
  for (let i = 0; i < links.length; i++) {
    const a = index.get(links[i].s);
    const b = index.get(links[i].t);
    linePos.set(positions.subarray(a * 3, a * 3 + 3), i * 6);
    linePos.set(positions.subarray(b * 3, b * 3 + 3), i * 6 + 3);
    const ca = GROUPS[groupOf[a]];
    const cb = GROUPS[groupOf[b]];
    for (let k = 0; k < 3; k++) {
      lineCol[i * 6 + k] = dust[k] * 0.34 + toLinear(ca[k]) * 0.16;
      lineCol[i * 6 + 3 + k] = dust[k] * 0.34 + toLinear(cb[k]) * 0.16;
    }
  }
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));

  const renderer = new THREE.WebGLRenderer({
    antialias: window.innerWidth >= 760,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setClearColor(0x000000, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 4000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.75;
  controls.panSpeed = 0.65;
  controls.screenSpacePanning = true;
  controls.enablePan = true;
  controls.autoRotate = false;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
  };

  const tex = glowTexture();
  const haloMat = pointMaterial(tex);
  const coreMat = pointMaterial(tex);
  scene.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    toneMapped: false
  })));
  scene.add(new THREE.Points(haloGeo, haloMat));
  scene.add(new THREE.Points(coreGeo, coreMat));

  const focus = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    focus.x += positions[i * 3];
    focus.y += positions[i * 3 + 1];
    focus.z += positions[i * 3 + 2];
  }
  focus.multiplyScalar(1 / n);
  const eye = new THREE.Vector3(0.42, 0.78, 0.48).normalize();
  const view = eye.clone().negate();
  const side = new THREE.Vector3().crossVectors(view, new THREE.Vector3(0, 1, 0)).normalize();
  const camUp = new THREE.Vector3().crossVectors(side, view).normalize();
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * camera.aspect;
  let dist = 1;
  for (let i = 0; i < n; i++) {
    const dx = positions[i * 3] - focus.x;
    const dy = positions[i * 3 + 1] - focus.y;
    const dz = positions[i * 3 + 2] - focus.z;
    const px = dx * side.x + dy * side.y + dz * side.z;
    const py = dx * camUp.x + dy * camUp.y + dz * camUp.z;
    const ahead = Math.max(0, dx * eye.x + dy * eye.y + dz * eye.z);
    dist = Math.max(dist, Math.abs(px) / tanH + ahead, Math.abs(py) / tanV + ahead);
  }
  dist *= 1.18;
  camera.position.copy(focus).addScaledVector(eye, dist);
  camera.near = Math.max(0.1, dist / 100);
  camera.far = dist * 8;
  camera.updateProjectionMatrix();
  controls.target.copy(focus);
  controls.minDistance = dist * 0.2;
  controls.maxDistance = dist * 5;
  controls.update();

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

  const fit = () => {
    const scale = window.innerHeight * 0.48;
    haloMat.uniforms.uScale.value = scale;
    coreMat.uniforms.uScale.value = scale;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', fit);

  const frame = () => {
    requestAnimationFrame(frame);
    if (document.hidden) return;
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
