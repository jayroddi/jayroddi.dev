/* Entrance sequence, spin, and the gold wave.
   The sequence is in the page source on purpose. It is a presentation, not a lock.

   Speed is radians per second around one axis. 0.10 is about 6 deg/s.
   1.75 is about 100 deg/s, one turn in 3.6s. The row is the accepted-key
   count. Start does not add a faster row. Reduced motion is 0 on every row.

   prefix  key just accepted   rad/s
   0       idle                0.10
   1       up                  0.18
   2       up                  0.28
   3       down                0.40
   4       down                0.54
   5       left                0.70
   6       right               0.88
   7       left                1.08
   8       right               1.30
   9       b                   1.52
   10      a (peak)            1.75

   The wave duration is WAVE_MS (5000). waveDuration accepts only 3 or 5
   seconds from ?wave= so the same wave can be retimed without another build. */

export const CODE = Object.freeze(['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a', 'start']);

export const SPEED_RAD_S = Object.freeze([
  0.10, 0.18, 0.28, 0.40, 0.54, 0.70, 0.88, 1.08, 1.30, 1.52, 1.75
]);

export const WAVE_MS = 5000;

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'enter' };

export function createRun() {
  return { prefix: 0, direction: null, phase: 'idle', startedAt: null, startAt: null, durationMs: null };
}

export function createPad() {
  return { run: createRun(), lockedUntil: 0, bad: false };
}

function lastArrow(keys) {
  for (let i = keys.length - 1; i >= 0; i--) {
    const key = keys[i];
    if (key === 'up' || key === 'down' || key === 'left' || key === 'right') return key;
  }
  return null;
}

export function keyFromKeyboard(event) {
  if (!event || event.altKey || event.ctrlKey || event.metaKey) return null;
  if (KEYS[event.key]) return KEYS[event.key];
  if (typeof event.key === 'string' && event.key.length === 1) {
    const key = event.key.toLowerCase();
    if (key === 'b' || key === 'a') return key;
  }
  return null;
}

export function keyboardPress(event) {
  if (!event || event.repeat) return null;
  return keyFromKeyboard(event);
}

export function applyKey(run, key, nowMs, source) {
  if (run.phase === 'wave' || run.phase === 'open') return { run, result: 'locked' };
  let nextKey = key;
  if (nextKey === 'enter') {
    if (source !== 'keyboard' || run.prefix === 0) return { run, result: 'ignore' };
    if (run.prefix !== CODE.length - 1) return { run: createRun(), result: 'reset' };
    nextKey = 'start';
  }
  if (nextKey === CODE[run.prefix]) {
    const prefix = run.prefix + 1;
    const startedAt = run.startedAt == null ? nowMs : run.startedAt;
    if (nextKey === 'start') {
      return {
        run: {
          prefix,
          direction: run.direction,
          phase: 'wave',
          startedAt,
          startAt: nowMs,
          durationMs: nowMs - startedAt
        },
        result: 'start'
      };
    }
    return {
      run: {
        prefix,
        direction: lastArrow(CODE.slice(0, prefix)),
        phase: 'go',
        startedAt,
        startAt: null,
        durationMs: null
      },
      result: 'advance'
    };
  }
  if (run.prefix === 0 && CODE.indexOf(nextKey) < 0) return { run, result: 'ignore' };
  return { run: createRun(), result: 'reset' };
}

export function pressPad(pad, key, nowMs, source, reduced) {
  if (nowMs < pad.lockedUntil) return { pad, result: 'locked' };
  const out = applyKey(pad.run, key, nowMs, source);
  if (out.result === 'reset') {
    return {
      pad: { run: out.run, lockedUntil: nowMs + (reduced ? 480 : 540), bad: true },
      result: 'reset'
    };
  }
  if (out.result === 'ignore' || out.result === 'locked') return { pad, result: out.result };
  return { pad: { run: out.run, lockedUntil: 0, bad: false }, result: out.result };
}

