/* One sphere. Four color groups sit in lobes inside it, like continents.
   The outer shell is exactly round. Ids stay integers. Nothing here is drawn. */

const RADIUS = 100;

const LOBES = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1]
].map((v) => {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
});

function hash(n) {
  let x = Math.imul(n + 1, 374761393);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return (x ^ (x >>> 16)) >>> 0;
}

function unit(n, salt) {
  return hash(Math.imul(n, 131) + salt) / 4294967296;
}

function nearestLobe(x, y, z) {
  let best = 0;
  let score = -2;
  for (let g = 0; g < 4; g++) {
    const dot = x * LOBES[g][0] + y * LOBES[g][1] + z * LOBES[g][2];
    if (dot > score) {
      score = dot;
      best = g;
    }
  }
  return best;
}

function basis(lobe) {
  const up = Math.abs(lobe[1]) < 0.85 ? [0, 1, 0] : [1, 0, 0];
  let tx = lobe[1] * up[2] - lobe[2] * up[1];
  let ty = lobe[2] * up[0] - lobe[0] * up[2];
  let tz = lobe[0] * up[1] - lobe[1] * up[0];
  const len = Math.hypot(tx, ty, tz);
  tx /= len;
  ty /= len;
  tz /= len;
  const bx = lobe[1] * tz - lobe[2] * ty;
  const by = lobe[2] * tx - lobe[0] * tz;
  const bz = lobe[0] * ty - lobe[1] * tx;
  return [tx, ty, tz, bx, by, bz];
}

function cone(id, lobe, cosMin, salt) {
  const z = cosMin + (1 - cosMin) * unit(id, salt);
  const phi = Math.PI * 2 * unit(id, salt + 1);
  const s = Math.sqrt(Math.max(0, 1 - z * z));
  const [tx, ty, tz, bx, by, bz] = basis(lobe);
  const cx = Math.cos(phi);
  const sn = Math.sin(phi);
  return [
    tx * s * cx + bx * s * sn + lobe[0] * z,
    ty * s * cx + by * s * sn + lobe[1] * z,
    tz * s * cx + bz * s * sn + lobe[2] * z
  ];
}

export function layout(nodes, links) {
  const n = nodes.length;
  const index = new Map();
  const group = new Uint8Array(n);
  const degree = new Uint16Array(n);
  nodes.forEach((node, i) => {
    index.set(node.id, i);
    group[i] = node.g == null ? 2 : node.g;
  });
  links.forEach((link) => {
    degree[index.get(link.s)] += 1;
    degree[index.get(link.t)] += 1;
  });

  const buckets = [[], [], [], []];
  for (let i = 0; i < n; i++) buckets[group[i]].push(i);
  for (let g = 0; g < 4; g++) {
    buckets[g].sort((a, b) => degree[a] - degree[b] || a - b);
  }

  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  const shell = new Uint8Array(n);

  const shellCount = Math.min(980, Math.floor(n * 0.42));
  const dirs = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < shellCount; i++) {
    const yf = 1 - (i / Math.max(1, shellCount - 1)) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - yf * yf));
    const theta = golden * i;
    const dx = Math.cos(theta) * ring;
    const dz = Math.sin(theta) * ring;
    dirs.push([dx, yf, dz, nearestLobe(dx, yf, dz)]);
  }

  const cursor = [0, 0, 0, 0];
  for (let i = 0; i < dirs.length; i++) {
    const g = dirs[i][3];
    const bucket = buckets[g];
    if (cursor[g] >= bucket.length) continue;
    const idx = bucket[cursor[g]++];
    shell[idx] = 1;
    x[idx] = dirs[i][0] * RADIUS;
    y[idx] = dirs[i][1] * RADIUS;
    z[idx] = dirs[i][2] * RADIUS;
  }

  for (let g = 0; g < 4; g++) {
    const lobe = LOBES[g];
    const bucket = buckets[g];
    for (let k = cursor[g]; k < bucket.length; k++) {
      const idx = bucket[k];
      const id = nodes[idx].id;
      const hub = degree[idx] >= 8;
      const dir = cone(id, lobe, hub ? 0.78 : 0.5, 40 + g);
      const u = unit(id, 70);
      const radial = hub
        ? 0.08 + 0.42 * u
        : 0.22 + 0.72 * Math.pow(u, 0.55);
      x[idx] = dir[0] * RADIUS * radial;
      y[idx] = dir[1] * RADIUS * radial;
      z[idx] = dir[2] * RADIUS * radial;
    }
  }

  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let px = x[i];
    let py = y[i];
    let pz = z[i];
    const len = Math.hypot(px, py, pz) || 1;
    if (shell[i]) {
      px = px / len * RADIUS;
      py = py / len * RADIUS;
      pz = pz / len * RADIUS;
    } else if (len > RADIUS * 0.972) {
      const scale = (RADIUS * 0.972) / len;
      px *= scale;
      py *= scale;
      pz *= scale;
    }
    positions[i * 3] = px;
    positions[i * 3 + 1] = py;
    positions[i * 3 + 2] = pz;
  }
  return positions;
}
