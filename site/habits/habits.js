/* jayroddi.lol/ (v2.39): five year graphs in one column (faith, sleep, fitness, code, journal) fill on one clock. a bright speed-colour cursor sweeps every grid together from the first cell through today in about 1.5s, and each cell keeps its real colour once the cursor has passed. reduced motion shows the filled grids at once. paths stay root-absolute so the homepage loads /habits/habits.css, /habits/habits.js, /habits/faith.json, /habits/workouts.json, /habits/cursor.json, /habits/sleep.json, /habits/journal.json, /habits/journal-jarvis.json, /daily-update/recaps.json, and /habits/trackers.json. faith ramps from the start in faith.json through four levels until full, then every day through today (America/Chicago) is a full cell unless that date is listed in no. a new day is full without a commit. any level of 1 or higher counts toward the streak. five colour steps plus empty. fitness colours each day by apple exercise minutes (workouts.json exercise) on the fixed cuts in its intensity.edges, 1-14, 15-29, 30-59 (ring closed), 60-89, 90+, and its streak counts days with any exercise. journal and sleep cut those steps from their own nonzero days. code uses a fixed scale set from the days since 2026-09-29. from that same day a daily update adds one note on top of the obsidian count, and the hover says "N notes". jarvis counts in journal-jarvis.json add on top of that. a jarvis day says "N journal entries", and a daily-update day keeps the note line and adds "+ N entries". a failed recaps or jarvis load keeps the counts already on the grid. a streak day uses that same scale. longest and current stay. */
(() => {
const VER = 'habits-1.84';
const SWEEP_MS = 1500;
const SHORT = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const LOWER = ['january','february','march','april','may','june','july','august','september','october','november','december'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mk = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let pace = 2, skipped = false, ready = false;
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
/* getUTCDay is 0 Sunday … 6 Saturday. A column runs Monday through Sunday. */
const weekday = iso => new Date(parse(iso)).getUTCDay();
const sinceMonday = iso => (weekday(iso) + 6) % 7;
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
function sentence(n, iso, unit, minutes, exercise){
  const when = LONG[+iso.slice(5, 7) - 1] + ' ' + ordinal(+iso.slice(8));
  const head = n + ' ' + unitWord(n, unit);
  if (exercise != null) return exercise + ' exercise min · ' + head + ' on ' + when + '.';
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
  if (text && cell.classList.contains('today')) text += ' · today';
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
  const gridStart = addDays(start, -sinceMonday(start));
  const gridEnd = addDays(today, (6 - sinceMonday(today) + 7) % 7);
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
      /* today is the America/Chicago date from chicagoToday(), via gridFor. */
      const future = iso > model.today;
      const el = mk('span', 'cell' + (future ? ' future' : '') + (iso === model.today ? ' today' : ''));
      el.dataset.date = iso;
      el.dataset.lv = '0';
      if (iso === model.today) el.setAttribute('aria-current', 'date');
      box.appendChild(el);
    });
  });
}

/* code cuts after rides became one per 10 ride minutes (v2.57). last 365 days have 101 active days,
   44 of them a single thinking or workout session. nonzero p50 3, p60 9, p75 16, p90 26.
   the steps are 1–2, 3–8, 9–14, 15–24, 25+, which puts them at 48, 9, 16, 15, 13.
   a 45 minute ride is 5 (step 2), a two hour ride 12 (step 3). */
const CODE_CUTS = [2, 8, 14, 24];
/* steps: fixed cuts, not the window's percentiles. 1 is 1–2,500, 2 to 5,000, 3 to 7,500, 4 to 10,000, 5 is more. */
const STEPS_CUTS = [2500, 5000, 7500, 10000];
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
/* faith.json names the first tracked day, the first full day, and the dates that are no.
   the days from start through the day before full split evenly into levels 1–4. full through today is level 5. */
