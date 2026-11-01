/* Paper Kronos tape for jayroddi.dev.
   Life score is a daily 0–100 mix of steps, exercise, sleep, faith, and code.
   The spray is a residual random walk: blended 7/14/30-day slope, sigma from
   the last-30 residual, compared with the previous 30 days. Hit-rate is that
   band checked on recent days. DEMO / PAPER — not a model and not a trade. */
(() => {
  const root = document.getElementById('kronos');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROUND = reduced ? 14 : 8.6;
  const H = 24;
  const SAMPLES = 96;
  const WEIGHTS = { steps: 0.30, exercise: 0.22, sleep: 0.28, faith: 0.10, code: 0.10 };
  const solo = root.dataset.kronos === 'solo';

  const parse = iso => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const fmtDate = ms => {
    const dt = new Date(ms);
    return dt.getUTCFullYear() + '-' + String(dt.getUTCMonth() + 1).padStart(2, '0') + '-' + String(dt.getUTCDate()).padStart(2, '0');
  };
  const addDays = (iso, n) => fmtDate(parse(iso) + n * 86400000);
  const chicagoToday = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const fmt = n => Number.isFinite(n) ? n.toFixed(2) : '—';
  const signed = n => (n >= 0 ? '+' : '') + n.toFixed(2);
  const smooth = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1)));
    return t * t * (3 - 2 * t);
  };
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(rng) {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
  }
  function fit(arr) {
    const n = arr.length;
    if (n < 2) {
      const y = arr[0] || 0;
      return { a: y, b: 0, sigma: 1, mean: y };
    }
    let sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (let i = 0; i < n; i++) {
      sx += i; sy += arr[i]; sxx += i * i; sxy += i * arr[i];
    }
    const den = n * sxx - sx * sx || 1;
    const b = (n * sxy - sx * sy) / den;
    const a = (sy - b * sx) / n;
    let ss = 0;
    for (let i = 0; i < n; i++) {
      const e = arr[i] - (a + b * i);
      ss += e * e;
    }
    return { a, b, sigma: Math.sqrt(ss / Math.max(1, n - 2)), mean: sy / n };
  }
  function qOf(sorted, q) {
    if (!sorted.length) return 0;
    const i = (sorted.length - 1) * q;
    const lo = Math.floor(i);
    const hi = Math.min(sorted.length - 1, Math.ceil(i));
    const t = i - lo;
    return sorted[lo] * (1 - t) + sorted[hi] * t;
  }

  const links = solo
    ? '<a href="/#grids">habit grids</a>'
    : '<a href="#grids">grids</a><a href="/hud/">/hud</a>';

  root.innerHTML = `
    <p class="kronos-sr">Decorative paper demo. The spray is a 30-day trend plus residual noise, not a prediction. The habit grids are the record.</p>
    <div class="kronos-frame">
      <div class="kronos-top">
        <div class="kronos-top-l">
          <span class="kronos-mark">◆</span>
          <span class="kronos-name">KRONOS <b>FORECAST</b></span>
          <span class="kronos-chip">DEMO</span>
          <span class="kronos-series">LIFE · 1d</span>
        </div>
        <div class="kronos-top-r">
          <span class="kronos-live"><i></i>LIVE</span>
          <span>last</span>
          <span class="kronos-last" id="k-last">—</span>
        </div>
      </div>
      <div class="kronos-stage" id="k-stage">
        <canvas id="k-chart" aria-hidden="true"></canvas>
        <aside class="kronos-spec" aria-hidden="true">
          <div class="kronos-spec-h"><span id="k-model">life-score</span><span id="k-loaded">loading</span></div>
          <dl>
            <dt>window</dt><dd>30d vs 30d</dd>
            <dt>horizon</dt><dd>24d</dd>
            <dt>samples</dt><dd id="k-samples">${SAMPLES}</dd>
            <dt>slope</dt><dd id="k-slope">—</dd>
            <dt>prior</dt><dd id="k-prior">—</dd>
            <dt>through</dt><dd id="k-through">—</dd>
          </dl>
          <p class="kronos-spec-note">paper only · not a model</p>
        </aside>
        <div class="kronos-round" id="k-round" aria-hidden="true">ROUND 1/5 · paper</div>
      </div>
      <div class="kronos-board" aria-hidden="true">
        <div class="kronos-score">
          <article class="k-card k-median">
            <div class="k-med-main">
              <div class="k-h"><span>next 24 · median</span><b id="k-step">step 0/24</b></div>
              <div class="k-giant" id="k-giant">—</div>
              <div class="k-sub"><span id="k-band">next 1d —</span><div class="k-meter"><i id="k-meter"></i></div><span id="k-last2">last —</span></div>
            </div>
            <div class="k-quant">
              <div><span>p90</span><b class="up" id="k-p90">—</b></div>
              <div><span>p10</span><b class="dn" id="k-p10">—</b></div>
              <div><span>spread</span><b id="k-spread">—</b></div>
            </div>
          </article>
          <article class="k-card k-paths">
            <div class="k-h"><span>paths</span><span id="k-samp">samples ${SAMPLES}</span></div>
            <div class="k-updown"><b class="up" id="k-up">0</b><em>up</em><b class="dn" id="k-dn">0</b><em>down</em></div>
            <div class="k-sq" id="k-sq"></div>
            <div class="k-footline"><span id="k-drawn">drawn 0/${SAMPLES}</span><span id="k-uppct">up 0%</span></div>
          </article>
          <article class="k-card k-hit">
            <div class="k-h"><span>hit-rate</span><span>inside p10–p90</span></div>
            <div class="k-hit-top"><div class="k-pct" id="k-pct">0%</div><div class="k-frac" id="k-frac">0/0</div></div>
            <div class="k-seq" id="k-seq"></div>
            <div class="k-hitbar"><i id="k-hitbar"></i></div>
          </article>
          <article class="k-card k-regime">
            <div class="k-h"><span>regime</span><span>30d vs prior 30d</span></div>
            <div class="k-regime-row">
              <div class="k-regime-word" id="k-regime">—</div>
              <div class="k-regime-meta">
                <span id="k-same">—</span>
                <div class="k-risk"><i id="k-risk"></i></div>
                <span id="k-riskv">spread —</span>
              </div>
            </div>
            <div class="k-rounds" id="k-rounds"></div>
          </article>
        </div>
        <aside class="k-card k-term">
          <div class="k-term-h">
            <span><span class="mark">◆</span>life score</span>
            <span class="k-term-h-r"><span>paper</span><span id="k-rlabel">round 1/5</span><span>hud.js</span></span>
          </div>
          <ol class="k-log" id="k-log"></ol>
        </aside>
      </div>
      <div class="kronos-foot">
        <span class="kronos-foot-l" id="k-foot-l">LIFE SCORE · 1d</span>
        <span class="kronos-paper"><b>PAPER</b><span>DEMO · nothing predicts until you approve</span></span>
        <span class="kronos-foot-r">${links}</span>
      </div>
    </div>`;

  const $ = id => document.getElementById(id);
  const stage = $('k-stage');
  const canvas = $('k-chart');
  const ctx = canvas.getContext('2d', { alpha: true });
  const sq = $('k-sq');
  const seq = $('k-seq');
  const roundsEl = $('k-rounds');
  const logEl = $('k-log');
  for (let i = 0; i < 48; i++) sq.appendChild(document.createElement('i'));
  for (let i = 0; i < 5; i++) {
    const chip = document.createElement('i');
    chip.textContent = '·';
    seq.appendChild(chip);
  }
  for (let i = 0; i < 6; i++) {
    const cell = document.createElement('div');
    cell.className = 'k-rb';
    cell.innerHTML = '<b></b><span></span><small></small>';
    roundsEl.appendChild(cell);
  }

  let model = null;
  let candles = [];
  let paths = [];
  let env = null;
  let history = [];
  let roundLines = [];
  let roundId = -1;
  let clock = 0;
  let lastNow = 0;
  let raf = 0;
  let running = false;
  let yLo = 40;
  let yHi = 80;
  let yLoT = 40;
  let yHiT = 80;
  let logSig = '';
  let lineNo = 1;
  let real = false;

  function ln(who, msg, tag, kind) {
    return { who, msg, tag: tag || '', kind: kind || '', n: lineNo++ };
  }
  function yAt(path, h, t) {
    const wob = Math.sin(t * path.freq + path.phase + h * 0.55) * path.amp * (h / H);
    return path.ys[h] + wob;
  }
  function samplePaths(seed) {
    const rng = mulberry32(seed);
    const out = [];
    for (let p = 0; p < SAMPLES; p++) {
      const ys = new Array(H + 1);
      ys[0] = model.level;
      let y = model.level;
      for (let h = 1; h <= H; h++) y = ys[h] = y + model.drift + model.sigma * gauss(rng);
      out.push({
        ys,
        z: rng() * 2 - 1,
        phase: rng() * Math.PI * 2,
        freq: 1.15 + rng() * 1.7,
        amp: model.sigma * (0.045 + rng() * 0.07)
      });
    }
    return out;
  }
  function envelope(list) {
    const p10 = [], p50 = [], p90 = [];
    for (let h = 0; h <= H; h++) {
      const col = list.map(p => p.ys[h]).sort((a, b) => a - b);
      p10.push(qOf(col, 0.1));
      p50.push(qOf(col, 0.5));
      p90.push(qOf(col, 0.9));
    }
    return { p10, p50, p90 };
  }
  function makeCandles(series) {
    const rows = series.slice(-42);
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const close = rows[i].score;
      const open = i ? rows[i - 1].score : close;
      const pad = Math.max(0.45, Math.abs(close - open) * 0.28);
      out.push({
        open, close,
        high: Math.max(open, close) + pad,
        low: Math.min(open, close) - pad,
        date: rows[i].date
      });
    }
    return out;
  }
  function backtest(series) {
    const out = [];
    const start = Math.max(30, series.length - 10);
    for (let i = start; i < series.length; i++) {
      const train = series.slice(i - 30, i).map(d => d.score);
      const f = fit(train);
      const pred = f.a + f.b * train.length;
      const lo = pred - 1.28155 * f.sigma;
      const hi = pred + 1.28155 * f.sigma;
      const actual = series[i].score;
      out.push({ date: series[i].date.slice(5), hit: actual >= lo && actual <= hi, actual });
    }
    return out;
  }
  function windowRow(ys, len) {
    const w = ys.slice(-len);
    const f = fit(w);
    let up = 0;
    for (let i = 1; i < w.length; i++) if (w[i] >= w[i - 1]) up++;
    return { len, up, n: Math.max(1, w.length - 1), regime: f.b > 0.15 ? 'TRENDING' : 'CHOPPY', slope: f.b };
  }
  function buildModel(series) {
    const ys = series.map(d => d.score);
    const s30 = fit(ys.slice(-30));
    const s14 = fit(ys.slice(-14));
    const s7 = fit(ys.slice(-7));
    const prev = fit(ys.slice(-60, -30));
    const drift = 0.5 * s30.b + 0.3 * s14.b + 0.2 * s7.b;
    const sigma = Math.max(0.8, 0.5 * s30.sigma + 0.3 * s14.sigma + 0.2 * s7.sigma);
    const rising = s30.b > 0.15 && s30.b > prev.b;
    const regime = rising || s30.b > 0.35 ? 'TRENDING' : 'CHOPPY';
    const same = Math.sign(roundSign(s30.b)) === Math.sign(roundSign(prev.b));
    return {
      ys, s30, s14, s7, prev, drift, sigma, regime, same,
      level: ys[ys.length - 1],
      lastDate: series[series.length - 1].date,
      tests: backtest(series),
      windows: [7, 14, 21, 30, 45].map(len => windowRow(ys, len))
    };
  }
  function roundSign(b) { return Math.abs(b) < 0.05 ? 0 : Math.sign(b); }

  function faithLevels(faith, today) {
    const isoOk = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!faith || !isoOk(faith.start) || !isoOk(faith.full)) return {};
    const start = faith.start;
    const full = faith.full;
    const nos = new Set(Array.isArray(faith.no) ? faith.no.filter(isoOk) : []);
    let span = 0;
    if (full > start) for (let iso = start; iso < full; iso = addDays(iso, 1)) span++;
    const days = {};
    let index = 0;
    for (let iso = start; iso <= today; iso = addDays(iso, 1)) {
      let lv = 5;
      if (span > 0 && iso < full) lv = Math.min(4, Math.floor(index * 4 / span) + 1);
      if (!nos.has(iso)) days[iso] = lv / 5;
      if (iso < full) index++;
    }
    return days;
  }
  function buildSeries(raw) {
    const today = chicagoToday();
    const end = addDays(today, -1);
    const begin = addDays(today, -180);
    const steps = (raw.steps && raw.steps.days) || {};
    const exercise = (raw.workouts && raw.workouts.exercise) || {};
    const sleep = (raw.sleep && raw.sleep.days) || {};
    const code = (raw.cursor && raw.cursor.days) || {};
    const faith = faithLevels(raw.faith, today);
    const series = [];
    for (let iso = begin; iso <= end; iso = addDays(iso, 1)) {
      const parts = {};
      if (steps[iso] && Number(steps[iso].steps) > 0) parts.steps = Math.min(1, Number(steps[iso].steps) / 10000);
      if (exercise[iso]) parts.exercise = Math.min(1, Number(exercise[iso]) / 60);
      if (sleep[iso] && Number.isFinite(Number(sleep[iso].score))) parts.sleep = Math.max(0, Math.min(1, Number(sleep[iso].score) / 100));
      if (faith[iso] != null) parts.faith = faith[iso];
      if (code[iso] && Number(code[iso].total) > 0) parts.code = Math.min(1, Number(code[iso].total) / 24);
      const keys = Object.keys(parts);
      if (!keys.length) continue;
      const tw = keys.reduce((s, k) => s + WEIGHTS[k], 0);
      const score = 100 * keys.reduce((s, k) => s + WEIGHTS[k] * parts[k], 0) / tw;
      series.push({ date: iso, score, parts });
    }
    return series;
  }

  function applySeries(series, paper) {
    model = buildModel(series);
    candles = makeCandles(series);
    real = !paper;
    $('k-loaded').textContent = paper ? 'paper' : 'loaded';
    $('k-slope').textContent = signed(model.s30.b) + '/d';
    $('k-prior').textContent = signed(model.prev.b) + '/d';
    $('k-through').textContent = model.lastDate.slice(5).replace('-', '.');
    $('k-foot-l').textContent = paper ? 'PAPER TAPE' : 'LIFE SCORE · ' + model.lastDate;
    history = paper ? [
      ln('kronos', 'loading steps.json · sleep.json · workouts.json'),
      ln('paper', 'DEMO · paper tape until the json lands', 'DEMO', 'demo')
    ] : [
      ln('kronos', 'load steps.json'),
      ln('kronos', 'load workouts.json · exercise'),
      ln('kronos', 'load sleep.json · score'),
      ln('kronos', 'load faith.json · cursor.json'),
      ln('kronos', `life score · ${series.length} days · last ${fmt(model.level)}`),
      ln('kronos', `30d slope ${signed(model.s30.b)}/d · prior ${signed(model.prev.b)}/d`),
      ln('kronos', `sigma ${model.s30.sigma.toFixed(1)} · horizon 24d`),
      ln('paper', 'DEMO · not a model · not a trade', 'PAPER', 'demo')
    ];
    roundLines = [];
    roundId = -1;
    clock = 0;
    logSig = '';
  }

  function beginRound(id) {
    if (roundLines.length) {
      history.push(...roundLines);
      if (history.length > 70) history = history.slice(-50);
    }
    roundId = id;
    paths = samplePaths((id + 1) * 9973 + 17);
    env = envelope(paths);
    let lo = Infinity, hi = -Infinity;
    candles.forEach(c => { lo = Math.min(lo, c.low); hi = Math.max(hi, c.high); });
    env.p10.forEach(v => { lo = Math.min(lo, v); });
    env.p90.forEach(v => { hi = Math.max(hi, v); });
    const pad = Math.max(3, (hi - lo) * 0.07);
    yLoT = lo - pad;
    yHiT = hi + pad;
    if (id === 0 || !Number.isFinite(yLo)) { yLo = yLoT; yHi = yHiT; }
    const p10 = env.p10[H], p50 = env.p50[H], p90 = env.p90[H];
    let up = 0;
    paths.forEach(p => { if (p.ys[H] >= model.level) up++; });
    const shownTests = model.tests.slice(-5);
    const bt = shownTests.length ? shownTests[id % shownTests.length] : { date: '—', hit: true };
    const r = (id % 5) + 1;
    const kind = model.regime === 'TRENDING' ? 'trend' : 'chop';
    roundLines = [
      ln('kronos', `predict next 24 · sample_count=${SAMPLES}`, `round ${r}`, 'dim'),
      ln('kronos', `median ${fmt(p50)} · p10 ${fmt(p10)} · p90 ${fmt(p90)}`, model.regime, kind),
      ln('kronos', `${up}/${SAMPLES} paths up ->`, '', ''),
      ln('life', `${bt.date} ${bt.hit ? 'inside' : 'outside'} p10–p90`, bt.hit ? 'HIT' : 'MISS', bt.hit ? 'hit' : 'miss'),
      ln('paper', 'nothing predicts until you approve', 'DEMO', 'demo')
    ];
    logSig = '';
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.floor(rect.width * dpr));
    const h = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: rect.width, h: rect.height };
  }

  function draw(t, grow) {
    const size = resize();
    const w = size.w;
    const h = size.h;
    if (w < 20 || h < 20 || !model || !paths.length) return;
    ctx.clearRect(0, 0, w, h);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const narrow = w < 560;
    const spec = root.querySelector('.kronos-spec');
    const specW = spec && getComputedStyle(spec).display !== 'none' ? spec.offsetWidth + 16 : 10;
    const plot = {
      left: Math.max(10, specW),
      right: w - (narrow ? 34 : 50),
      top: narrow ? 42 : 28,
      bottom: h - (narrow ? 22 : 16)
    };
    plot.w = Math.max(10, plot.right - plot.left);
    plot.h = Math.max(10, plot.bottom - plot.top);
    const split = narrow ? 0.58 : 0.46;
    const nowX = plot.left + plot.w * (split + Math.sin(t * 0.22) * 0.004);
    const yOf = v => plot.bottom - ((v - yLo) / (yHi - yLo || 1)) * plot.h;

    drawFloor(plot, t);
    drawGrid(plot, yOf);

    const shown = narrow ? candles.slice(-16) : candles;
    const n = shown.length;
    const slot = (nowX - plot.left - 12) / Math.max(1, n);
    shown.forEach((c, i) => {
      const x = plot.left + 8 + slot * (i + 0.5);
      drawCandle(c, x, slot, i >= n - 6, yOf, t);
    });

    const tip = Math.max(1, Math.round(grow * H));
    drawFutureTint(plot, nowX);
    drawBeam(nowX, plot, yOf(model.level), t);
    drawEnvelope(plot, nowX, yOf, tip);
    drawPaths(plot, nowX, yOf, tip, t);
    drawMedian(plot, nowX, yOf, tip, t);
    drawLabels(plot, nowX, yOf, tip, t, narrow);
    drawReticle(nowX, yOf(model.level), t, plot, narrow);
    drawStamp(nowX, yOf(model.level), t, grow);
    drawAxis(plot, yOf);
  }

  function drawFloor(plot, t) {
    ctx.save();
    const horizon = plot.top + plot.h * 0.34;
    const near = plot.bottom + 6;
    const drift = (t * 0.08) % 1;
    const point = (u, v) => {
      const k = Math.pow(v, 0.62);
      const y = horizon + (near - horizon) * k;
      const half = plot.w * (0.22 + 0.62 * k);
      const cx = plot.left + plot.w * 0.5;
      return { x: cx + u * half, y };
    };
    ctx.strokeStyle = 'rgba(26,173,179,0.34)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 7; i++) {
      const v = ((i / 7) + drift) % 1;
      const a = point(-1, Math.max(0.02, v));
      const b = point(1, Math.max(0.02, v));
      ctx.globalAlpha = 0.25 + 0.55 * v;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.45;
    for (let i = -4; i <= 4; i++) {
      const u = i / 4;
      const a = point(u * 0.15, 0.02);
      const b = point(u, 1);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawGrid(plot, yOf) {
    ctx.save();
    ctx.strokeStyle = 'rgba(26,173,179,0.13)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const v = yLo + (yHi - yLo) * (i / 4);
      const y = yOf(v);
      ctx.beginPath();
      ctx.moveTo(plot.left, y);
      ctx.lineTo(plot.right, y);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawCandle(c, x, slot, last, yOf, t) {
    const up = c.close >= c.open;
    const color = up ? '#1ee6a0' : '#ff3b6a';
    const yO = yOf(c.open);
    const yC = yOf(c.close);
    const top = Math.min(yO, yC);
    const bot = Math.max(yO, yC);
    const bh = Math.max(2.5, bot - top);
    const bw = Math.max(3, Math.min(12, slot * 0.62));
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    ctx.fillRect(x - bw * 0.9, top - 1, bw * 1.8, bh + 2);
    if (last) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 16 + 8 * (0.5 + 0.5 * Math.sin(t * 3.2));
    } else {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
    }
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = color;
    ctx.fillRect(x - bw / 2, top, bw, bh);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = up ? '#d8fff1' : '#ffd0dc';
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(x, yOf(c.high));
    ctx.lineTo(x, yOf(c.low));
    ctx.stroke();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = up ? '#f3fffb' : '#ffe4ea';
    ctx.fillRect(x - Math.max(1, bw * 0.18), top, Math.max(1, bw * 0.28), bh);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = color;
    const base = yOf(c.low);
    ctx.fillRect(x - bw / 2, base + 2, bw, Math.min(18, bh * 0.45));
    ctx.restore();
  }
  function drawFutureTint(plot, nowX) {
    const g = ctx.createLinearGradient(nowX, 0, plot.right, 0);
    g.addColorStop(0, 'rgba(26,173,179,0.02)');
    g.addColorStop(1, 'rgba(26,173,179,0.07)');
    ctx.fillStyle = g;
    ctx.fillRect(nowX, plot.top, plot.right - nowX, plot.h);
  }
  function drawBeam(nowX, plot, yPrice, t) {
    const x = nowX + Math.sin(t * 0.9) * 1.1;
    const top = plot.top + 4;
    const bot = plot.bottom - 2;
    const kick = 28 + Math.sin(t * 0.7) * 6;
    ctx.save();
    const g = ctx.createLinearGradient(x, top, x, bot);
    g.addColorStop(0, 'rgba(26,173,179,0)');
    g.addColorStop(0.18, 'rgba(26,173,179,0.16)');
    g.addColorStop(0.55, 'rgba(124,255,242,0.28)');
    g.addColorStop(1, 'rgba(26,173,179,0.02)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 11, top);
    ctx.lineTo(x + 11, top);
    ctx.lineTo(x + 14, yPrice);
    ctx.lineTo(x + kick, bot);
    ctx.lineTo(x - 4, bot);
    ctx.lineTo(x - 12, yPrice);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = '#7CFFF2';
    ctx.shadowBlur = 16;
    ctx.strokeStyle = 'rgba(220,255,252,0.92)';
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(x, top + 8);
    ctx.lineTo(x, yPrice);
    ctx.lineTo(x + kick * 0.45, bot);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.font = '11px JetBrains Mono, ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#041014';
    ctx.fillRect(x - 16, top + 2, 32, 14);
    ctx.strokeStyle = 'rgba(124,255,242,0.8)';
    ctx.strokeRect(x - 16, top + 2, 32, 14);
    ctx.fillStyle = '#7CFFF2';
    ctx.fillText('NOW', x, top + 13);
    ctx.restore();
  }
  function project(h01, value, z, plot, nowX, yOf) {
    const reach = Math.max(24, plot.right - nowX - 8);
    const foreshorten = 1 - Math.exp(-h01 * 2.35);
    const x = nowX + foreshorten * reach * (1 - z * 0.045);
    const anchor = yOf(model.level);
    const base = yOf(value);
    const y = anchor + (base - anchor) * (1 - h01 * 0.12) + z * h01 * 30;
    const s = 1 / (1 + h01 * 0.42 + Math.max(0, z) * 0.28);
    return { x, y, s };
  }
  function drawEnvelope(plot, nowX, yOf, tip) {
    if (!env) return;
    ctx.save();
    ctx.beginPath();
    for (let h = 0; h <= tip; h++) {
      const p = project(h / H, env.p90[h], 0, plot, nowX, yOf);
      if (h === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    for (let h = tip; h >= 0; h--) {
      const p = project(h / H, env.p10[h], 0.15, plot, nowX, yOf);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, plot.top, 0, plot.bottom);
    g.addColorStop(0, 'rgba(30,230,160,0.16)');
    g.addColorStop(0.5, 'rgba(246,201,69,0.07)');
    g.addColorStop(1, 'rgba(255,59,106,0.14)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  function strokeSmooth(pts) {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    if (pts.length < 3) {
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    } else {
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2;
        const my = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.stroke();
  }
  function drawPaths(plot, nowX, yOf, tip, t) {
    const order = paths.slice().sort((a, b) => b.z - a.z);
    order.forEach(p => {
      const pts = [];
      for (let h = 0; h <= tip; h++) pts.push(project(h / H, yAt(p, h, t), p.z, plot, nowX, yOf));
      const end = yAt(p, tip, t);
      const front = (1 - p.z) / 2;
      const d = end - model.level;
      let color = '#f6c945';
      if (d > 1.2) color = front > 0.62 ? '#d9fff4' : '#1ee6a0';
      else if (d < -1.2) color = front > 0.62 ? '#ffb3c4' : '#ff3b6a';
      ctx.save();
      ctx.globalAlpha = 0.2 + front * 0.72;
      ctx.strokeStyle = color;
      ctx.lineWidth = (0.55 + front * 1.35) * (pts[pts.length - 1].s || 1);
      strokeSmooth(pts);
      const tipP = pts[pts.length - 1];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(tipP.x, tipP.y, Math.max(1.1, (1.3 + front * 1.8) * tipP.s), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  function drawMedian(plot, nowX, yOf, tip, t) {
    if (!env) return;
    const pts = [];
    for (let h = 0; h <= tip; h++) {
      const wob = Math.sin(t * 1.6 + h * 0.4) * model.sigma * 0.04 * (h / H);
      pts.push(project(h / H, env.p50[h] + wob, -0.15, plot, nowX, yOf));
    }
    ctx.save();
    ctx.shadowColor = '#F6C945';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#ffe28a';
    ctx.lineWidth = 2.15;
    strokeSmooth(pts);
    ctx.restore();
  }
  function drawLabels(plot, nowX, yOf, tip, t, narrow) {
    if (!env || tip < 2) return;
    const h = tip;
    const wob = Math.sin(t * 1.6 + h * 0.4) * model.sigma * 0.04;
    const spots = [
      { name: 'p90', v: env.p90[h], color: '#7CFFF2', z: -0.2 },
      { name: 'median', v: env.p50[h] + wob, color: '#F6C945', z: -0.15 },
      { name: 'p10', v: env.p10[h], color: '#FF8AA3', z: 0.2 }
    ];
    ctx.save();
    ctx.font = '11px JetBrains Mono, ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    if (narrow) {
      let y = plot.top + 4;
      spots.forEach(s => {
        const text = s.name + ' ' + fmt(s.v);
        const tw = ctx.measureText(text).width;
        const x = Math.max(plot.left, plot.right - tw - 4);
        ctx.fillStyle = 'rgba(4,10,14,0.82)';
        ctx.fillRect(x - 3, y, tw + 8, 16);
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 3, y, tw + 8, 16);
        ctx.fillStyle = s.color;
        ctx.fillText(text, x, y + 8);
        y += 20;
      });
      ctx.restore();
      return;
    }
    spots.forEach(s => {
      const p = project(h / H, s.v, s.z, plot, nowX, yOf);
      const text = s.name + ' ' + fmt(s.v);
      const tw = ctx.measureText(text).width;
      const x = Math.min(plot.right - tw - 6, p.x + 6);
      const y = Math.max(plot.top + 10, Math.min(plot.bottom - 8, p.y));
      ctx.fillStyle = 'rgba(4,10,14,0.82)';
      ctx.fillRect(x - 3, y - 8, tw + 8, 16);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 3, y - 8, tw + 8, 16);
      ctx.fillStyle = s.color;
      ctx.fillText(text, x, y);
    });
    ctx.restore();
  }
  function drawReticle(x, y, t, plot, narrow) {
    const bob = reduced ? Math.sin(t * 1.2) * 2 : Math.sin(t * 2.15) * 8;
    const rx = x + Math.sin(t * 1.3) * 1.4;
    const ry = y + bob;
    const pulse = 0.5 + 0.5 * Math.sin(t * 4.1);
    const lift = (bob + 8) / 16;
    ctx.save();
    ctx.translate(rx, Math.min(plot.bottom - 4, ry + 28));
    ctx.scale(1, 0.32);
    ctx.globalAlpha = 0.28 - lift * 0.1;
    ctx.fillStyle = '#1AADB3';
    ctx.beginPath();
    ctx.arc(0, 0, 16 + (1 - lift) * 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const rad = ctx.createRadialGradient(rx, ry, 0, rx, ry, 28 + 16 * pulse);
    rad.addColorStop(0, 'rgba(255,255,255,0.95)');
    rad.addColorStop(0.18, 'rgba(124,255,242,0.75)');
    rad.addColorStop(0.45, 'rgba(26,173,179,0.28)');
    rad.addColorStop(1, 'rgba(26,173,179,0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(rx, ry, 34 + 14 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(rx, ry);
    ctx.rotate(-0.5 + Math.sin(t * 0.65) * 0.4);
    ctx.scale(1, 0.38 + 0.06 * Math.sin(t * 1.4));
    ctx.strokeStyle = 'rgba(210,255,252,0.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 22 + 5 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(rx, ry);
    ctx.strokeStyle = 'rgba(124,255,242,0.75)';
    ctx.lineWidth = 1.1;
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -t * 28;
    ctx.beginPath();
    ctx.arc(0, 0, 14 + 3 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const arm = 8 + 6 * pulse;
    ctx.beginPath();
    ctx.moveTo(-30, 0); ctx.lineTo(-arm, 0);
    ctx.moveTo(arm, 0); ctx.lineTo(30, 0);
    ctx.moveTo(0, -22); ctx.lineTo(0, -arm);
    ctx.moveTo(0, arm); ctx.lineTo(0, 22);
    ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = t * (1.4 + i * 0.25) + i * 2.1;
      const rad2 = 18 + i * 5;
      ctx.fillStyle = i === 1 ? '#F6C945' : '#7CFFF2';
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rad2, Math.sin(a) * rad2 * 0.42, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (narrow) return;
    ctx.save();
    ctx.font = '11px JetBrains Mono, ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#041014';
    ctx.fillRect(rx + 18, ry - 18, 62, 14);
    ctx.strokeStyle = 'rgba(124,255,242,0.75)';
    ctx.strokeRect(rx + 18, ry - 18, 62, 14);
    ctx.fillStyle = '#d7fff8';
    ctx.fillText('KRONOS', rx + 22, ry - 7);
    ctx.restore();
  }
  function drawStamp(nowX, y, t, grow) {
    if (grow < 0.72 || !model || !model.tests.length) return;
    const bt = model.tests[Math.max(0, roundId) % model.tests.length];
    const age = Math.min(1, (grow - 0.72) / 0.2);
    const hit = bt.hit;
    ctx.save();
    ctx.globalAlpha = age;
    ctx.font = '12px JetBrains Mono, ui-monospace, monospace';
    ctx.textAlign = 'left';
    const text = hit ? 'HIT' : 'MISS';
    const x = nowX + 28;
    const yy = y + 16 - age * 10;
    ctx.fillStyle = hit ? 'rgba(14,50,36,0.9)' : 'rgba(60,12,28,0.9)';
    ctx.fillRect(x, yy - 11, 42, 16);
    ctx.strokeStyle = hit ? '#1EE6A0' : '#FF3B6A';
    ctx.strokeRect(x, yy - 11, 42, 16);
    ctx.fillStyle = hit ? '#1EE6A0' : '#FF8AA3';
    ctx.fillText(text, x + 6, yy + 1);
    ctx.restore();
  }
  function drawAxis(plot, yOf) {
    ctx.save();
    ctx.font = '11px JetBrains Mono, ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(124,255,242,0.62)';
    const span = yHi - yLo;
    for (let i = 0; i <= 4; i++) {
      const v = yLo + span * (i / 4);
      const label = span > 50 ? String(Math.round(v)) : v.toFixed(0);
      ctx.fillText(label, plot.right + 6, yOf(v));
    }
    ctx.restore();
  }

  function tipStats(t, grow) {
    const h = Math.max(0, Math.min(H, Math.round(grow * H)));
    const arr = paths.map(p => yAt(p, h, t)).sort((a, b) => a - b);
    let up = 0;
    arr.forEach(v => { if (v >= model.level) up++; });
    return {
      h,
      p10: qOf(arr, 0.1),
      p50: qOf(arr, 0.5),
      p90: qOf(arr, 0.9),
      up,
      down: arr.length - up
    };
  }
  function setText(id, text) {
    const el = $(id);
    if (el && el.textContent !== text) el.textContent = text;
  }
  function paint(t, grow, u) {
    if (!model) return;
    const tip = tipStats(t, grow);
    const spread = tip.p90 - tip.p10;
    setText('k-last', fmt(model.level + Math.sin(t * 11) * 0.04));
    setText('k-giant', fmt(tip.p50));
    setText('k-p90', fmt(tip.p90));
    setText('k-p10', fmt(tip.p10));
    setText('k-spread', fmt(spread));
    setText('k-step', 'step ' + tip.h + '/24');
    const one = tipStats(t, Math.min(grow, 1 / H));
    setText('k-band', 'next 1d ' + fmt(one.p10) + '  ' + fmt(one.p50));
    setText('k-last2', 'last ' + fmt(model.level));
    const pos = (tip.p50 - tip.p10) / (spread || 1);
    $('k-meter').style.left = (Math.max(2, Math.min(98, pos * 100))) + '%';
    setText('k-up', String(tip.up));
    setText('k-dn', String(tip.down));
    const drawn = Math.round(grow * SAMPLES);
    setText('k-drawn', 'drawn ' + drawn + '/' + SAMPLES);
    setText('k-uppct', 'up ' + Math.round(100 * tip.up / SAMPLES) + '%');
    const cells = sq.children;
    const lit = Math.round(grow * cells.length);
    const green = Math.round(cells.length * tip.up / SAMPLES);
    for (let i = 0; i < cells.length; i++) {
      cells[i].className = i < lit ? (i < green ? 'on-up' : 'on-dn') : '';
    }
    const tests = model.tests;
    const hits = tests.filter(d => d.hit).length;
    setText('k-pct', tests.length ? Math.round(100 * hits / tests.length) + '%' : '—');
    setText('k-frac', hits + '/' + tests.length);
    $('k-hitbar').style.width = (tests.length ? 100 * hits / tests.length : 0) + '%';
    const shown = tests.slice(-5);
    const active = shown.length ? Math.max(0, roundId) % shown.length : 0;
    for (let i = 0; i < seq.children.length; i++) {
      const chip = seq.children[i];
      const row = shown[i];
      if (!row) { chip.textContent = '·'; chip.className = ''; continue; }
      chip.textContent = row.hit ? 'HIT' : 'MISS';
      chip.className = (row.hit ? 'hit' : 'miss') + (i === active ? ' on' : '');
    }
    const word = $('k-regime');
    word.textContent = model.regime;
    word.className = 'k-regime-word' + (model.regime === 'CHOPPY' ? ' chop' : '');
    setText('k-same', model.same ? 'same way' : 'turned');
    setText('k-riskv', 'spread ' + fmt(spread));
    $('k-risk').style.width = Math.max(6, Math.min(100, spread / 80 * 100)) + '%';
    const r = (Math.max(0, roundId) % 5) + 1;
    setText('k-round', 'ROUND ' + r + '/5 · ' + model.regime.toLowerCase());
    setText('k-rlabel', 'round ' + r + '/5');
    const liveUp = paths.filter(p => p.ys[H] >= model.level).length;
    for (let i = 0; i < roundsEl.children.length; i++) {
      const cell = roundsEl.children[i];
      const live = i === 5;
      const row = live
        ? { name: 'LIVE', regime: model.regime, text: liveUp + '/' + SAMPLES }
        : { name: 'R' + (i + 1), regime: model.windows[i].regime, text: model.windows[i].up + '/' + model.windows[i].n };
      cell.className = 'k-rb ' + (row.regime === 'TRENDING' ? 'trend' : 'chop') + (live ? ' live' : '');
      cell.children[0].textContent = row.name;
      cell.children[1].textContent = row.regime;
      cell.children[2].textContent = row.text;
    }
    renderLog(u);
  }
  function renderLog(u) {
    const total = roundLines.reduce((s, row) => s + row.msg.length, 0) || 1;
    let left = Math.floor(smooth(0, 0.8, u) * total);
    const partial = [];
    for (const row of roundLines) {
      if (left <= 0) break;
      if (left >= row.msg.length) {
        partial.push({ ...row, shown: row.msg, done: true });
        left -= row.msg.length;
      } else {
        partial.push({ ...row, shown: row.msg.slice(0, Math.floor(left)), done: false });
        left = 0;
      }
    }
    const all = history.concat(partial);
    const room = Math.max(4, Math.floor((logEl.clientHeight || 120) / 16));
    const slice = all.slice(-room);
    const sig = slice.map(row => row.n + ':' + (row.shown != null ? row.shown : row.msg)).join('|');
    if (sig === logSig) return;
    logSig = sig;
    logEl.replaceChildren();
    slice.forEach((row, i) => {
      const text = row.shown != null ? row.shown : row.msg;
      const done = row.shown != null ? row.done : true;
      const li = document.createElement('li');
      if (i === slice.length - 1 && !done) li.className = 'on';
      const n = document.createElement('span');
      n.className = 'n';
      n.textContent = String(row.n);
      const who = document.createElement('span');
      who.className = 'who ' + row.who;
      who.textContent = row.who;
      const msg = document.createElement('span');
      msg.className = 'msg';
      msg.textContent = text;
      const tag = document.createElement('span');
      tag.className = 'tag ' + (done ? row.kind : '');
      tag.textContent = done ? row.tag : '';
      li.append(n, who, msg, tag);
      logEl.appendChild(li);
    });
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, lastNow ? (now - lastNow) / 1000 : 0.016);
    lastNow = now;
    clock += dt;
    if (model) {
      const id = Math.floor(clock / ROUND);
      if (id !== roundId) beginRound(id);
      yLo += (yLoT - yLo) * 0.08;
      yHi += (yHiT - yHi) * 0.08;
      const u = (clock % ROUND) / ROUND;
      const grow = smooth(0.05, 0.7, u);
      draw(clock, grow);
      paint(clock, grow, u);
    }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (running) return;
    running = true;
    lastNow = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  const placeholder = [];
  for (let i = 0; i < 80; i++) placeholder.push({ date: 'paper', score: 62 + Math.sin(i * 0.37) * 8 + i * 0.05, parts: {} });
  applySeries(placeholder, true);

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) start(); else stop(); });
  }, { threshold: 0.02 });
  io.observe(root);
  start();

  Promise.all(['steps.json', 'workouts.json', 'sleep.json', 'faith.json', 'cursor.json'].map(name =>
    fetch('/habits/' + name).then(r => r.ok ? r.json() : null).catch(() => null)
  )).then(([steps, workouts, sleep, faith, cursor]) => {
    const series = buildSeries({ steps, workouts, sleep, faith, cursor });
    if (series.length < 20) {
      history.push(ln('paper', 'json missed · paper candles', 'DEMO', 'demo'));
      logSig = '';
      return;
    }
    lineNo = 1;
    applySeries(series, false);
  });
})();
