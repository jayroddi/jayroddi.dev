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
   9       b (reverse)         1.52
   10      a (shake, peak)     1.75

   The wave duration helper is WAVE_MS (5000). The live rebuild is REBUILD_MS
   (5000) after a short explosion. The core-out order is that same clock.
   ?wave= still only retimes the helper. */

export const CODE = Object.freeze(['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right', 'b', 'a', 'start']);

export const SPEED_RAD_S = Object.freeze([
  0.10, 0.18, 0.28, 0.40, 0.54, 0.70, 0.88, 1.08, 1.30, 1.52, 1.75
]);

export const WAVE_MS = 5000;
export const EXPLODE_MS = 900;
export const EXPLODE_REDUCED_MS = 480;
export const REBUILD_MS = 5000;

const KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'enter' };

export function createRun() {
  return { prefix: 0, direction: null, phase: 'idle', startedAt: null, startAt: null, durationMs: null, flip: false };
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
    const flip = nextKey === 'b' ? true : !!run.flip;
    if (nextKey === 'start') {
      return {
        run: {
          prefix,
          direction: run.direction,
          phase: 'wave',
          startedAt,
          startAt: nowMs,
          durationMs: nowMs - startedAt,
          flip
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
        durationMs: null,
        flip
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

/* B reverses the spin that the arrows already chose. The axis stays. */
export function spinSign(run) {
  const turn = turnAxis(run && run.direction);
  return { axis: turn.axis, sign: turn.sign * (run && run.flip ? -1 : 1), idle: turn.idle };
}

/* A, before Start, shakes the nodes inside the brain. Start is the explosion. */
export function shaking(run) {
  return !!run && run.phase === 'go' && run.prefix >= 10;
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
    flip: !!run.flip,
    startedAt: run.startedAt,
    startAt: run.startAt,
    durationMs: run.durationMs
  };
}

/* The symbol burst is one shot. These match the CSS durations. */
export const BURST_MS = 780;
export const BURST_REDUCED_MS = 480;
/* After the gold wave, the cloud keeps turning, much slower than the sequence. */
export const GOLD_SPIN_RAD_S = 0.04;

export function controlView(phase) {
  return {
    pad: phase === 'idle' || phase === 'go',
    arrow: phase === 'open',
    nowReady: phase === 'open'
  };
}

/* Originals leave at the burst. Clones are not the pad. elapsed is unused on purpose. */
export function padVisible(phase, elapsedMs, reduced) {
  void elapsedMs;
  void reduced;
  return phase === 'idle' || phase === 'go';
}

export function revealAllowed(phase, intent) {
  return phase === 'open' && (intent === 'scroll' || intent === 'arrow');
}

/* Drag before the code, and again once every node is gold. Not during the wave. */
export function gesturesAllowed(run) {
  return !!run && (run.phase === 'idle' || run.phase === 'open');
}

/* Idle holds still so a drag sticks. The code spins up. The blow-up and the
   gold brain both turn at the calm gold speed. Reduced motion never spins. */
export function autoSpin(run, reduced) {
  if (reduced || !run) return 0;
  if (run.phase === 'go') return speedOf(run, false);
  if (run.phase === 'wave' || run.phase === 'open') return GOLD_SPIN_RAD_S;
  return 0;
}

export function playDuration(reduced) {
  return (reduced ? EXPLODE_REDUCED_MS : EXPLODE_MS) + REBUILD_MS;
}

/* Rebuild clock only. 0 at the core's first moment, 1 when the shell is in. */
export function nodeAppear(radius, rebuildElapsed, maxRadius, durationMs = REBUILD_MS) {
  const maxR = maxRadius > 0 ? maxRadius : 1;
  const band = Math.max(8, maxR * 0.14);
  if (rebuildElapsed >= durationMs) return 1;
  const progress = Math.max(0, rebuildElapsed) / durationMs;
  const front = progress * (maxR + band);
  const t = Math.max(0, Math.min(1, (front - radius) / band));
  return t * t * (3 - 2 * t);
}

export function linkAppear(radiusA, radiusB, rebuildElapsed, maxRadius, durationMs = REBUILD_MS) {
  return Math.min(
    nodeAppear(radiusA, rebuildElapsed, maxRadius, durationMs),
    nodeAppear(radiusB, rebuildElapsed, maxRadius, durationMs)
  );
}

/* elapsed is from the successful Start. Explosion first, then the 10s rebuild. */
export function playFrame(elapsedMs, maxRadius, reduced) {
  const boom = reduced ? EXPLODE_REDUCED_MS : EXPLODE_MS;
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  const exploding = elapsed < boom;
  const explodeTime = exploding ? elapsed / Math.max(boom, 1) : 1;
  const rebuildElapsed = exploding ? 0 : elapsed - boom;
  const maxR = maxRadius > 0 ? maxRadius : 1;
  const band = Math.max(8, maxR * 0.14);
  const done = !exploding && rebuildElapsed >= REBUILD_MS;
  const progress = exploding ? 0 : (done ? 1 : rebuildElapsed / REBUILD_MS);
  const front = done ? maxR + band : progress * (maxR + band);
  return {
    explodeTime,
    exploding,
    rebuild: exploding ? 0 : 1,
    /* Outward only while it is blowing apart. The rebuild grows at the real positions. */
    travel: reduced || !exploding ? 0 : explodeTime,
    front,
    band,
    lock: done ? 1 : 0,
    progress,
    rebuildElapsed
  };
}

export function graphZoomAllowed() {
  return false;
}

/* Camera framing for a 38° vertical fov. Diameter is the sphere's CSS size
   when the camera sits at (maxR * 1.16) / sin(half). */
export function frameMetrics(width, height) {
  const aspect = width / Math.max(height, 1);
  const vHalf = (38 * Math.PI / 180) / 2;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const half = Math.min(vHalf, hHalf);
  const limiting = hHalf < vHalf ? width : height;
  const diameter = limiting * (Math.sin(half) / Math.tan(half)) / 1.16;
  return { diameter, distFactor: 1 / Math.sin(half) };
}

/* Narrow frames keep the bright scale. Wide frames use that same point size
   relative to the framed sphere, including the pixel-ratio cap, so a retina
   desktop is not a dimmer copy of the phone. */
export function pointScaleFor(width, height, pixelRatio, devicePixelRatio = pixelRatio) {
  const short = Math.min(width, height);
  if (!(width >= 760)) return short * 1.55;
  const device = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const dpr = pixelRatio > 0 ? pixelRatio : 1;
  const narrowDpr = Math.min(device, 1.35);
  const ref = frameMetrics(640, 700);
  const here = frameMetrics(width, height);
  const refScale = 640 * 1.55;
  return refScale
    * (here.distFactor / ref.distFactor)
    * (dpr / narrowDpr)
    * (here.diameter / ref.diameter);
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
