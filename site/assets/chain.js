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

  function place(li, el, edge) {
    const base = li.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const x = edge === 'start' ? box.left : box.right;
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
    caret.classList.add('is-still');
    place(last.li, tail, 'end');
    return;
  }

  function waitFor(prev) {
    let base = 90;
    if (prev === ',') base = 210;
    else if (prev === ' ' || prev === '\u00a0') base = 135;
    const jitter = Math.round(Math.random() * 76 - 38);
    return Math.max(48, base + jitter);
  }

  async function play() {
    for (let i = 0; i < rows.length; i++) {
      const { li, chars } = rows[i];
      place(li, chars[0], 'start');
      typing(true);
      let prev = '';
      for (const ch of chars) {
        await sleep(waitFor(prev));
        ch.style.opacity = '1';
        place(li, ch, 'end');
        prev = ch.textContent;
      }
      typing(false);
      if (i < rows.length - 1) await sleep(400 + Math.random() * 200);
    }
  }

  play();
})();
