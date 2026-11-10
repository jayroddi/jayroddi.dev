/* Types the six lines on every load. The full line is already in the layout,
   each character starts invisible in its final color, and a teal caret
   blinks only while it is waiting. prefers-reduced-motion shows the end. */
(() => {
  const root = document.querySelector('ol.chain');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lines = [...root.querySelectorAll('li')];
  const caret = document.createElement('span');
  caret.className = 'chain-caret';
  caret.setAttribute('aria-hidden', 'true');
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function colorFor(el) {
    if (el.classList.contains('destiny')) return '#FFD700';
    if (el.classList.contains('noun') || el.classList.contains('carry')) return '#1AADB3';
    return '#f4efe6';
  }

  const rows = lines.map((li) => {
    const chars = [];
    li.querySelectorAll('.pre, .noun, .post, .carry').forEach((el) => {
      const color = colorFor(el);
      const pieces = [...el.textContent].map((ch) => {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = ch;
        span.style.color = color;
        if (!reduce) span.style.opacity = '0';
        return span;
      });
      el.replaceChildren(...pieces);
      chars.push(...pieces);
    });
    return { li, chars };
  });

  let blockW = 0;
  function place(li, el, edge) {
    const base = li.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    if (!blockW && /[a-z]/i.test(el.textContent)) blockW = box.width;
    const width = blockW || box.width;
    const x = edge === 'after' ? box.right : box.left;
    caret.style.width = width + 'px';
    caret.style.height = box.height + 'px';
    caret.style.left = (x - base.left) + 'px';
    caret.style.top = (box.top - base.top) + 'px';
    if (caret.parentNode !== li) li.append(caret);
  }

  function typing(on) {
    caret.classList.toggle('is-typing', on);
  }

  const last = rows[rows.length - 1];
  const tail = last.chars[last.chars.length - 1];
  if (reduce) {
    caret.classList.add('is-still', 'is-gold');
    place(last.li, tail, 'after');
    return;
  }

  const charCount = rows.reduce((sum, row) => sum + row.chars.length, 0);
  const spaces = rows.reduce((sum, row) => sum + row.chars.filter((ch) => ch.textContent === ' ' || ch.textContent === '\u00a0').length, 0);
  const beatTotal = (rows.length - 1) * 150;
  const base = (10000 - beatTotal) / (charCount + spaces * 0.35);
  const jitter = Math.max(3, Math.round(base * 0.3));

  function waitFor(prev) {
    let ms = base;
    if (prev === ',') ms += base * 0.6;
    else if (prev === ' ' || prev === '\u00a0') ms += base * 0.35;
    ms += (Math.random() * 2 - 1) * jitter;
    return Math.max(8, Math.round(ms));
  }

  async function play() {
    root.dataset.t0 = String(performance.now());
    for (let i = 0; i < rows.length; i++) {
      const { li, chars } = rows[i];
      typing(true);
      let prev = '';
      for (const ch of chars) {
        if (ch.parentElement.classList.contains('destiny')) caret.classList.add('is-gold');
        place(li, ch, 'on');
        await sleep(waitFor(prev));
        ch.style.opacity = '1';
        prev = ch.textContent;
      }
      place(li, chars[chars.length - 1], 'after');
      typing(false);
      if (i < rows.length - 1) await sleep(120 + Math.random() * 60);
    }
    root.dataset.done = String(performance.now());
  }

  play();
})();
