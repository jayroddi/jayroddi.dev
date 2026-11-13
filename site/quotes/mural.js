/* Venice Beach mural on /quotes. Behavior matches live codylarae.art:
   pan, zoom, night-sky stars, today's trail, and the center quote.
   Quotes come from this site's quotes.json. Chicago dates only. */
(() => {
  const QUOTES = "/quote-of-the-day/quotes.json";
  const FACE_X = 0.46;
  const FACE_Y = 0.44;
  const OVERSCAN = 1.5;

  // Quote stars are a night sky on the dark utility box, not the bright
  // portrait, sky, sand, or street. Fractions are of mural.jpg.
  //
  // DARK_BOX traces the painted box, inset from the metal edges measured
  // on the photo. The top edge is higher on the right. PORTRAIT cuts the
  // boy out of that box, glasses included, so stars stay on the black panels.
  // DARK_LUMINANCE (0–255) rejects bright pixels still inside the box,
  // such as the word Never and the teal around the face.
  //
  // Expand the field later, when the box is too full to read as a sky:
  //   - set STAR_REGION to "full" to scatter every star across the photo, or
  //   - raise DARK_FIELD_CAPACITY, or widen DARK_BOX / raise DARK_LUMINANCE.
  // Stars past DARK_FIELD_CAPACITY spill onto the rest of the photo
  // without moving the ones already on the box. About 80 fit here at
  // the current gap before the sky looks packed.
  const STAR_REGION = "dark";
  const DARK_FIELD_CAPACITY = 80;
  const DARK_LUMINANCE = 52;
  const STAR_GAP_PX = 72;
  const BOX_INSET_PX = 34;
  const DARK_BOX = [
    [0.2536, 0.2239],
    [0.7543, 0.1564],
    [0.7514, 0.7831],
    [0.2600, 0.7692],
  ];
  const PORTRAIT = { cx: 0.4679, cy: 0.4713, rx: 0.1500, ry: 0.2892 };

  // Squint's forehead on mural.jpg (2800×1867). The glasses frame starts
  // near y=787 and the hairline near y=523. A painted rivet sits just
  // right of the face center, so the swoosh sits at x=1268, y=655.
  const SWOOSH_X = 1268 / 2800;
  const SWOOSH_Y = 655 / 1867;
  const SWOOSH_TEXT = "you\u2019re remembered for the rules you break\n\njust do it";

  const viewport = document.getElementById("viewport");
  const stage = document.getElementById("stage");
  const mural = document.getElementById("mural");
  const sky = document.getElementById("sky");
  const dialog = document.getElementById("quote");
  const qDate = document.getElementById("q-date");
  const qText = document.getElementById("q-text");
  const qBy = document.getElementById("q-by");
  const inner = dialog.querySelector(".inner");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const quoteOf = new WeakMap();

  let imgW = 2800;
  let imgH = 1867;
  let scale = 1;
  let x = 0;
  let y = 0;
  let pinnedToFace = true;
  let lastVw = 0;
  let lastVh = 0;
  let signature = null;
  let current = [];
  let opener = null;
  let suppressClick = false;
  let suppressStarFocus = false;
  let todayBtn = null;
  let guideDone = false;
  const READ_KEY = "codylarae.read";
  let readKeys = new Set();
  let blockDismissUntil = 0;
  let keyboardNav = false;
  let glide = 0;
  let vx = 0;
  let vy = 0;
  let trackX = 0;
  let trackY = 0;
  let trackT = 0;
  let lastTouchAt = 0;
  let midnightTimer = 0;
  let skyLum = null;
  let darkSlots = null;

  const touches = new Map();
  let mouse = null;
  let pinch = null;
  let gestureMoved = false;
  let tapStar = null;

  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#FFD700" d="M12 1.15 14.1 9.9 22.85 12 14.1 14.1 12 22.85 9.9 14.1 1.15 12 9.9 9.9Z"/></svg>';
  const guide = document.getElementById("guide");
  const guideGlow = document.createElement("div");
  guideGlow.className = "guide-glow";
  const guideDots = [0, 1, 2, 3].map((i) => {
    const dot = document.createElement("span");
    dot.className = "guide-dot";
    dot.style.setProperty("--n", String(i));
    return dot;
  });
  guide.append(guideGlow, ...guideDots);

  function loadRead() {
    try {
      const raw = localStorage.getItem(READ_KEY);
      const list = raw ? JSON.parse(raw) : [];
      readKeys = new Set(Array.isArray(list) ? list.filter((k) => typeof k === "string") : []);
    } catch {
      readKeys = new Set();
    }
  }

  function saveRead() {
    try { localStorage.setItem(READ_KEY, JSON.stringify([...readKeys])); } catch {}
  }

  function setGlyphFill(btn) {
    const path = btn.querySelector("path");
    if (!path) return;
    path.setAttribute("fill", btn.classList.contains("is-read")
      ? "#1aadb3"
      : btn.classList.contains("is-today")
        ? "#ffe566"
        : "#FFD700");
  }

  function markRead(q, btn) {
    const key = quoteKey(q);
    if (!readKeys.has(key)) {
      readKeys.add(key);
      saveRead();
    }
    btn.classList.add("is-read");
    btn.classList.remove("is-today");
    setGlyphFill(btn);
    if (todayBtn === btn) todayBtn = null;
    dismissGuide();
  }

  function starPoint(btn) {
    return {
      x: x + (parseFloat(btn.style.left) / 100) * imgW * scale,
      y: y + (parseFloat(btn.style.top) / 100) * imgH * scale,
    };
  }

  function dismissGuide() {
    if (guideDone) return;
    guideDone = true;
    guide.classList.add("is-gone");
    setTimeout(() => { guide.hidden = true; }, 680);
  }

  function updateGuide() {
    if (guideDone || !todayBtn) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (vw < 2 || vh < 2) return;
    const p = starPoint(todayBtn);
    const pad = 36;
    if (p.x >= pad && p.y >= pad && p.x <= vw - pad && p.y <= vh - pad) {
      dismissGuide();
      return;
    }
    const cx = vw / 2;
    const cy = vh / 2;
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    let tHit = Infinity;
    if (ux > 1e-4) tHit = Math.min(tHit, (vw - 20 - cx) / ux);
    else if (ux < -1e-4) tHit = Math.min(tHit, (20 - cx) / ux);
    if (uy > 1e-4) tHit = Math.min(tHit, (vh - 20 - cy) / uy);
    else if (uy < -1e-4) tHit = Math.min(tHit, (20 - cy) / uy);
    if (!Number.isFinite(tHit) || tHit < 8) tHit = Math.min(vw, vh) * 0.42;
    [0.52, 0.68, 0.82, 0.95].forEach((frac, i) => {
      const t = tHit * frac;
      guideDots[i].style.left = (cx + ux * t) + "px";
      guideDots[i].style.top = (cy + uy * t) + "px";
    });
    guideGlow.style.left = (cx + ux * tHit) + "px";
    guideGlow.style.top = (cy + uy * tHit) + "px";
    guide.hidden = false;
    guide.classList.remove("is-gone");
  }

  function releaseStarFocus() {
    suppressStarFocus = true;
    const blurStar = () => {
      const active = document.activeElement;
      const star = active && active.closest ? active.closest(".star, .swoosh") : null;
      if (star) star.blur();
    };
    blurStar();
    requestAnimationFrame(blurStar);
    setTimeout(blurStar, 30);
    setTimeout(() => {
      blurStar();
      suppressStarFocus = false;
    }, 180);
  }

  function readImageSize() {
    const nextW = mural.naturalWidth || Number(mural.getAttribute("width")) || 2800;
    const nextH = mural.naturalHeight || Number(mural.getAttribute("height")) || 1867;
    if (nextW !== imgW || nextH !== imgH) {
      skyLum = null;
      darkSlots = null;
    }
    imgW = nextW;
    imgH = nextH;
    stage.style.width = imgW + "px";
    stage.style.height = imgH + "px";
  }

  function fitViewport() {
    const vv = window.visualViewport;
    if (!vv) return;
    viewport.style.width = vv.width + "px";
    viewport.style.height = vv.height + "px";
    viewport.style.top = vv.offsetTop + "px";
    viewport.style.left = vv.offsetLeft + "px";
  }

  function limits() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const contain = Math.min(vw / imgW, vh / imgH);
    const cover = Math.max(vw / imgW, vh / imgH);
    const min = contain;
    const max = Math.max(cover * 5, min * 4);
    const initial = Math.min(max, Math.max(min, cover * OVERSCAN));
    return { vw, vh, min, max, initial };
  }

  function clamp() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const sw = imgW * scale;
    const sh = imgH * scale;
    if (sw <= vw + 0.5) x = (vw - sw) / 2;
    else x = Math.min(0, Math.max(vw - sw, x));
    if (sh <= vh + 0.5) y = (vh - sh) / 2;
    else y = Math.min(0, Math.max(vh - sh, y));
  }

  function apply() {
    stage.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(" + scale + ")";
    updateGuide();
  }

  function syncStarSize() {
    document.documentElement.style.setProperty("--star-hit", (48 / scale) + "px");
    document.documentElement.style.setProperty("--star-svg", (12 / scale) + "px");
  }

  function frameFace() {
    const box = limits();
    if (!box.vw || !box.vh) return;
    scale = box.initial;
    x = box.vw / 2 - FACE_X * imgW * scale;
    y = box.vh / 2 - FACE_Y * imgH * scale;
    clamp();
    syncStarSize();
    apply();
    lastVw = box.vw;
    lastVh = box.vh;
    stage.classList.add("is-ready");
  }

  function holdCenter(prevW, prevH) {
    const box = limits();
    const wx = (prevW / 2 - x) / scale;
    const wy = (prevH / 2 - y) / scale;
    scale = Math.min(box.max, Math.max(box.min, scale));
    x = box.vw / 2 - wx * scale;
    y = box.vh / 2 - wy * scale;
    clamp();
    apply();
    lastVw = box.vw;
    lastVh = box.vh;
  }

  function onResize() {
    const prevW = lastVw;
    const prevH = lastVh;
    fitViewport();
    if (viewport.clientWidth < 2 || viewport.clientHeight < 2) return;
    if (pinnedToFace || !prevW) frameFace();
    else holdCenter(prevW, prevH);
  }

  function zoomAt(clientX, clientY, next) {
    const rect = viewport.getBoundingClientRect();
    const cx = clientX - rect.left;
    const cy = clientY - rect.top;
    const box = limits();
    next = Math.min(box.max, Math.max(box.min, next));
    const wx = (cx - x) / scale;
    const wy = (cy - y) / scale;
    scale = next;
    x = cx - wx * scale;
    y = cy - wy * scale;
    clamp();
    apply();
  }

  function centerOnImage(ix, iy) {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    x = vw / 2 - ix * scale;
    y = vh / 2 - iy * scale;
    pinnedToFace = false;
    clamp();
    apply();
  }

  function stopGlide() {
    if (glide) cancelAnimationFrame(glide);
    glide = 0;
    vx = 0;
    vy = 0;
  }

  function trackVelocity(px, py) {
    const now = performance.now();
    const dt = now - trackT;
    if (dt > 0 && dt < 80) {
      vx = vx * 0.45 + ((px - trackX) / dt) * 0.55;
      vy = vy * 0.45 + ((py - trackY) / dt) * 0.55;
    } else if (dt >= 80) {
      vx = 0;
      vy = 0;
    }
    trackX = px;
    trackY = py;
    trackT = now;
  }

  function startGlide() {
    if (reduceMotion || Math.hypot(vx, vy) < 0.04) return;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(34, now - last);
      last = now;
      if (dt <= 0) {
        glide = requestAnimationFrame(step);
        return;
      }
      const px = x;
      const py = y;
      x += vx * dt;
      y += vy * dt;
      const decay = Math.pow(0.92, dt / 16);
      vx *= decay;
      vy *= decay;
      clamp();
      if (Math.abs(x - px) > 0.2 && Math.sign(x - px) !== Math.sign(vx)) vx = 0;
      if (Math.abs(x - px) < 0.01) vx = 0;
      if (Math.abs(y - py) < 0.01) vy = 0;
      apply();
      if (Math.hypot(vx, vy) < 0.012) {
        glide = 0;
        return;
      }
      glide = requestAnimationFrame(step);
    };
    glide = requestAnimationFrame(step);
  }

  function armClickSuppression() {
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 500);
  }

  function pinchPoints() {
    const pts = [...touches.values()];
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return {
      dist: Math.hypot(dx, dy) || 1,
      x: (pts[0].x + pts[1].x) / 2,
      y: (pts[0].y + pts[1].y) / 2,
    };
  }

  function beginPinch() {
    const m = pinchPoints();
    pinch = { dist: m.dist, x: m.x, y: m.y };
    gestureMoved = true;
    tapStar = null;
    pinnedToFace = false;
  }

  function movePinch() {
    const m = pinchPoints();
    const factor = m.dist / pinch.dist;
    x += m.x - pinch.x;
    y += m.y - pinch.y;
    pinch = { dist: m.dist, x: m.x, y: m.y };
    zoomAt(m.x, m.y, scale * factor);
  }

  function onTouchStart(e) {
    if (dialog.open) return;
    if (e.cancelable) e.preventDefault();
    keyboardNav = false;
    document.documentElement.classList.remove("keyboard");
    lastTouchAt = performance.now();
    stopGlide();
    for (const t of e.changedTouches) {
      touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    if (touches.size === 1) {
      const t = e.changedTouches[0];
      const target = t.target;
      gestureMoved = false;
      tapStar = target && target.closest ? target.closest(".star, .swoosh") : null;
      pinch = null;
      vx = 0;
      vy = 0;
      trackX = t.clientX;
      trackY = t.clientY;
      trackT = performance.now();
      mouse = { x: t.clientX, y: t.clientY, ox: x, oy: y, touch: true };
    } else if (touches.size >= 2) {
      mouse = null;
      beginPinch();
    }
  }

  function onTouchMove(e) {
    if (!touches.size || dialog.open) return;
    if (e.cancelable) e.preventDefault();
    for (const t of e.changedTouches) {
      if (touches.has(t.identifier)) touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    if (touches.size >= 2) {
      if (!pinch) beginPinch();
      movePinch();
      viewport.classList.add("is-panning");
      return;
    }
    if (!mouse || !mouse.touch) return;
    const t = [...touches.values()][0];
    const dx = t.x - mouse.x;
    const dy = t.y - mouse.y;
    if (!gestureMoved && dx * dx + dy * dy > 64) {
      gestureMoved = true;
      tapStar = null;
      pinnedToFace = false;
      viewport.classList.add("is-panning");
    }
    if (!gestureMoved) return;
    x = mouse.ox + dx;
    y = mouse.oy + dy;
    trackVelocity(t.x, t.y);
    clamp();
    apply();
  }

  function onTouchEnd(e, cancelled) {
    for (const t of e.changedTouches) touches.delete(t.identifier);
    if (e.cancelable) e.preventDefault();
    if (touches.size >= 2) {
      beginPinch();
      return;
    }
    if (touches.size === 1) {
      const t = [...touches.values()][0];
      mouse = { x: t.x, y: t.y, ox: x, oy: y, touch: true };
      pinch = null;
      gestureMoved = true;
      tapStar = null;
      vx = 0;
      vy = 0;
      return;
    }
    const moved = gestureMoved;
    const star = tapStar;
    mouse = null;
    pinch = null;
    tapStar = null;
    gestureMoved = false;
    viewport.classList.remove("is-panning");
    armClickSuppression();
    if (!cancelled && !moved && star && !dialog.open) openControl(star);
    else if (moved) startGlide();
  }

  viewport.addEventListener("touchstart", onTouchStart, { passive: false, capture: true });
  viewport.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
  viewport.addEventListener("touchend", (e) => onTouchEnd(e, false), { passive: false, capture: true });
  viewport.addEventListener("touchcancel", (e) => onTouchEnd(e, true), { passive: false, capture: true });
  document.addEventListener("touchmove", (e) => {
    if (dialog.open) return;
    const hit = e.target && e.target.closest ? e.target.closest(".nav-stack, .social-dock") : null;
    if (hit) return;
    if (e.cancelable) e.preventDefault();
  }, { passive: false, capture: true });
  ["gesturestart", "gesturechange", "gestureend"].forEach((type) => {
    viewport.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  });

  viewport.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || dialog.open) return;
    if (performance.now() - lastTouchAt < 700) return;
    keyboardNav = false;
    document.documentElement.classList.remove("keyboard");
    stopGlide();
    const target = e.target;
    mouse = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      ox: x,
      oy: y,
      touch: false,
      moved: false,
      star: target && target.closest ? target.closest(".star, .swoosh") : null,
    };
    vx = 0;
    vy = 0;
    trackX = e.clientX;
    trackY = e.clientY;
    trackT = performance.now();
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener("pointermove", (e) => {
    if (!mouse || mouse.touch || e.pointerId !== mouse.id) return;
    const dx = e.clientX - mouse.x;
    const dy = e.clientY - mouse.y;
    if (!mouse.moved && dx * dx + dy * dy > 16) {
      mouse.moved = true;
      pinnedToFace = false;
      viewport.classList.add("is-panning");
    }
    if (!mouse.moved) return;
    e.preventDefault();
    x = mouse.ox + dx;
    y = mouse.oy + dy;
    trackVelocity(e.clientX, e.clientY);
    clamp();
    apply();
  });
  function endMouse(e) {
    if (!mouse || mouse.touch || e.pointerId !== mouse.id) return;
    const moved = mouse.moved;
    const star = mouse.star;
    mouse = null;
    viewport.classList.remove("is-panning");
    armClickSuppression();
    if (!moved && star) openControl(star);
    else if (moved) startGlide();
  }
  viewport.addEventListener("pointerup", endMouse);
  viewport.addEventListener("pointercancel", endMouse);
  viewport.addEventListener("wheel", (e) => {
    if (dialog.open) return;
    e.preventDefault();
    stopGlide();
    pinnedToFace = false;
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.deltaMode === 1) { dx *= 16; dy *= 16; }
    else if (e.deltaMode === 2) {
      dx *= viewport.clientWidth;
      dy *= viewport.clientHeight;
    }
    if (e.ctrlKey) zoomAt(e.clientX, e.clientY, scale * Math.exp(-dy * 0.002));
    else {
      x -= dx;
      y -= dy;
      clamp();
      apply();
    }
  }, { passive: false });
  viewport.addEventListener("dragstart", (e) => e.preventDefault());

  viewport.addEventListener("click", (e) => {
    const btn = e.target.closest(".star, .swoosh");
    if (!btn) return;
    if (suppressClick) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    openControl(btn);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      keyboardNav = true;
      document.documentElement.classList.add("keyboard");
    }
    if (dialog.open) return;
    let dx = 0;
    let dy = 0;
    const step = e.shiftKey ? 140 : 72;
    if (e.key === "ArrowLeft") dx = step;
    else if (e.key === "ArrowRight") dx = -step;
    else if (e.key === "ArrowUp") dy = step;
    else if (e.key === "ArrowDown") dy = -step;
    else return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    stopGlide();
    pinnedToFace = false;
    x += dx;
    y += dy;
    clamp();
    apply();
  });

  function chicagoToday() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type).value;
    return get("year") + "-" + get("month") + "-" + get("day");
  }

  function spokenDate(iso) {
    const parts = iso.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])));
  }

  function usable(rows) {
    const day = chicagoToday();
    return rows
      .filter((e) => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.date <= day)
      .map((e) => ({
        date: e.date,
        text: String(e.text || e.quote || "").trim(),
        author: String(e.author || "").trim().replace(/^\s*[-–—]\s*/, ""),
        url: typeof e.url === "string" && /^https:\/\//.test(e.url.trim()) ? e.url.trim() : "",
      }))
      .filter((e) => e.text && e.author)
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  function quoteKey(q) {
    return q.date + "\0" + q.text;
  }

  function hashUnit(n) {
    let x = Math.imul((n + 1) | 0, 374761393);
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  function darkBoxPx() {
    return DARK_BOX.map(([u, v]) => ({ x: u * imgW, y: v * imgH }));
  }

  function pointInPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x;
      const yi = poly[i].y;
      const xj = poly[j].x;
      const yj = poly[j].y;
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  function edgeDistance(x, y, poly) {
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const vx = b.x - a.x;
      const vy = b.y - a.y;
      const l2 = vx * vx + vy * vy || 1;
      let t = ((x - a.x) * vx + (y - a.y) * vy) / l2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + t * vx;
      const py = a.y + t * vy;
      const d = Math.hypot(x - px, y - py);
      if (d < best) best = d;
    }
    return best;
  }

  function inPortrait(x, y) {
    const dx = (x / imgW - PORTRAIT.cx) / PORTRAIT.rx;
    const dy = (y / imgH - PORTRAIT.cy) / PORTRAIT.ry;
    return dx * dx + dy * dy <= 1;
  }

  function ensureSkyLum() {
    if (skyLum && skyLum.w === imgW && skyLum.h === imgH) return true;
    if (!mural.complete || !mural.naturalWidth) return false;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = imgW;
      canvas.height = imgH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(mural, 0, 0, imgW, imgH);
      const data = ctx.getImageData(0, 0, imgW, imgH).data;
      const lum = new Uint8Array(imgW * imgH);
      for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
        lum[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2] + 0.5) | 0;
      }
      skyLum = { lum, w: imgW, h: imgH };
    } catch {
      skyLum = { lum: null, w: imgW, h: imgH };
    }
    darkSlots = null;
    return true;
  }

  function neighborhoodDark(px, py) {
    if (!skyLum || !skyLum.lum) return true;
    const { lum, w, h } = skyLum;
    const cx = Math.round(px);
    const cy = Math.round(py);
    if (cx < 1 || cy < 1 || cx >= w - 1 || cy >= h - 1) return false;
    // Keep the glyph off light paint (the word Never, hair highlights).
    // The star is about 12 screen pixels; 18 image pixels covers it at
    // the usual framing.
    const clear = 18;
    const clear2 = clear * clear;
    const y0 = Math.max(0, cy - clear);
    const y1 = Math.min(h - 1, cy + clear);
    const x0 = Math.max(0, cx - clear);
    const x1 = Math.min(w - 1, cx + clear);
    for (let y = y0; y <= y1; y++) {
      const dy = y - cy;
      const row = y * w;
      for (let x = x0; x <= x1; x++) {
        if (dy * dy + (x - cx) * (x - cx) > clear2) continue;
        if (lum[row + x] > 130) return false;
      }
    }
    const rad = 16;
    let sum = 0;
    let n = 0;
    let hot = 0;
    for (let y = Math.max(0, cy - rad); y <= Math.min(h - 1, cy + rad); y += 2) {
      const row = y * w;
      for (let x = Math.max(0, cx - rad); x <= Math.min(w - 1, cx + rad); x += 2) {
        const v = lum[row + x];
        sum += v;
        n++;
        if (v > 78) hot++;
      }
    }
    if (!n) return false;
    return sum / n <= DARK_LUMINANCE && hot / n < 0.2;
  }

  function acceptDark(x, y, poly) {
    if (x < 0 || y < 0 || x >= imgW || y >= imgH) return false;
    if (!pointInPoly(x, y, poly)) return false;
    if (edgeDistance(x, y, poly) < BOX_INSET_PX) return false;
    if (inPortrait(x, y)) return false;
    if (!neighborhoodDark(x, y)) return false;
    return true;
  }

  function ensureDarkSlots() {
    if (darkSlots) return darkSlots;
    const poly = darkBoxPx();
    const slots = [];
    const step = 24;
    let n = 0;
    for (let y = step; y < imgH - step; y += step) {
      for (let x = step; x < imgW - step; x += step) {
        const px = x + (hashUnit(n) - 0.5) * 20;
        const py = y + (hashUnit(n + 9176) - 0.5) * 20;
        n++;
        if (acceptDark(px, py, poly)) slots.push({ x: px, y: py });
      }
    }
    darkSlots = slots;
    return slots;
  }

  function farEnough(x, y, placed, gap) {
    const g2 = gap * gap;
    for (let i = 0; i < placed.length; i++) {
      const dx = placed[i].x - x;
      const dy = placed[i].y - y;
      if (dx * dx + dy * dy < g2) return false;
    }
    return true;
  }

  function percentSpot(x, y) {
    return { l: (x / imgW) * 100, t: (y / imgH) * 100 };
  }

  // Whole-photo scatter. Same low-discrepancy sequence the stars used
  // before they were confined to the dark box, with the gap still applied
  // so a crowded field does not stack two quotes on one point.
  function fullFrameSpot(i, placed) {
    const g = 1.324717957244746;
    const edge = 0.04;
    for (let k = 0; k < 48; k++) {
      const n = i + k * 97;
      const u = (0.5 + (1 / g) * n) % 1;
      const v = (0.5 + (1 / (g * g)) * n) % 1;
      const x = (edge + u * (1 - edge * 2)) * imgW;
      const y = (edge + v * (1 - edge * 2)) * imgH;
      if (farEnough(x, y, placed, k < 24 ? STAR_GAP_PX : STAR_GAP_PX * 0.55)) {
        return { x, y };
      }
    }
    const u = (0.5 + (1 / g) * i) % 1;
    const v = (0.5 + (1 / (g * g)) * i) % 1;
    return {
      x: (edge + u * (1 - edge * 2)) * imgW,
      y: (edge + v * (1 - edge * 2)) * imgH,
    };
  }

  function huntDark(slots, placed, gap) {
    let best = null;
    let bestScore = -1;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!farEnough(s.x, s.y, placed, gap)) continue;
      let nearest = 1e9;
      for (let p = 0; p < placed.length; p++) {
        nearest = Math.min(nearest, Math.hypot(placed[p].x - s.x, placed[p].y - s.y));
      }
      const score = nearest + (hashUnit(i + 400) - 0.5) * 36;
      if (score > bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best;
  }

  function spotsFor(list) {
    if (!ensureSkyLum()) return null;
    const slots = ensureDarkSlots();
    const ordered = [...list].sort((a, b) => (quoteKey(a) < quoteKey(b) ? -1 : 1));
    const placed = [];
    const map = new Map();
    const useFull = STAR_REGION === "full" || slots.length === 0;
    ordered.forEach((q, i) => {
      let spot = null;
      const spill = useFull || i >= DARK_FIELD_CAPACITY;
      if (!spill) {
        spot = huntDark(slots, placed, STAR_GAP_PX);
        if (!spot) spot = huntDark(slots, placed, STAR_GAP_PX * 0.62);
      }
      if (!spot) spot = fullFrameSpot(i, placed);
      placed.push(spot);
      map.set(quoteKey(q), percentSpot(spot.x, spot.y));
    });
    return list.map((q) => map.get(quoteKey(q)));
  }

  let lastOpen = 0;
  function openQuote(q, btn) {
    const now = performance.now();
    if (dialog.open && now - lastOpen < 450) return;
    lastOpen = now;
    blockDismissUntil = now + 550;
    stopGlide();
    dialog.classList.remove("is-swoosh");
    qDate.dateTime = q.date;
    qDate.textContent = q.date.replaceAll("-", ".");
    const prior = inner.querySelector("a.ext");
    if (prior) {
      while (prior.firstChild) inner.insertBefore(prior.firstChild, prior);
      prior.remove();
    }
    qText.textContent = q.text;
    qBy.textContent = q.author;
    if (q.url) {
      const link = document.createElement("a");
      link.className = "ext";
      link.href = q.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      qText.before(link);
      link.append(qText, qBy);
    }
    opener = btn;
    markRead(q, btn);
    if (!dialog.open) dialog.showModal();
  }

  function openFrom(btn) {
    const q = quoteOf.get(btn);
    if (q) openQuote(q, btn);
  }

  function openSwoosh() {
    const now = performance.now();
    if (dialog.open && now - lastOpen < 450) return;
    lastOpen = now;
    blockDismissUntil = now + 550;
    stopGlide();
    dialog.classList.add("is-swoosh");
    const prior = inner.querySelector("a.ext");
    if (prior) {
      while (prior.firstChild) inner.insertBefore(prior.firstChild, prior);
      prior.remove();
    }
    qDate.removeAttribute("datetime");
    qDate.textContent = "";
    qText.textContent = SWOOSH_TEXT;
    qBy.textContent = "";
    opener = swooshBtn;
    if (!dialog.open) dialog.showModal();
  }

  function openControl(btn) {
    if (!btn) return;
    if (btn.classList.contains("swoosh")) openSwoosh();
    else openFrom(btn);
  }

  const swooshBtn = document.createElement("button");
  swooshBtn.type = "button";
  swooshBtn.className = "swoosh";
  swooshBtn.setAttribute("aria-label", "nike swoosh");
  swooshBtn.style.left = (SWOOSH_X * 100) + "%";
  swooshBtn.style.top = (SWOOSH_Y * 100) + "%";
  const swooshImg = document.createElement("img");
  swooshImg.src = "/quotes/swoosh.png";
  swooshImg.alt = "";
  swooshImg.draggable = false;
  swooshBtn.append(swooshImg);
  swooshBtn.addEventListener("focus", () => {
    if (!keyboardNav || suppressStarFocus) return;
    centerOnImage(SWOOSH_X * imgW, SWOOSH_Y * imgH);
  });
  stage.append(swooshBtn);

  function paint(list) {
    const spots = spotsFor(list);
    if (!spots) return;
    const frag = document.createDocumentFragment();
    const day = chicagoToday();
    let nextToday = null;
    list.forEach((q, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "star";
      const key = quoteKey(q);
      const read = readKeys.has(key);
      const today = q.date === day && !read;
      if (read) btn.classList.add("is-read");
      else if (today) btn.classList.add("is-today");
      btn.style.left = spots[i].l + "%";
      btn.style.top = spots[i].t + "%";
      btn.style.setProperty("--d", ((i % 7) * 0.13).toFixed(2) + "s");
      btn.setAttribute("aria-haspopup", "dialog");
      btn.setAttribute("aria-label", (today ? "today's quote, " : "quote for ") + spokenDate(q.date));
      btn.innerHTML = STAR;
      setGlyphFill(btn);
      quoteOf.set(btn, q);
      if (today && !nextToday) nextToday = btn;
      btn.addEventListener("focus", () => {
        if (!keyboardNav || suppressStarFocus) return;
        centerOnImage((spots[i].l / 100) * imgW, (spots[i].t / 100) * imgH);
      });
      frag.appendChild(btn);
    });
    sky.replaceChildren(frag);
    todayBtn = nextToday;
    if (!todayBtn) guide.hidden = true;
    else updateGuide();
  }

  function applyList(rows) {
    const list = usable(rows);
    const sig = list.map((q) => q.date + "\0" + q.text + "\0" + q.author + "\0" + q.url).join("\n");
    if (sig === signature) return;
    signature = sig;
    current = list;
    paint(list);
  }

  function load() {
    fetch(QUOTES, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((rows) => {
        if (Array.isArray(rows)) applyList(rows);
      })
      .catch(() => {});
  }

  function msUntilChicagoMidnight() {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Chicago",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => Number(parts.find((p) => p.type === type).value);
    let hour = get("hour");
    if (hour === 24) hour = 0;
    const elapsed = ((hour * 60 + get("minute")) * 60 + get("second")) * 1000;
    return (24 * 60 * 60 * 1000) - elapsed + 1500;
  }

  function scheduleMidnight() {
    clearTimeout(midnightTimer);
    midnightTimer = setTimeout(() => {
      load();
      scheduleMidnight();
    }, Math.max(5000, msUntilChicagoMidnight()));
  }

  dialog.addEventListener("click", (e) => {
    if (performance.now() < blockDismissUntil) return;
    if (!inner.contains(e.target)) {
      suppressStarFocus = true;
      dialog.close();
      releaseStarFocus();
    }
  });
  dialog.addEventListener("close", () => {
    releaseStarFocus();
  });
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    suppressStarFocus = true;
    dialog.close();
    releaseStarFocus();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") load();
  });
  window.addEventListener("pageshow", load);
  window.addEventListener("resize", onResize);
  if (window.visualViewport) {
    visualViewport.addEventListener("resize", onResize);
    visualViewport.addEventListener("scroll", onResize);
  }
  mural.addEventListener("load", () => {
    const w = mural.naturalWidth;
    const h = mural.naturalHeight;
    if (!w || !h || (w === imgW && h === imgH)) return;
    readImageSize();
    if (pinnedToFace) frameFace();
    else onResize();
    if (current.length) paint(current);
  });

  loadRead();
  readImageSize();
  onResize();
  load();
  scheduleMidnight();
})();
