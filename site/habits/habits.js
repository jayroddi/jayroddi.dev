/* jaytha.ninja/ (v2.37): five year graphs in one column (faith, sleep, fitness, code, journal). paths stay root-absolute so the homepage loads /habits/habits.css, /habits/habits.js, /habits/faith.json, /habits/workouts.json, /habits/cursor.json, /habits/sleep.json, /habits/journal.json, /habits/journal-jarvis.json, /daily-update/recaps.json, and /habits/trackers.json. faith is yes or no: every day from the start in faith.json through today (America/Chicago) is a full cell unless that date is listed in no. a new day is yes without a commit. five colour steps plus empty. fitness, journal, and sleep cut those steps from their own nonzero days. code uses a fixed scale set from the days since 2026-09-29. from that same day a daily update adds one note on top of the obsidian count, and the hover says "N notes". jarvis counts in journal-jarvis.json add on top of that. a jarvis day says "N journal entries", and a daily-update day keeps the note line and adds "+ N entries". a failed recaps or jarvis load keeps the counts already on the grid. a streak day uses that same scale. longest and current stay. */
(() => {
const VER = 'habits-1.84';
const TIMING = {kickerSpeed: 55, window: 4, afterKicker: 280};
const SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LOWER = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const RAIN_GLYPHS = '0123456789{}[]<>/\\=+*:;.-_#$%&@abcdefhjknrstuvxyz'.split('');
const rg = () => RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)];
const seg = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter('en', {granularity: 'grapheme'}) : null;
const graphemes = t => seg ? Array.from(seg.segment(t), x => x.segment) : Array.from(t);
const cursor = document.createElement('span'); cursor.className = 'cursor';
const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let pace = 2, skipped = false, ready = false, current = null;
const state = window.__intro = {head: 0, done: false, pace};
const final = new Map();

function parse(iso){
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}
function fmt(ms){
  const dt = new Date(ms);
  return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
}
const addDays = (iso, n) => fmt(parse(iso) + n * 86400000);
const weekday = iso => new Date(parse(iso)).getUTCDay();
function chicagoToday(){
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
}
function ordinal(n){
  const j = n % 10, k = n % 100;
  if (j === 1 && k !== 11) return n + 'st';
  if (j === 2 && k !== 12) return n + 'nd';
  if (j === 3 && k !== 13) return n + 'rd';
  return n + 'th';
}
function unitWord(n, unit){
  if (n === 1) return unit;
  if (unit === 'entry') return 'entries';
  return unit.endsWith('s') ? unit : unit + 's';
}
function sentence(n, iso, unit, minutes){
  const when = LONG[+iso.slice(5, 7) - 1] + ' ' + ordinal(+iso.slice(8));
  const head = n + ' ' + unitWord(n, unit);
  if (minutes == null) return head + ' on ' + when + '.';
  return head + ' · ' + minutes + ' min on ' + when + '.';
}
function shortDate(iso){
  return SHORT[+iso.slice(5, 7) - 1] + ' ' + (+iso.slice(8));
}
function noteLine(n, iso, day){
  const when = shortDate(iso);
  const jarvis = (day && day.jarvis) || 0;
  const notes = when + ': ' + (n - jarvis) + ' ' + unitWord(n - jarvis, 'note');
  if (jarvis > 0 && day && day.update) return notes + ' + ' + jarvis + ' ' + unitWord(jarvis, 'entry');
  if (jarvis > 0) return when + ': ' + n + ' journal ' + unitWord(n, 'entry');
  return when + ': ' + n + ' ' + unitWord(n, 'note');
}
function sleepLine(iso, score, mins){
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return shortDate(iso) + ': score ' + score + ' · ' + h + 'h ' + String(m).padStart(2, '0') + 'm';
}
function labelCell(cell, text){
  if (!text){
    cell.removeAttribute('aria-label');
    cell.removeAttribute('role');
    return;
  }
  cell.setAttribute('role', 'img');
  cell.setAttribute('aria-label', text);
}
const commas = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
function monthLabel(ym){
  if (!ym) return '—';
  return LOWER[+ym.slice(5) - 1] + ' ' + ym.slice(0, 4);
}

function gridFor(today){
  const start = addDays(today, -364);
  const gridStart = addDays(start, -weekday(start));
  const gridEnd = addDays(today, (6 - weekday(today) + 7) % 7);
  const weeks = [];
  for (let iso = gridStart; iso <= gridEnd;){
    const col = [];
    for (let i = 0; i < 7; i++){ col.push(iso); iso = addDays(iso, 1); }
    weeks.push(col);
  }
  return {start, today, weeks};
}

