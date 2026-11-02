/* landing is always today's quote. a drag tracks the finger, then release settles.
   the right arrow brings the next older quote in from the right. */
(() => {
  const stage = document.getElementById('quote-card');
  const prev = document.querySelector('.arrow.prev');
  const next = document.querySelector('.arrow.next');
  if (!stage || !prev || !next) return;

  const chicago = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const dots = (day) => day.replace(/-/g, '.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let list = [];
  let index = 0;
  let busy = false;
  let current = null;

  function slide(entry) {
    const ol = document.createElement('ol');
    ol.className = 'quotes slide';
    const li = document.createElement('li');
    const date = document.createElement('p');
    date.className = 'd';
    const time = document.createElement('time');
    time.dateTime = entry.date;
    time.textContent = dots(entry.date);
    date.append(time);
    const words = document.createElement('blockquote');
    words.className = 'q';
    words.textContent = entry.text;
    const by = document.createElement('p');
    by.className = 'by';
    by.textContent = entry.author;
    li.append(date, words, by);
    ol.append(li);
    return ol;
  }

  function lock() {
    const probe = document.createElement('div');
    probe.className = 'probe';
    probe.setAttribute('aria-hidden', 'true');
    stage.append(probe);
    let max = 0;
    list.forEach((entry) => {
      const sample = slide(entry);
      sample.classList.add('measure');
      probe.append(sample);
      const box = sample.querySelector('li').getBoundingClientRect().height;
      if (box > max) max = box;
      sample.remove();
    });
    probe.remove();
    if (max) stage.style.height = Math.ceil(max) + 'px';
  }

  function paint(entry) {
    stage.replaceChildren();
    current = slide(entry);
    stage.append(current);
    current.classList.add('layer');
  }

  function arrows() {
    prev.hidden = index === 0;
    next.hidden = index >= list.length - 1;
  }

  function placeArrows() {
    const box = stage.closest('.soft');
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const top = (rect.top + rect.height / 2) + 'px';
    prev.style.top = top;
    next.style.top = top;
  }

  const span = () => stage.clientWidth || 1;
  let drag = null;
  let suppressClick = false;
  let settleTimer = 0;

  function shift(el, x, animate) {
    if (!el) return;
    if (!animate || reduce) el.classList.remove('settle');
    else el.classList.add('settle');
    el.style.transform = 'translate3d(' + x + 'px,0,0)';
  }

  function rest(el) {
    if (!el) return;
    el.classList.remove('settle');
    el.style.transform = '';
  }

  function makeNeighbor(dir) {
    const i = index + dir;
    if (i < 0 || i >= list.length) return null;
    const el = slide(list[i]);
    el.classList.add('layer');
    el.setAttribute('aria-hidden', 'true');
    stage.append(el);
    return el;
  }

  function dropNeighbor() {
    if (!drag || !drag.neighbor) return;
    drag.neighbor.remove();
    drag.neighbor = null;
    drag.dir = 0;
  }

  function follow(dx) {
    const w = span();
    const wantOlder = dx < 0;
    const blocked = (wantOlder && index >= list.length - 1) || (!wantOlder && dx > 0 && index === 0);
    let x = dx;
    if (blocked || dx === 0) {
      const sign = dx < 0 ? -1 : 1;
      x = dx === 0 ? 0 : sign * Math.min(w * 0.22, Math.abs(dx) * 0.32);
      dropNeighbor();
    } else {
      if (x < -w) x = -w;
      if (x > w) x = w;
      const dir = x < 0 ? 1 : -1;
      if (drag.dir !== dir) {
        dropNeighbor();
        drag.neighbor = makeNeighbor(dir);
        drag.dir = drag.neighbor ? dir : 0;
        if (drag.neighbor) shift(drag.neighbor, x + (dir === 1 ? w : -w), false);
      }
    }
    drag.x = x;
    shift(current, x, false);
    if (drag.neighbor) shift(drag.neighbor, x + (drag.dir === 1 ? w : -w), false);
  }

  function commitDir(dx, vx) {
    const w = span();
    const flick = Math.abs(vx) > 0.5 && Math.abs(dx) > 18;
    let dir = 0;
    if (flick) dir = vx < 0 ? 1 : -1;
    else if (Math.abs(dx) > w * 0.5) dir = dx < 0 ? 1 : -1;
    if (dir === 1 && index >= list.length - 1) return 0;
    if (dir === -1 && index === 0) return 0;
    return dir;
  }

  function finish(commit) {
    const from = drag;
    drag = null;
    const w = span();
    let neighbor = from && from.neighbor;
    let dir = from && from.dir;
    if (commit && dir !== commit) {
      if (neighbor) neighbor.remove();
      neighbor = makeNeighbor(commit);
      dir = neighbor ? commit : 0;
      if (neighbor) shift(neighbor, commit === 1 ? w : -w, false);
    }
    if (!commit) {
      if (current) current.getBoundingClientRect();
      shift(current, 0, true);
      if (neighbor) shift(neighbor, dir === 1 ? w : -w, true);
    } else if (neighbor) {
      neighbor.getBoundingClientRect();
      shift(current, commit === 1 ? -w : w, true);
      shift(neighbor, 0, true);
    }
    busy = true;
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      clearTimeout(settleTimer);
      if (commit && neighbor) {
        if (current) current.remove();
        rest(neighbor);
        neighbor.removeAttribute('aria-hidden');
        current = neighbor;
        index += commit;
      } else {
        if (neighbor) neighbor.remove();
        rest(current);
      }
      busy = false;
      arrows();
    };
    const watch = commit && neighbor ? neighbor : current;
    const onEnd = (event) => {
      if (event.propertyName !== 'transform' || event.target !== watch) return;
      watch.removeEventListener('transitionend', onEnd);
      close();
    };
    if (watch && !reduce) watch.addEventListener('transitionend', onEnd);
    settleTimer = setTimeout(close, reduce ? 0 : 520);
  }

  function show(nextIndex) {
    if (busy || drag || !current || nextIndex < 0 || nextIndex >= list.length || nextIndex === index) return;
    const dir = nextIndex > index ? 1 : -1;
    if (reduce) {
      index = nextIndex;
      paint(list[index]);
      arrows();
      return;
    }
    const incoming = makeNeighbor(dir);
    if (!incoming) return;
    const w = span();
    shift(incoming, dir === 1 ? w : -w, false);
    incoming.getBoundingClientRect();
    drag = { neighbor: incoming, dir: dir, x: 0 };
    finish(dir);
  }

  prev.addEventListener('click', () => show(index - 1));
  next.addEventListener('click', () => show(index + 1));
  addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(index + 1);
    if (event.key === 'ArrowLeft') show(index - 1);
  });

  const onPill = (event) => {
    const el = event.target;
    return !!(el && el.closest && el.closest('.nav-stack, .social-dock, .arrow'));
  };
  addEventListener('pointerdown', (event) => {
    suppressClick = false;
    if (event.button != null && event.button !== 0) return;
    if (busy || drag || !current || onPill(event)) return;
    drag = {
      id: event.pointerId,
      x0: event.clientX,
      y0: event.clientY,
      lastX: event.clientX,
      t: event.timeStamp,
      dx: 0,
      vx: 0,
      moved: false,
      neighbor: null,
      dir: 0,
      x: 0
    };
  });
  addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.id || busy) return;
    const dx = event.clientX - drag.x0;
    const dy = event.clientY - drag.y0;
    if (!drag.moved) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      drag.moved = true;
      if (event.target.setPointerCapture) {
        try { event.target.setPointerCapture(event.pointerId); } catch (e) {}
      }
    }
    const dt = event.timeStamp - drag.t;
    if (dt > 0) drag.vx = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.t = event.timeStamp;
    drag.dx = dx;
    follow(dx);
  });
  const endDrag = (event, cancel) => {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const state = drag;
    if (!state.moved) { drag = null; return; }
    suppressClick = true;
    if (event && event.timeStamp - state.t > 80) state.vx = 0;
    const dir = cancel ? 0 : commitDir(state.dx, state.vx);
    finish(dir);
  };
  addEventListener('pointerup', (event) => endDrag(event, false));
  addEventListener('pointercancel', (event) => endDrag(event, true));
  addEventListener('click', (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  }, true);

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (list.length) lock();
      placeArrows();
    }, 120);
  });
  if (window.ResizeObserver) {
    const box = stage.closest('.soft');
    if (box) new ResizeObserver(() => placeArrows()).observe(box);
  }

  fetch('/quote-of-the-day/quotes.json', { cache: 'no-cache' }).then((res) => res.json()).then((rows) => {
    if (!Array.isArray(rows)) return;
    const day = chicago();
    list = rows.filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.date <= day && (entry.text || entry.quote) && entry.author)
      .map((entry) => ({
        date: entry.date,
        text: String(entry.text || entry.quote).trim(),
        author: String(entry.author).replace(/^\s*[-–—]\s*/, '').trim()
      }))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    if (!list.length) return;
    index = 0;
    lock();
    paint(list[0]);
    arrows();
    placeArrows();
  }).catch(() => {});
})();
