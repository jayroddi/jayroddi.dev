// Brain entrance: sequence, wave, and the unlock note that stays off.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BURST_MS, BURST_REDUCED_MS, CODE, EXPLODE_MS, EXPLODE_REDUCED_MS, GOLD_SPIN_RAD_S, REBUILD_MS,
  SPEED_RAD_S, WAVE_MS, advanceWave, autoSpin, controlView, createPad, frameMetrics,
  gesturesAllowed, goldAmount, graphZoomAllowed, keyboardPress, linkAppear, nodeAppear,
  padTone, padVisible, paintedColor, playDuration, playFrame, pointScaleFor, pressPad,
  releasePad, revealAllowed, shaking, shouldCelebrate, speedOf, spinSign, turnAxis, waveDuration
} from '../site/brain/gate.js';
import {
  CLASS_HEX, CLASS_RGB, GOLD_RGB, PERIPHERY, TEAL, assignClasses, colorForNode,
  nodeClass, presentClasses, pulseHubs, sanitizeColors
} from '../site/brain/palette.js';
import { layout } from '../site/brain/layout.js';
import {
  UNLOCK_ENABLED, buildClientPing, coarseClient, disclosureNeeded, maybeNotify, sanitizeReferrer
} from '../site/brain/unlock-client.js';
import { unlockConfig } from '../server/brain-unlock/config.mjs';
import { clientIp, handleUnlock } from '../server/brain-unlock/handler.mjs';

const root = new URL('..', import.meta.url);

function read(path) {
  return fs.readFileSync(new URL(path, root), 'utf8');
}

function walk(value, path) {
  if (typeof value === 'string') throw new Error('string at ' + path);
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, path + '[' + i + ']'));
    return;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (typeof key !== 'string') throw new Error('bad key');
      walk(value[key], path + '.' + key);
    }
  }
}

const graph = JSON.parse(read('site/brain/graph.json'));
walk(graph, 'graph');
assert.equal(graph.v, 1);
assert.equal(graph.nodes.length, 5659);
assert.equal(graph.links.length, 5871);
const groups = [0, 0, 0, 0];
for (const node of graph.nodes) {
  assert.deepEqual(Object.keys(node).sort(), ['g', 'id']);
  assert.ok(node.g >= 0 && node.g <= 3);
  groups[node.g] += 1;
}
assert.deepEqual(groups, [1591, 2929, 767, 372]);
for (const link of graph.links) assert.deepEqual(Object.keys(link).sort(), ['s', 't']);

assert.equal(CLASS_HEX.teal, '#1AADB3');
assert.equal(CLASS_HEX.orange, '#EC5B32');
assert.equal(CLASS_HEX.purple, '#6E2BFF');
assert.equal(CLASS_HEX.pink, '#EA33E3');
assert.deepEqual(CLASS_RGB.teal, TEAL);
assert.equal(Math.round(TEAL[0] * 255), 26);
assert.equal(Math.round(TEAL[1] * 255), 173);
assert.equal(Math.round(TEAL[2] * 255), 179);
assert.doesNotMatch(read('site/brain/palette.js'), /obsidian hex|exact match/i);

const colors = JSON.parse(read('site/brain/colors.json'));
const colorValues = Object.values(colors);
assert.equal(Object.keys(colors).length, 5659);
assert.deepEqual(
  colorValues.reduce((acc, name) => { acc[name] = (acc[name] || 0) + 1; return acc; }, {}),
  { purple: 1556, pink: 2919, orange: 945, teal: 239 }
);
for (const value of colorValues) assert.match(value, /^(purple|pink|orange|teal)$/);
const graphIds = new Set(graph.nodes.map((node) => String(node.id)));
assert.deepEqual(new Set(Object.keys(colors)), graphIds);
const sourcePaint = assignClasses(graph.nodes, colors);
assert.equal(sourcePaint.rendered, 5659);
assert.deepEqual(sourcePaint.counts, { purple: 1556, pink: 2919, orange: 945, teal: 239 });
const positions = layout(graph.nodes, graph.links);
const shown = presentClasses(graph.nodes, positions);
assert.equal(shown.rendered, 5659);
assert.equal(shown.classes.length, graph.nodes.length);
const shownTotal = shown.counts.teal + shown.counts.pink + shown.counts.purple + shown.counts.orange;
assert.equal(shownTotal, 5659);
assert.ok(shown.counts.teal > 1200);
assert.ok(shown.counts.pink > 400 && shown.counts.purple > 400 && shown.counts.orange > 80);
assert.ok(shown.counts.orange < shown.counts.pink && shown.counts.orange < shown.counts.purple);
let maxR = 0;
const radius = graph.nodes.map((_, i) => {
  const value = Math.hypot(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
  if (value > maxR) maxR = value;
  return value;
});
for (let i = 0; i < graph.nodes.length; i++) {
  if (radius[i] > PERIPHERY * maxR) assert.equal(shown.classes[i], 'teal');
}
const mean = (name) => {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < shown.classes.length; i++) {
    if (shown.classes[i] !== name) continue;
    sum += radius[i];
    count += 1;
  }
  return sum / count;
};
assert.ok(mean('pink') < mean('teal') && mean('purple') < mean('teal') && mean('orange') < mean('teal'));
assert.notDeepEqual(shown.counts, sourcePaint.counts);
const missing = presentClasses([{ id: 1, g: 0 }, { id: 2 }], null);
assert.deepEqual(missing.classes, ['teal', 'teal']);
assert.equal(missing.rendered, 2);
assert.equal(nodeClass(1, { 1: 'nope' }), 'teal');
assert.equal(nodeClass(2, {}), 'teal');
assert.equal(nodeClass(9, sanitizeColors({ 9: 'purple', note: 'secret', 10: 'blue' })), 'purple');
assert.deepEqual(sanitizeColors({ 10: 'blue', folder: 'pink' }), {});
for (const name of ['purple', 'pink', 'orange', 'teal']) {
  assert.deepEqual(paintedColor(CLASS_RGB[name], 1, [9, 8, 7], GOLD_RGB), [...GOLD_RGB]);
}

