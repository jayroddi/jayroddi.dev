/* Types the homepage lines on every load, about five seconds in all.
   Each character is already its final color. The caret is the habits
   grid caret: teal, then gold from destiny through the last line.
   Reduced motion shows the finished lines and parks that gold caret. */
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

  function park(ch, edge) {
    const li = ch.closest('li');
    const parent = ch.parentElement;
    if (parent && (parent.classList.contains('destiny') || parent.classList.contains('gold'))) caret.classList.add('is-gold');
    if (caret.parentNode !== li) li.append(caret);
    const base = li.getBoundingClientRect();
    const box = ch.getBoundingClientRect();
    const shift = 0.2 * parseFloat(getComputedStyle(li).fontSize);
    caret.style.left = ((edge === 'after' ? box.right : box.left) - base.left) + 'px';
    caret.style.top = (box.top - base.top + shift) + 'px';
  }

  if (reduce) {
    rows.forEach((row) => row.chars.forEach((ch) => ch.classList.add('is-on')));
    const tail = rows[rows.length - 1].chars.at(-1);
    caret.classList.add('is-gold');
    park(tail, 'after');
    root.dataset.done = 'reduce';
    return;
  }

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const charCount = rows.reduce((sum, row) => sum + row.chars.length, 0);
  const spaces = rows.reduce((sum, row) => sum + row.chars.filter((ch) => ch.textContent === ' ').length, 0);
  const beatTotal = (rows.length - 1) * 75;
  const base = (5000 - beatTotal) / (charCount + spaces * 0.35);
  const jitter = Math.max(3, Math.round(base * 0.3));

  function waitFor(prev) {
    let ms = base;
    if (prev === ' ') ms += base * 0.35;
    ms += (Math.random() * 2 - 1) * jitter;
    return Math.max(8, Math.round(ms));
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
      if (i < rows.length - 1) await sleep(60 + Math.random() * 30);
    }
    root.dataset.done = String(performance.now());
  }

  play();
})();
