/* Per-node classes from colors.json. The integer bucket g is not a color.
   Those buckets mix classes, including ids the source index did not match.

   Purple and pink are preview approximations, chosen to read as vivid
   purple and vivid pink. They were not sampled from a screenshot.
   Teal and orange are the existing site colors.
   A missing id or any other class is teal. That default is not a guess
   into purple, pink, or orange.

   The class file is one export subset. It does not say the live vault
   still has this mix, and the earlier "mostly teal" description is not
   this subset. Of the 239 teal labels, 107 are unmatched ids kept teal. */

export const TEAL = [26 / 255, 173 / 255, 179 / 255];
export const ORANGE = [255 / 255, 77 / 255, 26 / 255];
export const PURPLE = [178 / 255, 75 / 255, 255 / 255];
export const PINK = [255 / 255, 77 / 255, 154 / 255];

export const CLASS_HEX = Object.freeze({
  purple: '#B24BFF',
  pink: '#FF4D9A',
  orange: '#FF4D1A',
  teal: '#1AADB3'
});

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

/* One class per input node, in the same order. Nothing is dropped. */
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