function build(section, model){
  const weeks = model.weeks;
  const graph = section.querySelector('.graph');
  graph.style.setProperty('--weeks', String(weeks.length));
  section.dataset.start = model.start;
  section.dataset.today = model.today;
  const labels = weeks.map(col => {
    const hit = col.find(d => d.slice(8) === '01' && d <= model.today);
    return hit ? SHORT[+hit.slice(5, 7) - 1] : '';
  });
  if (!labels[0]) labels[0] = SHORT[+weeks[0][0].slice(5, 7) - 1];
  let prev = -10;
  labels.forEach((lab, i) => {
    if (!lab) return;
    if (i - prev < 3) labels[i] = '';
    else prev = i;
  });
  const months = section.querySelector('.months');
  const box = section.querySelector('.weeks');
  months.replaceChildren();
  box.replaceChildren();
  weeks.forEach((col, i) => {
    const lab = mk('span');
    lab.textContent = labels[i];
    /* a label in the last two columns is wider than those cells. pin its right edge to the grid so the month stays on screen. */
    if (labels[i] && weeks.length - i <= 2){
      lab.classList.add('edge');
      lab.style.setProperty('--mc', String(i + 1));
    }
    months.appendChild(lab);
    col.forEach(iso => {
      const future = iso > model.today;
      const el = mk('span', 'cell' + (future ? ' future' : ''));
      el.dataset.date = iso;
      el.dataset.lv = '0';
      box.appendChild(el);
    });
  });
}

/* code is hand-set from the 12 nonzero days since 2026-09-29, when the bot work started.
   those days are 5, 6, 9, 18, 21, 25, 26, 30, 37, 45, 54, 62.
   the steps are 1–10, 11–24, 25–36, 37–50, 51+, which puts them at 3, 2, 3, 2, 2.
   an older day just falls into the step its count hits. */
const CODE_CUTS = [10, 24, 36, 50];
/* five colour steps. the cuts are the 20/40/60/80th of the nonzero days.
   a tied cut would skip a step, so it moves up to the next value the data actually has. */
function thresholds(values){
  const pos = values.filter(v => v > 0).sort((a, b) => a - b);
  if (!pos.length) return null;
  const at = p => pos[Math.min(pos.length - 1, Math.max(0, Math.ceil(p * pos.length) - 1))];
  const raw = [0.2, 0.4, 0.6, 0.8].map(at);
  const uniq = [...new Set(pos)];
  const cuts = [];
  raw.forEach(c => {
    const prev = cuts.length ? cuts[cuts.length - 1] : 0;
    if (c > prev){ cuts.push(c); return; }
    const higher = uniq.filter(u => u > prev);
    cuts.push(higher.length ? higher[0] : prev);
  });
  return cuts;
}
function level(v, t){
  if (!t || v <= 0) return 0;
  let lv = 1;
  for (let i = 0; i < t.length; i++){
    if (v <= t[i]) return lv;
    lv++;
  }
  return lv;
}
const SLEEP_STREAK = 70;
/* from this day on, a daily update in recaps.json adds one note on top of the obsidian count.
   earlier days stay the obsidian counts in journal.json. a failed recaps load keeps those counts.
   journal-jarvis.json adds its count on top of whatever is already there. a failed load changes nothing. */
