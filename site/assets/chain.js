/* The paradox chain reveals once, slowly enough to read. Each character
   eases in with transform and opacity. A finished line's last noun slides
   down and becomes the first noun of the next line. destiny takes one
   brain-gold breath, then the chain holds still. */
(() => {
  const root = document.querySelector('ol.chain');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'jay.chain.v2';
  let seen = false;
  try { seen = localStorage.getItem(KEY) === '1'; } catch (e) {}

  const hold = () => {
    root.classList.add('is-still');
    document.documentElement.classList.remove('chain-play');
  };
  if (reduce || seen) {
    hold();
    return;
  }

  const lines = [...root.querySelectorAll('li')];
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const FADE = 380;
  const STAGGER = 38;
  const SLIDE = 560;
  const BEAT = 180;
  const GLOW = 1800;

  function charsOf(el) {
    const text = el.textContent;
    const chars = [...text].map((ch) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = ch;
      span.style.opacity = '0';
      return span;
    });
    el.replaceChildren(...chars);
    el.style.opacity = '1';
    return chars;
  }

  function reveal(parts) {
    let delay = 0;
    parts.forEach((el) => {
      const chars = charsOf(el);
      chars.forEach((ch, i) => {
        ch.animate([
          { opacity: 0, transform: 'translate3d(0, 0.22em, 0)' },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ], {
          duration: FADE,
          delay: delay + i * STAGGER,
          easing: 'cubic-bezier(.16, .84, .28, 1)',
          fill: 'forwards'
        });
      });
      delay += chars.length * STAGGER;
    });
    return sleep(delay + FADE);
  }

  function showLanded(el) {
    el.style.opacity = '1';
  }

  function fly(from, to) {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const cs = getComputedStyle(from);
    const ghost = from.cloneNode(true);
    ghost.className = 'chain-fly';
    ghost.querySelectorAll('.ch').forEach((ch) => {
      ch.style.opacity = '1';
      ch.style.transform = 'none';
    });
    ghost.style.left = a.left + 'px';
    ghost.style.top = a.top + 'px';
    ghost.style.font = cs.font;
    ghost.style.letterSpacing = cs.letterSpacing;
    ghost.style.lineHeight = cs.lineHeight;
    ghost.style.opacity = '1';
    document.body.append(ghost);
    const motion = ghost.animate([
      { transform: 'translate3d(0, 0, 0)' },
      { transform: 'translate3d(' + (b.left - a.left) + 'px, ' + (b.top - a.top) + 'px, 0)' }
    ], { duration: SLIDE, easing: 'cubic-bezier(.22, .8, .28, 1)', fill: 'forwards' });
    return motion.finished.then(() => ghost.remove());
  }

  async function play() {
    for (let i = 0; i < lines.length; i++) {
      const li = lines[i];
      const pre = li.querySelector('.pre');
      const noun = li.querySelector('.noun');
      const post = li.querySelector('.post');
      const carry = li.querySelector('.carry');
      await reveal(i === 0 ? [pre, noun, post, carry] : [pre, post, carry]);
      if (i === lines.length - 1) {
        carry.classList.add('is-destiny');
        await sleep(GLOW);
        break;
      }
      await sleep(BEAT);
      const nextNoun = lines[i + 1].querySelector('.noun');
      await fly(carry, nextNoun);
      showLanded(nextNoun);
      await sleep(BEAT);
    }
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    hold();
  }

  play();
})();
