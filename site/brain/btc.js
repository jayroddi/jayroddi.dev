/* Bitcoin daily closes, shown only under the brain unlock.
   Source: CoinMetrics Community API, asset metric PriceUSD, frequency 1d.
   https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=PriceUSD&frequency=1d
   https://docs.coinmetrics.io/tutorials-and-examples/community-data
   Bundled 2026-11-17. No API key. UTC day, close.
   Power law, fit on this series: log10(price) = a + b * log10(days since 2009-01-03).
   The band is that line ± 1 residual standard deviation. Theoretical, not advice.
   Halving dates are the subsidy cuts at blocks 210000, 420000, 630000, and 840000. */
(() => {
  const root = document.getElementById('btc');
  if (!root) return;

  const HALVINGS = [
    { d: '2012-11-28', n: 1 },
    { d: '2016-07-09', n: 2 },
    { d: '2020-05-11', n: 3 },
    { d: '2024-04-20', n: 4 }
  ];
  const VB_W = 1000;
  const VB_H = 560;
  const PLOT = { l: 118, r: 988, t: 28, b: 500 };

  const utc = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const isoAt = (t0, i) => {
    const dt = new Date(utc(t0) + i * 86400000);
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return dt.getUTCFullYear() + '-' + m + '-' + d;
  };
  const dot = (iso) => iso.replace(/-/g, '.');
  const days = (a, b) => Math.round((utc(b) - utc(a)) / 86400000);
  const money = (n) => {
    if (n >= 1000) return '$' + Math.round(n).toLocaleString('en-US');
    if (n >= 1) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (n >= 0.01) return '$' + n.toFixed(4);
    return '$' + n.toPrecision(3);
  };
  const tickLabel = (n) => {
    if (n >= 1000) return '$' + Math.round(n / 1000) + 'k';
    if (n >= 1) return '$' + n;
    return '$' + n;
  };

  const svgNS = 'http://www.w3.org/2000/svg';
  const el = (name, attrs) => {
    const node = document.createElementNS(svgNS, name);
    Object.keys(attrs).forEach((key) => node.setAttribute(key, attrs[key]));
    return node;
  };

  fetch('/brain/btc.json', { cache: 'no-cache' })
    .then((res) => res.ok ? res.json() : Promise.reject())
    .then((data) => draw(data))
    .catch(() => {
      root.textContent = 'btc history unavailable';
    });

  function draw(data) {
    const px = data.px;
    const n = px.length;
    const lastI = n - 1;
    const t0 = data.t0;
    const lastIso = isoAt(t0, lastI);
    let athI = 0;
    for (let i = 1; i < n; i++) if (px[i] >= px[athI]) athI = i;
    const athIso = isoAt(t0, athI);
    const dd = (px[lastI] / px[athI] - 1) * 100;
    let halving = HALVINGS[0];
    HALVINGS.forEach((h) => { if (h.d <= lastIso) halving = h; });
    const since = days(halving.d, lastIso);
    const cycle = halving.n + 1;

    const law = data.law;
    const yHat = (iso) => {
      const d = days(law.genesis, iso);
      return law.a + law.b * Math.log10(d);
    };

    let lo = Math.log10(Math.min(...px));
    let hi = Math.log10(Math.max(...px));
    const bandLo = yHat(t0) - law.sd;
    const bandHi = yHat(lastIso) + law.sd;
    lo = Math.min(lo, bandLo);
    hi = Math.max(hi, bandHi);
    const pad = (hi - lo) * 0.06;
    lo -= pad;
    hi += pad;

    const xOf = (i) => PLOT.l + (n === 1 ? 0 : i / (n - 1)) * (PLOT.r - PLOT.l);
    const yOfLog = (logP) => {
      const t = (logP - lo) / (hi - lo);
      return PLOT.b - t * (PLOT.b - PLOT.t);
    };
    const yOf = (p) => yOfLog(Math.log10(p));

    root.replaceChildren();
    root.setAttribute('aria-label', 'bitcoin daily close ' + money(px[lastI]) + ' on ' + dot(lastIso));

    const top = document.createElement('div');
    top.className = 'btc-top';
    const kicker = document.createElement('p');
    kicker.className = 'btc-kicker';
    kicker.textContent = 'btc';
    const read = document.createElement('p');
    read.className = 'btc-read';
    top.append(kicker, read);

    const plot = document.createElement('div');
    plot.className = 'btc-plot';
    const svg = el('svg', { viewBox: '0 0 ' + VB_W + ' ' + VB_H, preserveAspectRatio: 'none', role: 'img' });
    svg.setAttribute('aria-hidden', 'true');

    const ticks = [0.1, 1, 10, 100, 1000, 10000, 100000].filter((v) => {
      const y = yOf(v);
      return y > PLOT.t - 1 && y < PLOT.b + 1;
    });
    ticks.forEach((v) => {
      const y = yOf(v);
      svg.append(el('line', {
        x1: PLOT.l, x2: PLOT.r, y1: y.toFixed(1), y2: y.toFixed(1),
        stroke: 'rgba(26,173,179,0.16)', 'stroke-width': '1', 'vector-effect': 'non-scaling-stroke'
      }));
      const label = el('text', { x: '8', y: (y + 3).toFixed(1) });
      label.textContent = tickLabel(v);
      svg.append(label);
    });

    const upper = [];
    const lower = [];
    const center = [];
    for (let i = 0; i < n; i += 7) {
      const iso = isoAt(t0, i);
      const mid = yHat(iso);
      const x = xOf(i).toFixed(1);
      upper.push(x + ',' + yOfLog(mid + law.sd).toFixed(1));
      lower.push(x + ',' + yOfLog(mid - law.sd).toFixed(1));
      center.push(x + ',' + yOfLog(mid).toFixed(1));
    }
    const endIso = lastIso;
    const endMid = yHat(endIso);
    const endX = xOf(lastI).toFixed(1);
    upper.push(endX + ',' + yOfLog(endMid + law.sd).toFixed(1));
    lower.push(endX + ',' + yOfLog(endMid - law.sd).toFixed(1));
    center.push(endX + ',' + yOfLog(endMid).toFixed(1));
    svg.append(el('polygon', { class: 'band', points: upper.join(' ') + ' ' + lower.reverse().join(' ') }));
    svg.append(el('polyline', { class: 'law', points: center.join(' ') }));

    HALVINGS.forEach((h) => {
      const i = days(t0, h.d);
      if (i < 0 || i > lastI) return;
      const x = xOf(i);
      svg.append(el('line', {
        class: 'halving',
        x1: x.toFixed(1), x2: x.toFixed(1),
        y1: PLOT.t, y2: PLOT.b
      }));
      const label = el('text', { class: 'year', x: x.toFixed(1), y: '16', 'text-anchor': 'middle' });
      label.textContent = String(h.d.slice(0, 4));
      svg.append(label);
    });

    const price = [];
    for (let i = 0; i < n; i++) price.push(xOf(i).toFixed(1) + ',' + yOf(px[i]).toFixed(1));
    svg.append(el('polyline', { class: 'price', points: price.join(' ') }));

    const ath = el('circle', {
      class: 'ath',
      cx: xOf(athI).toFixed(1),
      cy: yOf(px[athI]).toFixed(1),
      r: '5'
    });
    svg.append(ath);
    const lastDot = el('circle', {
      class: 'dot',
      cx: xOf(lastI).toFixed(1),
      cy: yOf(px[lastI]).toFixed(1),
      r: '3.5'
    });
    svg.append(lastDot);

    const cross = el('line', { class: 'cross', x1: '0', x2: '0', y1: PLOT.t, y2: PLOT.b });
    cross.style.display = 'none';
    const hover = el('circle', { class: 'dot', r: '3.5' });
    hover.style.display = 'none';
    svg.append(cross, hover);

    const axis0 = el('text', { x: String(PLOT.l), y: '534', 'text-anchor': 'start' });
    axis0.textContent = t0.slice(0, 4);
    const axis1 = el('text', { x: String(PLOT.r), y: '534', 'text-anchor': 'end' });
    axis1.textContent = lastIso.slice(0, 4);
    const logMark = el('text', { x: '8', y: '16' });
    logMark.textContent = 'log';
    svg.append(axis0, axis1, logMark);

    plot.append(svg);

    const meta = document.createElement('p');
    meta.className = 'btc-meta';
    meta.textContent = 'ath ' + money(px[athI]) + ' · ' + dot(athIso)
      + ' · ' + dd.toFixed(1) + '%'
      + ' · cycle ' + cycle + ' · ' + since + 'd since halving';

    const note = document.createElement('p');
    note.className = 'btc-note';
    note.textContent = 'power law band · theoretical · not advice';

    root.append(top, plot, meta, note);

    const show = (i) => {
      const iso = isoAt(t0, i);
      read.textContent = dot(iso) + ' · ' + money(px[i]);
    };
    show(lastI);

    const pick = (event) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const x = ((event.clientX - rect.left) / rect.width) * VB_W;
      const span = PLOT.r - PLOT.l;
      let i = Math.round(((x - PLOT.l) / span) * (n - 1));
      if (i < 0) i = 0;
      if (i > lastI) i = lastI;
      const cx = xOf(i);
      cross.style.display = '';
      cross.setAttribute('x1', cx.toFixed(1));
      cross.setAttribute('x2', cx.toFixed(1));
      hover.style.display = '';
      hover.setAttribute('cx', cx.toFixed(1));
      hover.setAttribute('cy', yOf(px[i]).toFixed(1));
      show(i);
    };
    const clear = () => {
      cross.style.display = 'none';
      hover.style.display = 'none';
      show(lastI);
    };
    svg.addEventListener('pointermove', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      pick(event);
    });
    svg.addEventListener('pointerdown', pick);
    svg.addEventListener('pointerleave', (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      clear();
    });
  }
})();