const FAITH_FROM = '2026-06-03';
const FAITH_FULL = '2026-08-25';
/* exercise days: a day is active when it has any apple exercise minutes; best day/month rank by those minutes. */
function computeExerciseStats(days, ex, start, today){
  let total = 0, longest = 0, run = 0, bestN = 0;
  let bestDay = '', bestMo = '', bestMoN = 0;
  const byMonth = {};
  const mins = iso => Number(ex[iso]) || 0;
  for (let iso = start; iso <= today; iso = addDays(iso, 1)){
    total += (days[iso] && days[iso].total) || 0;
    const m = mins(iso);
    if (m > 0){
      run++;
      if (run > longest) longest = run;
      const mo = iso.slice(0, 7);
      byMonth[mo] = (byMonth[mo] || 0) + m;
      if (m > bestN || (m === bestN && iso > bestDay)){ bestN = m; bestDay = iso; }
    } else run = 0;
  }
  Object.keys(byMonth).forEach(mo => {
    if (byMonth[mo] > bestMoN || (byMonth[mo] === bestMoN && mo > bestMo)){ bestMo = mo; bestMoN = byMonth[mo]; }
  });
  let current = 0;
  let cursorDay = mins(today) > 0 ? today : addDays(today, -1);
  while (mins(cursorDay) > 0){ current++; cursorDay = addDays(cursorDay, -1); }
  return {total, longest, current, bestDay, bestMo};
}
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
  if (kind === 'steps'){
    const days = {};
    const raw = (data && data.days) || {};
    Object.keys(raw).forEach(iso => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return;
      const steps = Number((raw[iso] || {}).steps);
      if (!Number.isFinite(steps) || steps <= 0) return;
      days[iso] = {total: steps, steps};
    });
    return days;
  }
  return (data && data.days) || {};
}
function faithDays(section, data){
  const isoOk = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const start = isoOk(data && data.start) ? data.start : FAITH_FROM;
  const full = isoOk(data && data.full) ? data.full : FAITH_FULL;
  const nos = new Set(Array.isArray(data && data.no) ? data.no.filter(isoOk) : []);
  const today = section.dataset.today || chicagoToday();
  section.dataset.since = start;
  let span = 0;
  if (full > start){
    for (let iso = start; iso < full; iso = addDays(iso, 1)) span++;
  }
  const days = {};
  let index = 0;
  for (let iso = start; iso <= today; iso = addDays(iso, 1)){
    let lv = 5;
    if (span > 0 && iso < full) lv = Math.min(4, Math.floor(index * 4 / span) + 1);
    if (!nos.has(iso) && lv >= 1) days[iso] = {total: 1, lv};
    if (iso < full) index++;
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
      const day = days[iso];
      const active = !!since && iso >= since && !!(day && day.total > 0);
      const lv = active ? (day.lv || 0) : 0;
      final.set(cell, {lv, n: active ? 1 : 0});
      if (!since || iso < since) labelCell(cell, shortDate(iso));
      else labelCell(cell, shortDate(iso) + ': ' + (active ? String(lv) : 'no'));
    });
    fillStats(section, computeStats(days, start, today));
    return;
  }
  const dates = cells.map(c => c.dataset.date);
  const ex = (metric === 'exercise_min' && meta && meta.exercise && typeof meta.exercise === 'object') ? meta.exercise : null;
  const measure = day => {
    if (!day) return 0;
    if (kind === 'sleep') return Number.isFinite(day.score) ? day.score : 0;
    if (metric === 'minutes') return Math.round(day.minutes || 0);
    return day.total || 0;
  };
  const amountOf = iso => ex ? (Number(ex[iso]) || 0) : measure(days[iso]);
  let scale = CODE_CUTS;
  if (kind === 'steps'){
    const edges = meta && meta.intensity && meta.intensity.edges;
    scale = Array.isArray(edges) && edges.length === 4 ? edges : STEPS_CUTS;
  } else if (ex){
    const edges = meta.intensity && meta.intensity.edges;
    scale = Array.isArray(edges) && edges.length === 4 ? edges : [14, 29, 59, 89];
  } else if (section.dataset.id !== 'cursor'){
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
    const amount = amountOf(iso);
    if (kind === 'sleep'){
      const recorded = !!(day && Number.isFinite(day.score));
      const score = recorded ? day.score : 0;
      final.set(cell, {lv: level(amount, scale), n: score});
      labelCell(cell, recorded ? sleepLine(iso, score, day.asleep) : shortDate(iso) + ': no record');
      return;
    }
    if (kind === 'steps'){
      const recorded = !!(day && day.steps > 0);
      const steps = recorded ? day.steps : 0;
      final.set(cell, {lv: level(steps, scale), n: steps});
      labelCell(cell, recorded ? shortDate(iso) + ': ' + commas(steps) + ' steps' : shortDate(iso) + ': no record');
      return;
    }
    const minutes = metric === 'minutes' ? amount : null;
    final.set(cell, {lv: level(amount, scale), n, minutes});
    labelCell(cell, kind === 'journal' ? noteLine(n, iso, day) : sentence(n, iso, unit, ex ? null : minutes, ex ? amount : null));
  });
  if (kind === 'sleep') fillSleepStats(section, computeSleepStats(days, start, today));
  else if (kind === 'steps') fillStats(section, computeStats(days, start, today));
  else if (ex) fillStats(section, computeExerciseStats(days, ex, start, today));
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