const JOURNAL_FROM = '2026-09-29';
/* faith.json names the first tracked day and the dates that are no. every other day from that start through today is yes. */
const FAITH_FROM = '2026-08-25';
function computeStats(days, start, today, metric){
  let total = 0, longest = 0, run = 0, bestN = 0;
  let bestDay = '', bestMo = '', bestMoN = 0;
  const byMonth = {};
  for (let iso = start; iso <= today; iso = addDays(iso, 1)){
    const day = days[iso];
    const n = (day && day.total) || 0;
    const rank = metric === 'minutes' ? ((day && day.minutes) || 0) : n;
    total += n;
    if (n > 0){
      run++;
      if (run > longest) longest = run;
      const mo = iso.slice(0, 7);
      byMonth[mo] = (byMonth[mo] || 0) + rank;
      if (rank > bestN || (rank === bestN && iso > bestDay)){ bestN = rank; bestDay = iso; }
    } else run = 0;
  }
  Object.keys(byMonth).forEach(mo => {
    if (byMonth[mo] > bestMoN || (byMonth[mo] === bestMoN && mo > bestMo)){ bestMo = mo; bestMoN = byMonth[mo]; }
  });
  let current = 0;
  let cursorDay = (days[today] && days[today].total > 0) ? today : addDays(today, -1);
  if (days[cursorDay] && days[cursorDay].total > 0){
    while (days[cursorDay] && days[cursorDay].total > 0){ current++; cursorDay = addDays(cursorDay, -1); }
  }
  return {total, longest, current, bestDay, bestMo};
}
function computeSleepStats(days, start, today){
  let sum = 0, n = 0, longest = 0, run = 0;
  let bestScore = -1, bestDay = '';
  const byMonth = {};
  for (let iso = start; iso <= today; iso = addDays(iso, 1)){
    const day = days[iso];
    const recorded = !!(day && Number.isFinite(day.score));
    if (recorded && day.score >= SLEEP_STREAK){
      run++;
      if (run > longest) longest = run;
    } else run = 0;
    if (!recorded) continue;
    sum += day.score;
    n++;
    const mo = iso.slice(0, 7);
    if (!byMonth[mo]) byMonth[mo] = {sum: 0, n: 0};
    byMonth[mo].sum += day.score;
    byMonth[mo].n++;
    if (day.score > bestScore || (day.score === bestScore && iso > bestDay)){
      bestScore = day.score; bestDay = iso;
    }
  }
  let bestMo = '', bestAvg = -1;
  Object.keys(byMonth).forEach(mo => {
    const row = byMonth[mo];
    if (row.n < 7) return;
    const avg = row.sum / row.n;
    if (avg > bestAvg || (avg === bestAvg && mo > bestMo)){ bestMo = mo; bestAvg = avg; }
  });
  let current = 0;
  let cursorDay = days[today] ? today : addDays(today, -1);
  if (days[cursorDay] && days[cursorDay].score >= SLEEP_STREAK){
    while (days[cursorDay] && days[cursorDay].score >= SLEEP_STREAK){ current++; cursorDay = addDays(cursorDay, -1); }
  }
  const avg = n ? Math.round((sum / n) * 10) / 10 : 0;
  return {avg, longest, current, bestDay, bestScore, bestMo};
}
/* stats stay at the reserved placeholders until that tracker's cells have finished sweeping. */
const pendingStats = new Map();
function stashStats(section, payload){ pendingStats.set(section, payload); }
function revealStats(section){
  const payload = pendingStats.get(section);
  if (!payload) return;
  Object.keys(payload).forEach(k => {
    const el = section.querySelector('[data-k="' + k + '"]');
    if (el) el.textContent = payload[k];
  });
}
function revealAllStats(){ $$('.tracker').forEach(revealStats); }
function fillStats(section, s){
  stashStats(section, {
    total: commas(s.total),
    month: s.bestMo ? monthLabel(s.bestMo) : '—',
    day: s.bestDay ? s.bestDay.replace(/-/g, '.') : '—',
    longest: s.longest + 'd',
    current: s.current + 'd'
  });
}
function fillSleepStats(section, s){
  stashStats(section, {
    total: String(s.avg),
    month: s.bestMo ? monthLabel(s.bestMo) : '—',
    day: s.bestDay ? s.bestScore + ' · ' + shortDate(s.bestDay) : '—',
    longest: s.longest + 'd',
    current: s.current + 'd'
  });
}
function paint(cell, lv){
  cell.dataset.lv = String(lv);
  cell.classList.remove('hot');
}
function paintAll(){
  final.forEach((fin, cell) => paint(cell, fin.lv));
}
function daysOf(section, data){
  const kind = section.dataset.kind || '';
  if (kind === 'journal'){
    const src = (data && data.days && typeof Object.values(data.days)[0] !== 'object') ? data.days : data;
    const days = {};
    Object.keys(src || {}).forEach(iso => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      days[iso] = {total: Number(src[iso]) || 0};
    });
    return days;
  }
  if (kind === 'faith') return faithDays(section, data);
  if (kind === 'sleep'){
    const days = {};
    const raw = (data && data.days) || {};
    Object.keys(raw).forEach(iso => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      const row = raw[iso] || {};
      const score = Number(row.score);
      if (!Number.isFinite(score)) return;
      days[iso] = {total: score >= SLEEP_STREAK ? 1 : 0, score, asleep: Number(row.asleep_min) || 0};
    });
    return days;
  }
  return (data && data.days) || {};
}
function faithDays(section, data){
  const start = (data && typeof data.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.start)) ? data.start : FAITH_FROM;
  const nos = new Set(Array.isArray(data && data.no) ? data.no.filter(d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : []);
  const today = section.dataset.today || chicagoToday();
  section.dataset.since = start;
  const days = {};
  for (let iso = start; iso <= today; iso = addDays(iso, 1)){
    if (!nos.has(iso)) days[iso] = {total: 1};
  }
  return days;
}
function apply(section, days, meta){
  const kind = section.dataset.kind || '';
  const unit = section.dataset.unit || 'contribution';
  const metric = (meta && meta.intensity && meta.intensity.metric) || section.dataset.metric || '';
  const today = section.dataset.today;
  const start = section.dataset.start;
  const cells = [...section.querySelectorAll('.cell')];
  if (kind === 'faith'){
    const since = section.dataset.since || '';
    cells.forEach(cell => {
      const iso = cell.dataset.date;
      if (iso > today) return;
      const yes = !!since && iso >= since && !!((days[iso] && days[iso].total) > 0);
      final.set(cell, {lv: yes ? 5 : 0, n: yes ? 1 : 0});
      if (!since || iso < since) labelCell(cell, shortDate(iso));
      else labelCell(cell, shortDate(iso) + ': ' + (yes ? 'yes' : 'no'));
    });
    fillStats(section, computeStats(days, start, today));
    return;
  }
  const dates = cells.map(c => c.dataset.date);
  const measure = day => {
    if (!day) return 0;
    if (kind === 'sleep') return Number.isFinite(day.score) ? day.score : 0;
    if (metric === 'minutes') return Math.round(day.minutes || 0);
    return day.total || 0;
  };
  let scale = CODE_CUTS;
  if (section.dataset.id !== 'cursor'){
    const samples = [];
    dates.forEach(iso => {
      if (iso >= start && iso <= today) samples.push(measure(days[iso]));
    });
    scale = thresholds(samples);
  }
  cells.forEach(cell => {
    const iso = cell.dataset.date;
    if (iso > today) return;
    const day = days[iso];
    const n = (day && day.total) || 0;
    const amount = measure(day);
    if (kind === 'sleep'){
      const recorded = !!(day && Number.isFinite(day.score));
      const score = recorded ? day.score : 0;
      final.set(cell, {lv: level(amount, scale), n: score});
      labelCell(cell, recorded ? sleepLine(iso, score, day.asleep) : shortDate(iso) + ': no record');
      return;
    }
    const minutes = metric === 'minutes' ? amount : null;
    final.set(cell, {lv: level(amount, scale), n, minutes});
    labelCell(cell, kind === 'journal' ? noteLine(n, iso, day) : sentence(n, iso, unit, minutes));
  });
  if (kind === 'sleep') fillSleepStats(section, computeSleepStats(days, start, today));
  else fillStats(section, computeStats(days, start, today, metric));
}

