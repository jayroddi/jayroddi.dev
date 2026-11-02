/* One-shot 3D force layout. Springs, local repulsion, and a pull toward
   four fixed centers. Ids stay integers. Nothing here is drawn. */

const CENTERS = [
  [0, 6, 0],
  [168, 34, -36],
  [-138, 22, 78],
  [46, -128, 62]
];

function hash(n) {
  let x = Math.imul(n + 1, 374761393);
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return (x ^ (x >>> 16)) >>> 0;
}

function unit(n, salt) {
  return hash(Math.imul(n, 131) + salt) / 4294967296;
}

function gauss(n, salt) {
  const u = Math.max(1e-9, unit(n, salt));
  const v = unit(n, salt + 17);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
}

export function layout(nodes, links, iterations = 90) {
  const n = nodes.length;
  const index = new Map();
  const group = new Uint8Array(n);
  const degree = new Uint16Array(n);
  nodes.forEach((node, i) => {
    index.set(node.id, i);
    group[i] = node.g == null ? 2 : node.g;
  });
  const springs = new Int32Array(links.length * 2);
  links.forEach((link, i) => {
    const a = index.get(link.s);
    const b = index.get(link.t);
    springs[i * 2] = a;
    springs[i * 2 + 1] = b;
    degree[a] += 1;
    degree[b] += 1;
  });

  const x = new Float64Array(n);
  const y = new Float64Array(n);
  const z = new Float64Array(n);
  const vx = new Float64Array(n);
  const vy = new Float64Array(n);
  const vz = new Float64Array(n);
  const spread = [30, 26, 22, 18];
  for (let i = 0; i < n; i++) {
    const g = group[i];
    const c = CENTERS[g];
    const pull = 1 / (1 + Math.sqrt(degree[i]) * 0.14);
    const s = spread[g] * pull;
    const id = nodes[i].id;
    x[i] = c[0] + gauss(id, 1) * s;
    y[i] = c[1] + gauss(id, 2) * s;
    z[i] = c[2] + gauss(id, 3) * s;
  }

  const cell = 14;
  const reach = 13;
  const reach2 = reach * reach;
  const keyOf = (ix, iy, iz) => ((ix + 1024) << 20) ^ ((iy + 1024) << 10) ^ (iz + 1024);

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const springK = 0.045 * (0.35 + alpha);
    const rest = 6.5;
    const gravity = 0.01 * (0.45 + alpha);

    for (let i = 0; i < n; i++) {
      const c = CENTERS[group[i]];
      vx[i] += (c[0] - x[i]) * gravity;
      vy[i] += (c[1] - y[i]) * gravity;
      vz[i] += (c[2] - z[i]) * gravity;
    }

    for (let i = 0; i < links.length; i++) {
      const a = springs[i * 2];
      const b = springs[i * 2 + 1];
      let dx = x[b] - x[a];
      let dy = y[b] - y[a];
      let dz = z[b] - z[a];
      let dist = Math.hypot(dx, dy, dz);
      if (dist < 0.05) dist = 0.05;
      const force = (dist - rest) * springK / dist;
      const fx = dx * force;
      const fy = dy * force;
      const fz = dz * force;
      vx[a] += fx;
      vy[a] += fy;
      vz[a] += fz;
      vx[b] -= fx;
      vy[b] -= fy;
      vz[b] -= fz;
    }

    const grid = new Map();
    for (let i = 0; i < n; i++) {
      const ix = Math.floor(x[i] / cell);
      const iy = Math.floor(y[i] / cell);
      const iz = Math.floor(z[i] / cell);
      const key = keyOf(ix, iy, iz);
      const bucket = grid.get(key);
      if (bucket) bucket.push(i);
      else grid.set(key, [i]);
    }
    const rep = 1.35 * (0.35 + alpha);
    for (let i = 0; i < n; i++) {
      const ix = Math.floor(x[i] / cell);
      const iy = Math.floor(y[i] / cell);
      const iz = Math.floor(z[i] / cell);
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          for (let oz = -1; oz <= 1; oz++) {
            const bucket = grid.get(keyOf(ix + ox, iy + oy, iz + oz));
            if (!bucket) continue;
            for (let k = 0; k < bucket.length; k++) {
              const j = bucket[k];
              if (j <= i) continue;
              let dx = x[i] - x[j];
              let dy = y[i] - y[j];
              let dz = z[i] - z[j];
              let d2 = dx * dx + dy * dy + dz * dz;
              if (d2 < 0.04) {
                dx = (i - j) * 0.01 + 0.02;
                dy = 0.02;
                dz = 0.01;
                d2 = dx * dx + dy * dy + dz * dz;
              }
              if (d2 > reach2) continue;
              const dist = Math.sqrt(d2);
              const force = rep * (1 - dist / reach) / dist;
              vx[i] += dx * force;
              vy[i] += dy * force;
              vz[i] += dz * force;
              vx[j] -= dx * force;
              vy[j] -= dy * force;
              vz[j] -= dz * force;
            }
          }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      let sp = Math.hypot(vx[i], vy[i], vz[i]);
      if (sp > 3.2) {
        const scale = 3.2 / sp;
        vx[i] *= scale;
        vy[i] *= scale;
        vz[i] *= scale;
      }
      x[i] += vx[i];
      y[i] += vy[i];
      z[i] += vz[i];
      vx[i] *= 0.62;
      vy[i] *= 0.62;
      vz[i] *= 0.62;
    }
  }

  const positions = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    positions[i * 3] = x[i];
    positions[i * 3 + 1] = y[i];
    positions[i * 3 + 2] = z[i];
  }
  return positions;
}