/* one shared clock. every grid's cursor sits on the same date, from the first cell through today. */
function sweepAll(){
  const grids = $$('.tracker').map(section => {
    const today = section.dataset.today || '';
    const byDate = new Map();
    section.querySelectorAll('.cell').forEach(cell => {
      const iso = cell.dataset.date;
      if (iso && iso <= today) byDate.set(iso, cell);
    });
    return byDate;
  }).filter(byDate => byDate.size);
  const dates = grids.length ? [...grids[0].keys()] : [];
  const count = dates.length;
  if (!count){
    revealAllStats();
    finish();
    return Promise.resolve();
  }
  let painted = -1;
  let cursor = -1;
  const at = i => grids.map(byDate => byDate.get(dates[i])).filter(Boolean);
  const clearCursor = () => {
    if (cursor < 0) return;
    at(cursor).forEach(cell => cell.classList.remove('sweep'));
    cursor = -1;
  };
  const showLevel = cell => {
    const fin = final.get(cell);
    paint(cell, fin ? fin.lv : 0);
  };
  const fillTo = idx => {
    for (let i = painted + 1; i <= idx; i++) at(i).forEach(showLevel);
    if (idx > painted) painted = idx;
  };
  const t0 = performance.now();
  return new Promise(resolve => {
    const frame = now => {
      if (skipped || state.done){ resolve(); return; }
      const t = Math.min(1, (now - t0) / SWEEP_MS);
      if (t >= 1){
        clearCursor();
        fillTo(count - 1);
        revealAllStats();
        finish();
        resolve();
        return;
      }
      const idx = Math.min(count - 1, Math.floor(t * count));
      if (idx > cursor){
        clearCursor();
        fillTo(idx);
        at(idx).forEach(cell => cell.classList.add('sweep'));
        cursor = idx;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

const T = [26, 173, 179], PALE_TEAL = [121, 205, 207], HEAD = [255, 255, 255], PALE_ORANGE = [255, 150, 121];
const mob = () => document.documentElement.clientWidth < 760;
const rainCanvas = document.getElementById('rain');
const rain = (rainCanvas && window.JayRain) ? JayRain.Rain(rainCanvas, {
  fs: 16, fsMobile: 13, mono: '"JetBrains Mono", monospace', seed: 5, head: HEAD, headMix: .6,
  tint: T, paleTint: PALE_TEAL, paleOrange: PALE_ORANGE,
  palette: (x, w, r) => r < .84 ? T : PALE_TEAL,
  bands: (w, H) => [{y0: 0, y1: H, perCol: mob() ? 1.6 : 2.1, lenMin: 8, lenMax: 30, alpha: .56, stepMin: 60, stepMax: 170, colDensity: () => 1}],
  alphaAt: (x, y, R) => 1 - .45 * JayRain.smooth(R.H * .55, R.H, y),
  partSel: '.copy, .gallery, .foot', partPad: 50, partFloor: .25
}) : null;
const fastNow = () => document.documentElement.dataset.mode === 'fast';
let wantNow = false;
function finish(){
  if (state.done) return;
  if (window.JayRain && JayRain.introDone) JayRain.introDone();
  state.done = true;
  if (window.JayRain) {
    JayRain.dump && JayRain.dump(false);
    JayRain.rendered && JayRain.rendered();
    JayRain.seen && JayRain.seen();
  }
}
function complete(){
  skipped = true;
  $$('.cell.sweep').forEach(cell => cell.classList.remove('sweep'));
  paintAll();
  revealAllStats();
  finish();
}
window.__pageRain = rain;
if (rain) JayRain.register(rain, fast => {
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

async function main(){
  await dataReady;
  if (rain) {
    rain.build();
    requestAnimationFrame(rain.frame);
  }
  if (reduced || (window.JayRain && JayRain.returning && JayRain.returning(VER)) || wantNow){ complete(); return; }
  ready = true;
  if (rain && fastNow()) JayRain.dump(true);
  await sweepAll();
}
main();
let lastW = innerWidth, rt;
// v2.28: a height-only resize (iOS Safari's toolbar) must not rebuild the rain. width and orientation still do.
addEventListener('resize', () => { if (!rain || innerWidth === lastW) return; lastW = innerWidth; clearTimeout(rt); rt = setTimeout(rain.build, 150); });
})();
