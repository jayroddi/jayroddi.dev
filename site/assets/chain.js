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

  const measure = document.createElement('canvas').getContext('2d');
  function place(li, el, edge) {
    const base = li.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const cs = getComputedStyle(li);
    const fontSize = parseFloat(cs.fontSize);
    measure.font = cs.font;
    const glyph = measure.measureText('n');
    const xHeight = measure.measureText('x').actualBoundingBoxAscent || fontSize * 0.53;
    const descent = glyph.actualBoundingBoxDescent || fontSize * 0.15;
    const lineHeight = parseFloat(cs.lineHeight) || fontSize * 1.55;
    const halfLead = Math.max(0, (lineHeight - fontSize) / 2);
    const baseline = box.bottom - descent - halfLead;
    const height = xHeight;
    const x = edge === 'after' ? box.right : box.left;
    caret.style.width = (glyph.width || fontSize * 0.52) + 'px';
    caret.style.height = height + 'px';
    caret.style.left = (x - base.left) + 'px';
    caret.style.top = (baseline - height - base.top) + 'px';
    if (caret.parentNode !== li) li.append(caret);
  }

  function typing(on) {
    caret.classList.toggle('is-typing', on);
  }

  const last = rows[rows.length - 1];
  const tail = last.chars[last.chars.length - 1];
  const heart = document.querySelector('.heart');
  function splitHeart() {
    if (!heart || heart.dataset.ready) return;
    const seg = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    const parts = [...seg.segment(heart.textContent)].map((item) => item.segment);
    heart.replaceChildren(...parts.map((text) => {
      const span = document.createElement('span');
      span.className = 'em';
      span.textContent = text;
      return span;
    }));
    heart.dataset.ready = '1';
  }
  function popHeart() {
    if (!heart) return;
    const marks = [...heart.querySelectorAll('.em')];
    marks.forEach((em, i) => {
      em.animate([
        { opacity: 0, transform: 'translate3d(0, 8px, 0) scale(0.4)', filter: 'drop-shadow(0 0 0 rgba(26, 173, 179, 0))' },
        { opacity: 1, transform: 'translate3d(0, -3px, 0) scale(1.14)', filter: 'drop-shadow(0 0 8px rgba(26, 173, 179, .9))', offset: 0.62 },
        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)', filter: 'drop-shadow(0 0 0 rgba(26, 173, 179, 0))' }
      ], { duration: 500, delay: i * 80, easing: 'cubic-bezier(.22, .85, .3, 1)', fill: 'forwards' });
    });
  }
  splitHeart();

  if (reduce) {
    caret.classList.add('is-still', 'is-gold');
    place(last.li, tail, 'after');
    return;
  }

  const charCount = rows.reduce((sum, row) => sum + row.chars.length, 0);
  const spaces = rows.reduce((sum, row) => sum + row.chars.filter((ch) => ch.textContent === ' ' || ch.textContent === '\u00a0').length, 0);
  const beatTotal = (rows.length - 1) * 75;
  const base = (5000 - beatTotal) / (charCount + spaces * 0.35);
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
      if (i < rows.length - 1) await sleep(60 + Math.random() * 30);
    }
    root.dataset.done = String(performance.now());
    popHeart();
  }

  play();
})();
