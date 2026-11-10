/* Types "discipline is destiny" on every load. The full phrase is already
   in the layout, each character starts invisible in its final color, and
   and nothing draws a cursor. prefers-reduced-motion shows the end. */
(() => {
  const root = document.querySelector('.phrase');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function colorFor(el) {
    if (el.classList.contains('destiny')) return '#FFD700';
    if (el.classList.contains('discipline')) return '#1AADB3';
    return '#f4efe6';
  }

  const chars = [];
  root.querySelectorAll('.discipline, .plain, .destiny').forEach((el) => {
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

  if (reduce) return;

  function waitFor(prev) {
    const jitter = (Math.random() * 2 - 1) * 8;
    const pause = prev === ' ' ? 110 : 0;
    return Math.round(168 + jitter + pause);
  }

  async function play() {
    root.dataset.t0 = String(performance.now());
    let prev = '';
    for (const ch of chars) {
      await sleep(waitFor(prev));
      ch.style.opacity = '1';
      prev = ch.textContent;
    }
    root.dataset.done = String(performance.now());
    popHeart();
  }

  play();
})();