assert.equal(SPEED_RAD_S.length, 11);
assert.deepEqual([...SPEED_RAD_S], [0.10, 0.18, 0.28, 0.40, 0.54, 0.70, 0.88, 1.08, 1.30, 1.52, 1.75]);
for (let i = 1; i < SPEED_RAD_S.length; i++) assert.ok(SPEED_RAD_S[i] > SPEED_RAD_S[i - 1]);
assert.equal(WAVE_MS, 5000);
assert.equal(waveDuration(''), 5000);
assert.equal(waveDuration('?wave=5'), 5000);
assert.equal(waveDuration('?wave=3'), 3000);
assert.equal(waveDuration('?wave=4'), 5000);
assert.equal(waveDuration('?wave=0'), 5000);

let pad = createPad();
assert.equal(padTone(pad.run.phase, pad.bad), 'teal');
assert.equal(speedOf(pad.run, false), SPEED_RAD_S[0]);
assert.equal(speedOf(pad.run, true), 0);
assert.equal(pressPad(pad, 'x', 0, 'keyboard', false).result, 'ignore');
assert.equal(pressPad(pad, 'enter', 0, 'keyboard', false).result, 'ignore');
assert.equal(keyboardPress({ key: 'ArrowUp', repeat: true }), null);
assert.equal(keyboardPress({ key: 'ArrowUp', repeat: false }), 'up');
assert.equal(keyboardPress({ key: 'B' }), 'b');

const early = pressPad(pad, 'start', 0, 'button', false);
assert.equal(early.result, 'reset');
assert.equal(early.pad.run.prefix, 0);
assert.equal(early.pad.bad, true);
assert.equal(padTone(early.pad.run.phase, early.pad.bad), 'bad');
assert.equal(pressPad(early.pad, 'up', 100, 'button', false).result, 'locked');
const afterBlink = pressPad(releasePad(early.pad, 540), 'up', 540, 'button', false);
assert.equal(afterBlink.result, 'advance');
assert.equal(speedOf(afterBlink.pad.run, true), 0);

pad = createPad();
pad = pressPad(pad, 'up', 1, 'button', false).pad;
pad = pressPad(pad, 'up', 2, 'button', false).pad;
assert.equal(pad.run.prefix, 2);
assert.equal(pad.run.direction, 'up');
assert.equal(speedOf(pad.run, false), SPEED_RAD_S[2]);
assert.equal(padTone(pad.run.phase, pad.bad), 'gold');
const third = pressPad(pad, 'up', 3, 'button', false);
assert.equal(third.result, 'reset');
assert.equal(third.pad.run.prefix, 0);
assert.equal(third.pad.run.direction, null);
assert.equal(speedOf(third.pad.run, false), SPEED_RAD_S[0]);
assert.equal(padTone(releasePad(third.pad, 600).run.phase, false), 'teal');

pad = createPad();
pad = pressPad(pad, 'up', 1, 'button', false).pad;
pad = pressPad(pad, 'up', 2, 'button', false).pad;
assert.equal(pressPad(pad, 'start', 3, 'button', false).result, 'reset');
assert.equal(pressPad(createPad(), 'a', 0, 'button', false).result, 'reset');