export function releasePad(pad, nowMs) {
  if (nowMs < pad.lockedUntil || !pad.bad) return pad;
  return { run: pad.run, lockedUntil: 0, bad: false };
}

export function speedOf(run, reduced) {
  if (reduced) return 0;
  if (!run || run.phase === 'idle') return SPEED_RAD_S[0];
  if (run.phase === 'wave' || run.phase === 'open') return SPEED_RAD_S[SPEED_RAD_S.length - 1];
  const index = Math.max(0, Math.min(SPEED_RAD_S.length - 1, run.prefix));
  return SPEED_RAD_S[index];
}

export function turnAxis(direction) {
  if (direction === 'up') return { axis: 'right', sign: -1, idle: false };
  if (direction === 'down') return { axis: 'right', sign: 1, idle: false };
  if (direction === 'left') return { axis: 'up', sign: 1, idle: false };
  if (direction === 'right') return { axis: 'up', sign: -1, idle: false };
  return { axis: 'up', sign: 1, idle: true };
}

export function padTone(phase, bad) {
  if (bad) return 'bad';
  if (phase === 'idle') return 'teal';
  return 'gold';
}

export function waveDuration(search) {
  const value = Number(new URLSearchParams(search).get('wave'));
  if (value === 3 || value === 5) return value * 1000;
  return WAVE_MS;
}

export function waveFrame(elapsedMs, maxRadius, durationMs = WAVE_MS) {
  const duration = durationMs > 0 ? durationMs : WAVE_MS;
  const band = Math.max(4, maxRadius * 0.08);
  const done = elapsedMs >= duration;
  const progress = done ? 1 : Math.max(0, elapsedMs) / duration;
  return { front: progress * (maxRadius + band), band, lock: done ? 1 : 0, progress };
}

export function goldAmount(radius, elapsedMs, maxRadius, durationMs = WAVE_MS) {
  const frame = waveFrame(elapsedMs, maxRadius, durationMs);
  if (frame.lock) return 1;
  const amount = Math.max(0, Math.min(1, (frame.front - radius) / frame.band));
  return amount * amount * (3 - 2 * amount);
}

export function advanceWave(run, nowMs, durationMs) {
  if (run.phase !== 'wave' || run.startAt == null) return run;
  if (nowMs - run.startAt < durationMs) return run;
  return {
    prefix: run.prefix,
    direction: run.direction,
    phase: 'open',
    startedAt: run.startedAt,
    startAt: run.startAt,
    durationMs: run.durationMs
  };
}

/* The symbol burst is one shot. These match the CSS durations. */
export const BURST_MS = 780;
export const BURST_REDUCED_MS = 480;

export function controlView(phase) {
  return {
    pad: phase === 'idle' || phase === 'go',
    arrow: phase === 'open',
    nowReady: phase === 'open'
  };
}

/* The pad stays through the burst, then the slot is empty until the wave locks. */
export function padVisible(phase, elapsedMs, reduced) {
  if (phase === 'idle' || phase === 'go') return true;
  if (phase !== 'wave') return false;
  const limit = reduced ? BURST_REDUCED_MS : BURST_MS;
  const elapsed = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  return elapsed < limit;
}

export function revealAllowed(phase, intent) {
  return phase === 'open' && (intent === 'scroll' || intent === 'arrow');
}

/* Drag orbit only while the sequence is idle. Zoom is never a graph gesture. */
export function gesturesAllowed(run) {
  return !!run && run.phase === 'idle';
}

export function graphZoomAllowed() {
  return false;
}

/* The symbol burst plays once, only when Start completes the sequence. */
export function shouldCelebrate(result, already) {
  return result === 'start' && already !== true;
}

/* A finished node is the gold color. A pulse added on top would paint over it. */
export function paintedColor(base, gold, pulse, goldColor) {
  const amount = Math.max(0, Math.min(1, gold));
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    if (amount >= 1) out[i] = goldColor[i];
    else out[i] = base[i] * (1 - amount) + goldColor[i] * amount + (pulse[i] || 0) * (1 - amount);
  }
  return out;
}