const today = chicagoToday();
const model = gridFor(today);
$$('.tracker').forEach(section => build(section, model));

const tip = mk('div', 'tip');
tip.hidden = true;
tip.setAttribute('role', 'tooltip');
document.body.appendChild(tip);
function hideTip(){ tip.hidden = true; }
function showTip(cell){
  const fin = final.get(cell);
  const unit = cell.closest('.tracker').dataset.unit || 'contribution';
  const label = cell.getAttribute('aria-label');
  if (!label){ hideTip(); return; }
  tip.textContent = label || sentence(fin ? fin.n : 0, cell.dataset.date, unit);
  tip.hidden = false;
  const r = cell.getBoundingClientRect();
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(8, Math.min(left, innerWidth - w - 8));
  let top = r.top - h - 8;
  if (top < 8) top = Math.min(innerHeight - h - 8, r.bottom + 8);
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
let armed = null;
document.addEventListener('pointerover', e => {
  const cell = e.target.closest && e.target.closest('.cell');
  if (!cell || e.pointerType === 'touch') return;
  showTip(cell);
});
document.addEventListener('pointerout', e => {
  const cell = e.target.closest && e.target.closest('.cell');
  if (!cell || e.pointerType === 'touch') return;
  hideTip();
});
document.addEventListener('focusin', e => {
  const cell = e.target.closest && e.target.closest('.cell');
  if (cell) showTip(cell);
});
document.addEventListener('focusout', () => hideTip());
document.addEventListener('pointerdown', e => {
  if (!e.target.closest || !e.target.closest('.cell')){ armed = null; hideTip(); }
});
document.addEventListener('click', e => {
  const cell = e.target.closest && e.target.closest('.cell');
  if (!cell) return;
  if (!matchMedia('(hover: none)').matches) return;
  if (armed !== cell){ e.preventDefault(); armed = cell; showTip(cell); }
});

function prepare(el, text){
  el.textContent = '';
  const node = mk('span'), res = mk('span', 'res'), scr = mk('span', 'scr'), ghost = mk('span', 'ghost');
  ghost.textContent = text; node.append(res, scr, ghost); el.appendChild(node);
  const g = graphemes(text);
  return {el, runs: [{node, res, scr, ghost, g, start: 0}], n: g.length};
}
function render(t, head, win){
  const resolved = Math.max(0, head - win), top = Math.min(head, t.n), r = t.runs[0], L = r.g.length;
  const a = Math.min(L, Math.max(0, resolved)), b = Math.min(L, Math.max(0, top));
  r.res.textContent = r.g.slice(0, a).join('');
  r.scr.textContent = r.g.slice(a, b).map(c => /\s/.test(c) ? c : rg()).join('');
  r.ghost.textContent = r.g.slice(b).join('');
  r.node.insertBefore(cursor, r.ghost);
}
function type(t, opt){
  const win = opt.window, base = opt.speed, all = t.runs[0].g;
  let head = 0, cancelled = false;
  const p = new Promise(resolve => {
    const tick = () => {
      if (cancelled) return resolve();
      head++; render(t, head, win); state.head = head;
      if (head - win >= t.n) return resolve();
      const c = all[Math.min(head, t.n) - 1];
      const delay = head > t.n ? base * .7 : c === '.' ? base * 1.6 : base * (.75 + Math.random() * .6);
      setTimeout(tick, reduced ? 0 : delay / pace);
    };
    tick();
  });
  p.stop = () => { cancelled = true; };
  return p;
}
const wait = ms => new Promise(r => setTimeout(r, reduced ? 0 : ms / pace));

/* one graph, left to right, same step as before: a hot flash, then the colour. */
async function sweepSection(section){
  const columns = model.weeks.length;
  const cells = section.querySelectorAll('.cell');
  for (let i = 0; i < columns; i++){
    if (skipped) return;
    const live = [];
    for (let r = 0; r < 7; r++){
      const cell = cells[i * 7 + r];
      if (!cell) continue;
      const f = final.get(cell);
      if (f && f.lv > 0) live.push(cell);
    }
    live.forEach(c => c.classList.add('hot'));
    await wait(18);
    if (skipped) return;
    live.forEach(c => { const f = final.get(c); paint(c, f.lv); });
    await wait(26);
  }
}

const T = [26, 173, 179], PALE_TEAL = [121, 205, 207], HEAD = [255, 255, 255], PALE_ORANGE = [255, 150, 121];
const mob = () => document.documentElement.clientWidth < 760;
const rain = JayRain.Rain(document.getElementById('rain'), {
  fs: 16, fsMobile: 13, mono: '"JetBrains Mono", monospace', seed: 5, head: HEAD, headMix: .6,
  tint: T, paleTint: PALE_TEAL, paleOrange: PALE_ORANGE,
  palette: (x, w, r) => r < .84 ? T : PALE_TEAL,
  bands: (w, H) => [{y0: 0, y1: H, perCol: mob() ? 1.6 : 2.1, lenMin: 8, lenMax: 30, alpha: .56, stepMin: 60, stepMax: 170, colDensity: () => 1}],
  alphaAt: (x, y, R) => 1 - .45 * JayRain.smooth(R.H * .55, R.H, y),
  partSel: '.copy', partPad: 50, partFloor: .3
});
const fastNow = () => document.documentElement.dataset.mode === 'fast';
let lines = [], wantNow = false;
function finish(){
  if (state.done) return;
  JayRain.introDone();
  state.done = true;
  JayRain.dump && JayRain.dump(false);
  JayRain.rendered && JayRain.rendered();
  JayRain.seen && JayRain.seen();
}
function complete(){
  skipped = true;
  current && current.stop();
  lines.forEach(t => render(t, t.n + TIMING.window, TIMING.window));
  paintAll();
  revealAllStats();
  finish();
}
window.__pageRain = rain;
JayRain.register(rain, fast => {
  pace = fast ? 4 : 2; state.pace = pace;
  if (ready && !state.done && !reduced) JayRain.dump(fast);
}, () => {
  if (!ready || state.done || reduced || !fastNow()) return false;
  complete();
  return true;
});
addEventListener('pageshow', e => { if (e.persisted && !state.done) wantNow = true; });

async function loadAll(){
  await Promise.all($$('.tracker').map(async section => {
    try {
      const res = await fetch(section.dataset.src, {cache: 'no-cache'});
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      let days = daysOf(section, data);
      if ((section.dataset.kind || '') === 'journal'){
        days = await withRecaps(days);
        days = await withJarvis(days);
      }
      apply(section, days, data);
    } catch (err) {
      section.dataset.error = '1';
      const el = section.querySelector('[data-k="total"]');
      if (el) el.textContent = '—';
    }
  }));
}
async function withRecaps(days){
  try {
    const res = await fetch('/daily-update/recaps.json', {cache: 'no-cache'});
    if (!res.ok) return days;
    const rows = await res.json();
    const next = {};
    Object.keys(days).forEach(iso => { next[iso] = days[iso]; });
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const iso = row && row.date;
      if (typeof iso !== 'string' || iso < JOURNAL_FROM || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      if (!String(row.text || '').trim()) return;
      const prev = (next[iso] && next[iso].total) || 0;
      next[iso] = {total: prev + 1, update: true};
    });
    return next;
  } catch (e) {
    return days;
  }
}
async function withJarvis(days){
  try {
    const res = await fetch('/habits/journal-jarvis.json', {cache: 'no-cache'});
    if (!res.ok) return days;
    const rows = await res.json();
    if (!rows || typeof rows !== 'object' || Array.isArray(rows)) return days;
    const next = {};
    Object.keys(days).forEach(iso => { next[iso] = days[iso]; });
    Object.keys(rows).forEach(iso => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      const n = rows[iso];
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) return;
      const prev = next[iso] || {};
      const day = {total: (prev.total || 0) + n, jarvis: n};
      if (prev.update) day.update = true;
      next[iso] = day;
    });
    return next;
  } catch (e) {
    return days;
  }
}
const dataReady = loadAll();
/* v2.00: the intro walks trackers.json, not a fixed list. a section with no matching id still plays, after those. */
const orderReady = (async () => {
  const have = $$('.tracker');
  const byId = new Map(have.map(s => [s.dataset.id, s]));
  let ids = [];
  try {
    const res = await fetch('/habits/trackers.json', {cache: 'no-cache'});
    if (res.ok){
      const data = await res.json();
      ids = (data.trackers || []).map(t => t && t.id).filter(Boolean);
    }
  } catch (e) {}
  const ordered = [], seen = new Set();
  ids.forEach(id => {
    const section = byId.get(id);
    if (!section || seen.has(section)) return;
    ordered.push(section);
    seen.add(section);
  });
  have.forEach(section => { if (!seen.has(section)) ordered.push(section); });
  return ordered;
})();