pad = createPad();
let t = 1000;
const dirs = [];
for (const key of CODE) {
  const before = speedOf(pad.run, false);
  const out = pressPad(pad, key, t, 'button', false);
  assert.notEqual(out.result, 'reset', key);
  pad = out.pad;
  if (key !== 'start') assert.ok(speedOf(pad.run, false) > before);
  if (key === 'b') {
    assert.equal(pad.run.flip, true);
    assert.equal(pad.run.phase, 'go');
    assert.equal(speedOf(pad.run, false), SPEED_RAD_S[9]);
    assert.equal(spinSign(pad.run).sign, -turnAxis('right').sign);
    assert.equal(shaking(pad.run), false);
  }
  if (key === 'a') {
    assert.equal(pad.run.flip, true);
    assert.equal(shaking(pad.run), true);
    assert.equal(speedOf(pad.run, false), SPEED_RAD_S[10]);
  }
  dirs.push(pad.run.direction);
  t += 100;
}
assert.deepEqual(dirs, ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'right', 'right', 'right']);
assert.equal(pad.run.phase, 'wave');
assert.equal(shaking(pad.run), false);
assert.equal(pad.run.flip, true);
assert.equal(pad.run.prefix, 11);
assert.equal(speedOf(pad.run, false), SPEED_RAD_S[10]);
assert.equal(pad.run.durationMs, 1000);
assert.equal(pressPad(pad, 'up', 9000, 'button', false).result, 'locked');
assert.equal(pressPad(pad, 'start', 9000, 'button', false).result, 'locked');

let typed = createPad();
let at = 0;
for (const key of CODE.slice(0, -1)) {
  typed = pressPad(typed, key, at, 'keyboard', false).pad;
  at += 10;
}
const entered = pressPad(typed, 'enter', at, 'keyboard', false);
assert.equal(entered.result, 'start');
assert.equal(entered.pad.run.direction, 'right');
assert.equal(speedOf(entered.pad.run, false), SPEED_RAD_S[10]);
assert.deepEqual(turnAxis('up'), { axis: 'right', sign: -1, idle: false });
assert.deepEqual(turnAxis('down'), { axis: 'right', sign: 1, idle: false });
assert.deepEqual(turnAxis('left'), { axis: 'up', sign: 1, idle: false });
assert.deepEqual(turnAxis('right'), { axis: 'up', sign: -1, idle: false });
assert.equal(turnAxis(null).idle, true);
assert.equal(turnAxis(entered.pad.run.direction).axis, 'up');

const radii = [0, 10, 25, 50, 75, 90, 100];
for (const elapsed of [0, 500, 1000, 2500, 4000, 4999]) {
  let prev = 2;
  for (const radius of radii) {
    const amount = goldAmount(radius, elapsed, 100, 5000);
    assert.ok(amount <= prev + 1e-9, elapsed + ' ' + radius);
    prev = amount;
  }
}
for (const radius of [0, 50, 100, 140]) {
  assert.equal(goldAmount(radius, 0, 100, 5000), 0);
  assert.equal(goldAmount(radius, 5000, 100, 5000), 1);
  assert.equal(goldAmount(radius, 8000, 100, 5000), 1);
}
assert.equal(goldAmount(0, 2500, 100, 5000), 1);
assert.ok(goldAmount(100, 2500, 100, 5000) < 1);
assert.equal(goldAmount(100, 3000, 100, 3000), 1);
assert.ok(goldAmount(100, 2999, 100, 3000) < 1);
assert.deepEqual(paintedColor([0.2, 0.3, 0.4], 1, [9, 8, 7], [1, 0.84, 0]), [1, 0.84, 0]);

const mid = advanceWave(pad.run, pad.run.startAt + 4999, 5000);
assert.equal(mid.phase, 'wave');
assert.equal(controlView(mid.phase).arrow, false);
assert.equal(controlView(mid.phase).pad, false);
assert.equal(padVisible(mid.phase, 4999, false), false);
assert.equal(revealAllowed(mid.phase, 'scroll'), false);
assert.equal(revealAllowed(mid.phase, 'arrow'), false);
assert.equal(revealAllowed(mid.phase, 'hash'), false);
const done = advanceWave(pad.run, pad.run.startAt + 5000, 5000);
assert.equal(done.phase, 'open');
assert.equal(controlView(done.phase).pad, false);
assert.equal(controlView(done.phase).arrow, true);
assert.equal(revealAllowed(done.phase, 'scroll'), true);
assert.equal(revealAllowed(done.phase, 'arrow'), true);
assert.equal(revealAllowed(done.phase, 'hash'), false);
assert.equal(speedOf(done, false), SPEED_RAD_S[10]);
assert.equal(speedOf(done, true), 0);
assert.equal(goldAmount(100, 4999, 100, 5000) < 1, true);

