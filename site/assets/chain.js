/* Types the homepage lines on every load, about two and a half seconds in all.
   The sleeps add up to 2.3s; painting each letter makes the run about 2.6s.
   Each character is already its final color. While the lines type, the
   caret is the habits bar: teal, then gold from destiny through the last
   line. Parked after that line, it matches a grid today square in size
   and in the today-cursor pulse. Reduced motion shows the finished lines
   and parks that gold caret. */
(() => {
  const root = document.querySelector('ol.chain');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines = [...root.querySelectorAll('li')];

  function colorFor(el) {
    if (el.classList.contains('destiny') || el.classList.contains('gold')) return '#FFD700';
    if (el.classList.contains('noun') || el.classList.contains('carry')) return '#1AADB3';
    return '#fff';
  }

  const rows = lines.map((li) => {
    const chars = [];
    li.querySelectorAll('.pre, .noun, .post, .carry, .gold').forEach((el) => {
      const color = colorFor(el);
      const pieces = [...el.textContent].map((ch) => {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = ch;
        span.style.color = color;
        return span;
      });
      el.replaceChildren(...pieces);
      chars.push(...pieces);
    });
    return { li, chars };
  });

  const caret = document.createElement('span');
  caret.className = 'chain-caret';
  caret.setAttribute('aria-hidden', 'true');

  function gridCursor() {
    const cell = document.querySelector('.cell.today') || document.querySelector('.cell');
    if (!cell) return null;
    const rect = cell.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return rect;
  }

  function park(ch, edge) {
    const li = ch.closest('li');
    const parent = ch.parentElement;
    if (parent && (parent.classList.contains('destiny') || parent.classList.contains('gold'))) caret.classList.add('is-gold');
    if (caret.parentNode !== li) li.append(caret);
    const base = li.getBoundingClientRect();
    const box = ch.getBoundingClientRect();
    const cell = caret.classList.contains('is-parked') ? gridCursor() : null;
    if (cell) {
      const gap = 0.08 * parseFloat(getComputedStyle(li).fontSize);
      caret.style.width = cell.width + 'px';
      caret.style.height = cell.height + 'px';
      caret.style.left = (box.right - base.left + gap) + 'px';
      caret.style.top = (box.top - base.top + (box.height - cell.height) / 2) + 'px';
      return;
    }
    caret.style.removeProperty('width');
    caret.style.removeProperty('height');
    const shift = 0.2 * parseFloat(getComputedStyle(li).fontSize);
    caret.style.left = ((edge === 'after' ? box.right : box.left) - base.left) + 'px';
    caret.style.top = (box.top - base.top + shift) + 'px';
  }

  function syncBlink() {
    const cell = document.querySelector('.cell.today');
    if (!cell) return;
    const theirs = [...cell.getAnimations()].find((anim) => anim.animationName === 'today-cursor');
    const mine = [...caret.getAnimations()].find((anim) => anim.animationName === 'today-cursor');
    if (theirs && mine && theirs.currentTime != null) mine.currentTime = theirs.currentTime;
  }

  function settle() {
    const tail = rows[rows.length - 1].chars.at(-1);
    caret.classList.add('is-gold', 'is-parked');
    const place = () => {
      park(tail, 'after');
      syncBlink();
    };
    place();
    if (!document.documentElement.classList.contains('year-done')) {
      addEventListener('year-done', place, { once: true });
    }
    const grids = document.querySelector('#grids');
    if (grids && 'ResizeObserver' in window) new ResizeObserver(place).observe(grids);
  }

  if (reduce) {
    rows.forEach((row) => row.chars.forEach((ch) => ch.classList.add('is-on')));
    settle();
    root.dataset.done = 'reduce';
    return;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const charCount = rows.reduce((sum, row) => sum + row.chars.length, 0);
  const spaces = rows.reduce((sum, row) => sum + row.chars.filter((ch) => ch.textContent === ' ').length, 0);
  const span = 2300;
  const linePause = 75 * span / 5000;
  const beatTotal = (rows.length - 1) * linePause;
  const base = (span - beatTotal) / (charCount + spaces * 0.35);
  const jitter = Math.max(1, Math.round(base * 0.3));

  function waitFor(prev) {
    let ms = base;
    if (prev === ' ') ms += base * 0.35;
    ms += (Math.random() * 2 - 1) * jitter;
    return Math.max(4, Math.round(ms));
  }

  async function play() {
    root.dataset.t0 = String(performance.now());
    for (let i = 0; i < rows.length; i++) {
      const { chars } = rows[i];
      let prev = '';
      for (const ch of chars) {
        park(ch, 'on');
        await sleep(waitFor(prev));
        ch.classList.add('is-on');
        prev = ch.textContent;
      }
      park(chars[chars.length - 1], 'after');
      if (i < rows.length - 1) await sleep((60 + Math.random() * 30) * span / 5000);
    }
    root.dataset.done = String(performance.now());
    settle();
  }

  play();
})();