async function main(){
  await document.fonts.ready;
  await dataReady;
  const sections = await orderReady;
  const steps = [];
  sections.forEach(section => {
    const el = section.querySelector('.kt');
    if (!el) return;
    const line = prepare(el, el.textContent);
    lines.push(line);
    steps.push({section, line});
  });
  lines.forEach(t => render(t, 0, TIMING.window));
  cursor.remove();
  rain.build(); requestAnimationFrame(rain.frame);
  if (reduced || JayRain.returning(VER) || wantNow){ complete(); return; }
  ready = true;
  if (fastNow()) JayRain.dump(true);
  await wait(300);
  if (skipped) return;
  for (let i = 0; i < steps.length; i++){
    const step = steps[i];
    state.head = 0;
    current = type(step.line, {speed: TIMING.kickerSpeed, window: TIMING.window});
    await current;
    if (skipped) return;
    /* same breath that used to sit between titles, now between a title and its own cells. */
    await wait(TIMING.afterKicker);
    if (skipped) return;
    await sweepSection(step.section);
    if (skipped) return;
    revealStats(step.section);
  }
  finish();
}
main();
let lastW = innerWidth, rt;
// v2.28: a height-only resize (iOS Safari's toolbar) must not rebuild the rain. width and orientation still do.
addEventListener('resize', () => { if (innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rt); rt = setTimeout(rain.build, 150); });
})();