assert.equal(UNLOCK_ENABLED, false);
assert.equal(disclosureNeeded(false), false);
assert.equal(disclosureNeeded(UNLOCK_ENABLED), false);
assert.deepEqual(sanitizeReferrer('https://ex.com/a/b?token=1#h'), { origin: 'https://ex.com', path: '/a/b' });
assert.equal(sanitizeReferrer('javascript:alert(1)'), null);
assert.deepEqual(coarseClient('Mozilla/5.0 (iPhone) AppleWebKit Version/17 Safari/605'), { browser: 'safari', device: 'mobile' });
assert.deepEqual(coarseClient('Mozilla/5.0 Chrome/120.0 Safari/537'), { browser: 'chrome', device: 'desktop' });

const session = '00000000-0000-4000-8000-000000000001';
const event = '00000000-0000-4000-8000-000000000002';
const ping = buildClientPing({
  sessionId: session,
  eventId: event,
  durationMs: 1000,
  lang: 'en-US',
  tz: 'America/Chicago',
  viewport: { w: 1280.2, h: 800 },
  referrer: 'https://a.test/x?secret=1',
  page: '/brain/',
  ua: 'Mozilla/5.0 Chrome/120.0',
  ip: '203.0.113.10',
  gps: { lat: 1 }
});
assert.equal(ping.ip, undefined);
assert.equal(ping.gps, undefined);
assert.equal(ping.ua, undefined);
assert.deepEqual(ping.referrer, { origin: 'https://a.test', path: '/x' });
assert.deepEqual(ping.client, { browser: 'chrome', device: 'desktop' });
assert.deepEqual(ping.viewport, { w: 1280, h: 800 });

let calls = 0;
let sets = 0;
const off = await maybeNotify(ping, {
  enabled: false,
  transport() { calls += 1; throw new Error('network'); },
  store: { get() { return null; }, set() { sets += 1; } }
});
assert.deepEqual(off, { sent: false, reason: 'disabled' });
assert.equal(calls, 0);
assert.equal(sets, 0);

const sent = [];
const memory = new Map();
const store = {
  get(key) { return memory.has(key) ? memory.get(key) : null; },
  set(key, value) { memory.set(key, value); }
};
const first = await maybeNotify(ping, { enabled: true, transport(body) { sent.push(body); }, store, dedupeKey: 'brain-unlock-sent' });
const second = await maybeNotify(ping, { enabled: true, transport(body) { sent.push(body); }, store, dedupeKey: 'brain-unlock-sent' });
assert.equal(first.sent, true);
assert.deepEqual(second, { sent: false, reason: 'deduped' });
assert.equal(sent.length, 1);
const none = await maybeNotify(ping, { enabled: true, store: { get() { return null; }, set() {} } });
assert.equal(none.reason, 'no-transport');
assert.equal(calls, 0);

assert.equal(unlockConfig.enabled, false);
assert.equal(unlockConfig.email, false);
assert.equal(unlockConfig.trustProxy, false);
assert.deepEqual(unlockConfig.trustedProxies, []);
assert.equal(unlockConfig.recipient, 'hi@jayroddi.dev');
assert.equal(unlockConfig.retentionDays, 14);

const mailed = [];
const disabled = await handleUnlock({
  method: 'POST',
  headers: { origin: 'https://jayroddi.dev', 'content-type': 'application/json' },
  socketAddress: '203.0.113.10',
  body: ping
}, unlockConfig, { mailer() { mailed.push('x'); } });
assert.equal(disabled.status, 404);
assert.equal(disabled.record, null);
assert.equal(mailed.length, 0);

function request(body, extra = {}) {
  return {
    method: 'POST',
    headers: { origin: 'https://jayroddi.dev', 'content-type': 'application/json', ...(extra.headers || {}) },
    socketAddress: extra.socketAddress || '203.0.113.10',
    rawLength: extra.rawLength,
    body
  };
}
const live = { ...unlockConfig, enabled: true, email: false, allowedOrigins: ['https://jayroddi.dev'] };
const rates = new Map();
const seen = new Set();
const ok = await handleUnlock(request(ping, { headers: { 'x-forwarded-for': '198.51.100.5' } }), live, {
  now: Date.parse('2026-11-07T17:00:00.000Z'),
  rates,
  seen,
  mailer() { mailed.push('y'); }
});
assert.equal(ok.status, 202);
assert.equal(ok.mailed, false);
assert.equal(ok.record.ip, '203.0.113.10');
assert.equal(ok.record.ipLocation, null);
assert.equal(ok.record.t, '2026-11-07T17:00:00.000Z');
assert.equal(ok.body.ip, undefined);
assert.equal(JSON.stringify(ok.body).includes('203.0.113'), false);
assert.equal(mailed.length, 0);
assert.equal(clientIp({ socketAddress: '203.0.113.10', headers: { 'x-forwarded-for': '198.51.100.5' } }, live), '203.0.113.10');
assert.equal(clientIp({
  socketAddress: '10.0.0.1',
  headers: { 'x-forwarded-for': '198.51.100.5' }
}, { ...live, trustProxy: true, trustedProxies: ['10.0.0.1'] }), '198.51.100.5');

