/* Stylized preview. Teal is the field, including every outer node.
   Pink, purple, and orange are smaller cores inside the laid-out
   communities. This is not a per-note Obsidian coloring. colors.json
   remains the source classification and is not painted node for node.

   Teal is the site color. Pink, purple, and orange are chosen to sit
   near the reference picture. They are not claimed as stored hexes. */

export const TEAL = [0x1a / 255, 0xad / 255, 0xb3 / 255];
export const ORANGE = [0xec / 255, 0x5b / 255, 0x32 / 255];
export const PURPLE = [0x6e / 255, 0x2b / 255, 0xff / 255];
export const PINK = [0xea / 255, 0x33 / 255, 0xe3 / 255];

export const CLASS_HEX = Object.freeze({
  purple: '#6E2BFF',
  pink: '#EA33E3',
  orange: '#EC5B32',
  teal: '#1AADB3'
});

/* A node farther out than this share of the sphere is always teal.
   A community core is the ball around that community's own middle,
   not the shared center of the sphere. Reach is that ball's radius. */
export const PERIPHERY = 0.76;
export const CLUSTER_REACH = Object.freeze({ pink: 0.58, purple: 0.58, orange: 0.46 });

export const CLASS_RGB = Object.freeze({
  purple: PURPLE,
  pink: PINK,
  orange: ORANGE,
  teal: TEAL
});

export const GOLD_RGB = [255 / 255, 215 / 255, 0];

const CLASS_NAMES = new Set(['purple', 'pink', 'orange', 'teal']);

export function sanitizeColors(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const key of Object.keys(raw)) {
    if (!/^\d+$/.test(key)) continue;
    const value = raw[key];
    if (CLASS_NAMES.has(value)) out[key] = value;
  }
  return out;
}

export function nodeClass(id, table) {
  if (!table || typeof table !== 'object') return 'teal';
  const value = table[id] ?? table[String(id)];
  return CLASS_NAMES.has(value) ? value : 'teal';
}

export function colorForNode(id, table) {
  return CLASS_RGB[nodeClass(id, table)];
}

/* One source class per input node, in the same order. Nothing is dropped. */
export function assignClasses(nodes, table) {
  const counts = { purple: 0, pink: 0, orange: 0, teal: 0 };
  const classes = [];
  for (const node of nodes) {
    const name = nodeClass(node && node.id, table);
    counts[name] += 1;
    classes.push(name);
  }
  return { classes, counts, rendered: classes.length };
}

function tally(classes) {
  const counts = { purple: 0, pink: 0, orange: 0, teal: 0 };
  for (const name of classes) counts[name] += 1;
  return { classes, counts, rendered: classes.length };
}

/* Interior cores only. Outer nodes stay teal. Same length as nodes. */
export function presentClasses(nodes, positions) {
  const n = nodes.length;
  const classes = new Array(n).fill('teal');
  if (!positions || positions.length < n * 3 || !n) return tally(classes);
  const radius = new Float64Array(n);
  let maxR = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.hypot(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    radius[i] = r;
    if (r > maxR) maxR = r;
  }
  if (!(maxR > 0)) return tally(classes);
  const outer = PERIPHERY * maxR;
  const buckets = new Map();
  for (let i = 0; i < n; i++) {
    const group = Number.isInteger(nodes[i] && nodes[i].g) ? nodes[i].g : 2;
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group).push(i);
  }
  const ranked = [...buckets.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0]);
  const accentOf = new Map();
  ranked.forEach(([group], rank) => {
    accentOf.set(group, rank === 0 ? 'pink' : rank === 1 ? 'purple' : 'orange');
  });
  for (const [group, members] of buckets) {
    const accent = accentOf.get(group);
    const body = members.filter((i) => radius[i] > maxR * 0.28 && radius[i] < outer);
    const sample = body.length ? body : members.filter((i) => radius[i] < outer);
    if (!sample.length) continue;
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const i of sample) {
      cx += positions[i * 3];
      cy += positions[i * 3 + 1];
      cz += positions[i * 3 + 2];
    }
    cx /= sample.length;
    cy /= sample.length;
    cz /= sample.length;
    const reach = CLUSTER_REACH[accent] * maxR;
    const reach2 = reach * reach;
    for (const i of members) {
      if (radius[i] >= outer) continue;
      const dx = positions[i * 3] - cx;
      const dy = positions[i * 3 + 1] - cy;
      const dz = positions[i * 3 + 2] - cz;
      if (dx * dx + dy * dy + dz * dz <= reach2) classes[i] = accent;
    }
  }
  return tally(classes);
}