const again = await handleUnlock(request({ ...ping, eventId: '00000000-0000-4000-8000-000000000003' }), live, { rates, seen, mailer() { mailed.push('z'); } });
assert.equal(again.body.deduped, true);
assert.equal(mailed.length, 0);

for (const extra of ['ip', 'ua', 'gps', 'note', 'recipient', 'company']) {
  const bad = await handleUnlock(request({ ...ping, sessionId: '00000000-0000-4000-8000-0000000000aa', [extra]: 'secret' }), live, { rates: new Map(), seen: new Set(), mailer() { mailed.push(extra); } });
  assert.equal(bad.status, 400, extra);
}
assert.equal(mailed.length, 0);
assert.equal((await handleUnlock(request(ping, { headers: { origin: 'https://evil.test' } }), live, { rates: new Map(), seen: new Set() })).status, 403);
assert.equal((await handleUnlock(request(ping, { rawLength: 3000 }), live, { rates: new Map(), seen: new Set() })).status, 413);

const flood = new Map();
const floodSeen = new Set();
for (let i = 0; i < 5; i++) {
  const id = '00000000-0000-4000-8000-00000000001' + i;
  const res = await handleUnlock(request({ ...ping, sessionId: id, eventId: id }), live, { rates: flood, seen: floodSeen });
  assert.equal(res.status, 202);
}
assert.equal((await handleUnlock(request({ ...ping, sessionId: '00000000-0000-4000-8000-000000000099', eventId: '00000000-0000-4000-8000-000000000099' }), live, { rates: flood, seen: floodSeen })).status, 429);

let letters = 0;
const withMail = { ...live, email: true, recipient: 'hi@jayroddi.dev' };
const noMailer = await handleUnlock(request({ ...ping, sessionId: '00000000-0000-4000-8000-0000000000ab', eventId: '00000000-0000-4000-8000-0000000000ac' }), withMail, { rates: new Map(), seen: new Set() });
assert.equal(noMailer.status, 503);
assert.equal(noMailer.mailed, false);
const posted = await handleUnlock(request({ ...ping, sessionId: '00000000-0000-4000-8000-0000000000ad', eventId: '00000000-0000-4000-8000-0000000000ae', recipient: 'evil@example.com' }), withMail, {
  rates: new Map(),
  seen: new Set(),
  mailer({ to, record }) {
    letters += 1;
    assert.equal(to, 'hi@jayroddi.dev');
    assert.equal(record.ip, '203.0.113.10');
  }
});
assert.equal(posted.status, 400);

const clean = { ...ping, sessionId: '00000000-0000-4000-8000-0000000000ad', eventId: '00000000-0000-4000-8000-0000000000ae' };
const postedOk = await handleUnlock(request(clean), withMail, {
  rates: new Map(),
  seen: new Set(),
  mailer({ to }) {
    letters += 1;
    assert.equal(to, 'hi@jayroddi.dev');
  }
});
assert.equal(postedOk.status, 202);
assert.equal(postedOk.mailed, true);
assert.equal(letters, 1);
const postedAgain = await handleUnlock(request({ ...clean, eventId: '00000000-0000-4000-8000-0000000000af' }), withMail, {
  rates: new Map(),
  seen: new Set([clean.sessionId]),
  mailer() { letters += 1; }
});
assert.equal(postedAgain.body.deduped, true);
assert.equal(letters, 1);

const brainJs = read('site/brain/brain.js');
const brainHtml = read('site/brain/index.html');
const nowHtml = read('site/now/index.html');
const client = read('site/brain/unlock-client.js');
assert.equal(brainJs.split('fetch(').length, 2);
assert.match(brainJs, /fetch\('graph\.json'/);
assert.match(brainJs, /presentClasses/);
assert.doesNotMatch(brainJs, /GROUP_RGB|colorForNode|OrbitControls|graph\.synthetic|enableDamping/);
assert.doesNotMatch(client, /fetch\(/);
assert.equal(UNLOCK_ENABLED, false);
for (const file of ['site/brain/brain.js', 'site/brain/index.html', 'site/brain/gate.js', 'site/brain/unlock-client.js', 'site/brain/palette.js', 'site/now/index.html', 'site/now/now.css']) {
  assert.doesNotMatch(read(file), /hi@jayroddi\.dev/);
  assert.doesNotMatch(read(file), /path:journal|xavier|nori|moments/i);
}
assert.match(brainHtml, /rel="canonical" href="https:\/\/jayroddi\.dev\/brain\/"/);
assert.match(brainHtml, /scroll-hint brain-next" hidden/);
assert.match(brainHtml, /class="now-sheet" id="now" hidden/);
assert.match(brainHtml, /data-k="start"/);
assert.doesNotMatch(brainHtml, /location\.replace/);
assert.match(nowHtml, /rel="canonical" href="https:\/\/jayroddi\.dev\/now\/"/);
assert.doesNotMatch(nowHtml, /location\.replace/);
const nowLines = [
  "what's up, fellow nerd! here's my prio list right meow:",
  'loving life - myself, my kids, all the organic, genuine connections',
  'having full trust in god / the universe (new for me)',
  'building apps, building companies, building the future',
  'getting rid of dad bod #2',
  'finishing up spaceX juniper so i can move onto the next project',
  'launching mideeyah as invite-only soon',
  'pushing midehyah to later next year',
  'absolutely loving the yeti mt - likely the best all-trail mountain bike in the world right now',
  'probably gonna look for a "real job" again soon because i kinda need to',
  'likely spending a lot of time thinking about someone incredibly special and wondering how to approach the situation'
];
for (const line of nowLines) {
  assert.equal(brainHtml.includes(line), true, line);
  assert.equal(nowHtml.includes(line), true, line);
}
assert.equal((brainHtml.match(/<li>/g) || []).length, nowLines.length - 1);
assert.equal((nowHtml.match(/<li>/g) || []).length, nowLines.length - 1);
assert.doesNotMatch(brainHtml, /you found me|authentic connections|playlist/);
assert.doesNotMatch(nowHtml, /you found me|authentic connections|playlist/);
assert.match(nowHtml, /mideeyah as invite-only/);
assert.match(nowHtml, /midehyah to later/);
assert.doesNotMatch(brainHtml, /coming soon|now writeup is not in the repo/i);
assert.doesNotMatch(nowHtml, /coming soon|now writeup is not in the repo/i);
assert.match(nowHtml, /noindex/);
const shellCss = read('site/assets/shell.css');
const brainCss = read('site/brain/brain.css');
assert.match(shellCss, /\.tabs a,\nbody\.is-brain \.pad-cue \{\n  color: #1AADB3;\n  font-family: var\(--mono\);\n  font-size: 12px;\n  font-weight: 500;\n  font-style: italic;/);
assert.match(shellCss, /\.tabs a,\n  body\.is-brain \.pad-cue \{ font-size: 11px; \}/);
assert.doesNotMatch(brainCss, /\.pad-cue \{[^}]*font-style:\s*normal/);
assert.match(shellCss, /body\.is-grind \.copy \{[^}]*background: rgba\(0, 0, 0, \.94\);/);
assert.match(shellCss, /\.soft \{[^}]*background: rgba\(0, 0, 0, \.94\);/);
const brainHint = brainCss.slice(brainCss.indexOf('@keyframes brain-scroll-hint'), brainCss.indexOf('body.is-brain::after'));
assert.match(brainCss, /body\.is-brain button\.scroll-hint \{[^}]*color: #FFD700;/);
assert.match(brainHint, /rgba\(255, 215, 0/);
assert.match(brainHint, /#FFE066/);
assert.doesNotMatch(brainHint, /#FF4D1A/);

assert.equal(gesturesAllowed(createPad().run), true);
assert.equal(graphZoomAllowed(), false);
let gesturePad = createPad();
gesturePad = pressPad(gesturePad, 'up', 1, 'button', false).pad;
assert.equal(gesturePad.run.phase, 'go');
assert.equal(gesturesAllowed(gesturePad.run), false);
gesturePad = pressPad(gesturePad, 'down', 2, 'button', false).pad;
assert.equal(gesturePad.run.phase, 'idle');
assert.equal(gesturesAllowed(gesturePad.run), true);
const started = CODE.reduce((state, key, i) => pressPad(state, key, i, 'button', false).pad, createPad());
assert.equal(started.run.phase, 'wave');
assert.equal(gesturesAllowed(started.run), false);
assert.equal(gesturesAllowed(advanceWave(started.run, started.run.startAt + 5000, 5000)), true);
assert.equal(shouldCelebrate('start', false), true);
assert.equal(shouldCelebrate('start', true), false);
assert.equal(shouldCelebrate('advance', false), false);
assert.equal(shouldCelebrate('reset', false), false);
assert.equal(shouldCelebrate('ignore', false), false);
assert.doesNotMatch(brainJs, /enableZoom|zoomSpeed|DOLLY/);
assert.match(brainJs, /shouldCelebrate/);
assert.doesNotMatch(brainHtml, /<h[12][^>]*>\s*now\s*<\/h[12]>/i);
assert.doesNotMatch(nowHtml, /<h[12][^>]*>\s*now\s*<\/h[12]>/i);
assert.doesNotMatch(brainHtml, />\/now\/</);
assert.match(brainHtml, /drag to turn the brain/);
assert.doesNotMatch(brainHtml, /does not drag/);
assert.match(read('site/now/now.css'), /body\.is-brain\.is-gold[\s\S]*#FFD700/);
assert.match(read('site/now/now.css'), /body\.is-now[\s\S]*#FFD700/);
assert.doesNotMatch(read('site/index.html'), /is-gold|now\.css/);
assert.doesNotMatch(read('site/grind/index.html'), /is-gold|now\.css/);
assert.match(nowHtml, /class="board is-now is-gold"/);

assert.equal(BURST_MS, 780);
assert.equal(BURST_REDUCED_MS, 480);
assert.ok(BURST_MS < WAVE_MS);
assert.match(read('site/brain/brain.css'), /symbol-burst 780ms/);
assert.match(read('site/brain/brain.css'), /symbol-burst-still 480ms/);
assert.match(brainJs, /padVisible/);
assert.match(brainJs, /retireControls/);
assert.match(brainJs, /bootGraph/);
assert.doesNotMatch(brainJs, /high-performance/);
assert.equal(padVisible('idle', 0, false), true);
assert.equal(controlView('idle').arrow, false);
assert.equal(padVisible('go', 9999, false), true);
assert.equal(controlView('go').arrow, false);
let timing = createPad();
timing = pressPad(timing, 'up', 1, 'button', false).pad;
assert.equal(padVisible(timing.run.phase, 0, false), true);
const wrong = pressPad(timing, 'down', 2, 'button', false);
assert.equal(wrong.result, 'reset');
assert.equal(padVisible(wrong.pad.run.phase, 0, false), true);
assert.equal(shouldCelebrate(wrong.result, false), false);
const finished = CODE.reduce((state, key, i) => pressPad(state, key, 100 + i, 'button', false).pad, createPad());
assert.equal(finished.run.phase, 'wave');
assert.equal(shouldCelebrate('start', false), true);
assert.equal(shouldCelebrate('start', true), false);
assert.equal(padVisible('wave', 0, false), false);
assert.equal(padVisible('wave', BURST_MS - 1, false), false);
assert.equal(controlView('wave').arrow, false);
assert.equal(padVisible('wave', BURST_MS, false), false);
assert.equal(controlView('wave').arrow, false);
assert.equal(revealAllowed('wave', 'arrow'), false);
assert.equal(padVisible('wave', 2500, false), false);
assert.equal(goldAmount(100, 2500, 100, WAVE_MS) < 1, true);
assert.equal(controlView('wave').nowReady, false);
const opened = advanceWave(finished.run, finished.run.startAt + WAVE_MS, WAVE_MS);
assert.equal(opened.phase, 'open');
assert.equal(padVisible(opened.phase, WAVE_MS, false), false);
assert.equal(controlView(opened.phase).arrow, true);
assert.equal(controlView(opened.phase).nowReady, true);
assert.equal(goldAmount(100, WAVE_MS, 100, WAVE_MS), 1);
assert.equal(padVisible('wave', BURST_REDUCED_MS - 1, true), false);
assert.equal(padVisible('wave', BURST_REDUCED_MS, true), false);
assert.equal(controlView('wave').arrow, false);
assert.equal(speedOf(finished.run, true), 0);
assert.ok(GOLD_SPIN_RAD_S < SPEED_RAD_S[0]);
assert.equal(autoSpin(createPad().run, false), 0);
let spinning = createPad();
spinning = pressPad(spinning, 'up', 1, 'button', false).pad;
assert.equal(spinning.run.phase, 'go');
assert.equal(autoSpin(spinning.run, false), speedOf(spinning.run, false));
assert.equal(autoSpin(finished.run, false), GOLD_SPIN_RAD_S);
assert.equal(autoSpin(finished.run, true), 0);
assert.equal(autoSpin(opened, false), GOLD_SPIN_RAD_S);
assert.equal(autoSpin(opened, true), 0);
assert.equal(REBUILD_MS, 5000);
assert.equal(brainHtml.includes('f*ck around and find out:'), true);
assert.match(brainHtml, /class="pad in"[\s\S]*class="pad-cue">f\*ck around and find out:<\/p>[\s\S]*data-k="up"/);
assert.doesNotMatch(nowHtml, /f\*ck around and find out/);
assert.equal(nodeAppear(0, REBUILD_MS / 2, 100), 1);
assert.ok(nodeAppear(100, REBUILD_MS / 2, 100) < 1);
assert.equal(EXPLODE_MS, 900);
assert.equal(playDuration(false), EXPLODE_MS + REBUILD_MS);
assert.equal(playDuration(true), EXPLODE_REDUCED_MS + REBUILD_MS);
assert.equal(advanceWave(finished.run, finished.run.startAt + WAVE_MS, playDuration(false)).phase, 'wave');
assert.equal(advanceWave(finished.run, finished.run.startAt + playDuration(false), playDuration(false)).phase, 'open');
const boom = playFrame(300, 100, false);
assert.equal(boom.exploding, true);
assert.equal(boom.rebuild, 0);
assert.ok(boom.travel > 0 && boom.travel < 1);
assert.equal(playFrame(300, 100, true).travel, 0);
const rebuildMid = playFrame(EXPLODE_MS + 1500, 100, false);
assert.equal(rebuildMid.exploding, false);
assert.equal(rebuildMid.rebuild, 1);
assert.equal(rebuildMid.travel, 0);
assert.ok(nodeAppear(0, rebuildMid.rebuildElapsed, 100) > nodeAppear(100, rebuildMid.rebuildElapsed, 100));
assert.ok(nodeAppear(100, rebuildMid.rebuildElapsed, 100) < 1);
assert.equal(nodeAppear(0, REBUILD_MS, 100), 1);
assert.equal(nodeAppear(100, REBUILD_MS, 100), 1);
assert.equal(linkAppear(4, 90, rebuildMid.rebuildElapsed, 100), Math.min(nodeAppear(4, rebuildMid.rebuildElapsed, 100), nodeAppear(90, rebuildMid.rebuildElapsed, 100)));
const pulsePos = new Float32Array(12 * 3);
for (let i = 0; i < 4; i++) {
  pulsePos[i * 3] = i * 30;
  pulsePos[(4 + i) * 3] = i * 30;
  pulsePos[(4 + i) * 3 + 1] = 80;
  pulsePos[(8 + i) * 3] = i * 30;
  pulsePos[(8 + i) * 3 + 2] = 80;
}
const pulseClasses = ['pink', 'pink', 'pink', 'pink', 'purple', 'purple', 'purple', 'purple', 'orange', 'orange', 'orange', 'teal'];
const pulseDegree = [10, 40, 30, 20, 10, 50, 30, 20, 15, 60, 25, 90];
const pulsePicked = pulseHubs(pulsePos, pulseDegree, pulseClasses);
assert.equal(pulsePicked.length, 9);
const hubCounts = { pink: 0, purple: 0, orange: 0, teal: 0 };
for (const i of pulsePicked) hubCounts[pulseClasses[i]] += 1;
assert.deepEqual(hubCounts, { pink: 3, purple: 3, orange: 3, teal: 0 });
assert.equal(pointScaleFor(640, 700, 1.35, 2), 640 * 1.55);
assert.equal(pointScaleFor(390, 700, 1.35, 2), 390 * 1.55);
const narrowCover =  (640 * 1.55) / (frameMetrics(640, 700).distFactor * 1.35 * frameMetrics(640, 700).diameter);
const wideScale = pointScaleFor(1280, 699, 1.6, 2);
const wideFrame = frameMetrics(1280, 699);
const wideCover = wideScale / (wideFrame.distFactor * 1.6 * wideFrame.diameter);
assert.ok(Math.abs(wideCover - narrowCover) / narrowCover < 0.02);
assert.ok(wideScale > 699 * 0.58 * 1.8);
assert.match(brainJs, /pulseHubs/);
assert.match(brainJs, /playFrame/);
assert.match(brainJs, /pointScaleFor/);
assert.match(brainJs, /uGoldPulse/);
assert.doesNotMatch(brainJs, /hubOn\[i\] = 0/);
assert.equal(gesturesAllowed(opened), true);
const repeated = pressPad(finished, 'start', finished.run.startAt + 10, 'button', false);
assert.equal(repeated.result, 'locked');
assert.equal(shouldCelebrate(repeated.result, true), false);
assert.equal(padVisible(repeated.pad.run.phase, BURST_MS, false), false);

console.log('brain tests ok');
