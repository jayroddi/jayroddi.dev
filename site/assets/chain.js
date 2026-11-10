/* The paradox chain types once, then stays revealed. A finished line's last
   word glows teal and slides down to become the noun in the next line.
   destiny takes one orange breath and the chain holds still. */
(() => {
  const root = document.querySelector('ol.chain');
  if (!root) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const KEY = 'jay.chain.v1';
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
  const SLIDE = 220;
  const GLOW = 1800;
  let typed = 0;
  lines.forEach((li, index) => {
    typed += li.querySelector('.pre').textContent.length;
    typed += li.querySelector('.post').textContent.length;
    typed += li.querySelector('.carry').textContent.length;
    if (index === 0) typed += li.querySelector('.noun').textContent.length;
  });
  const per = (5600 - GLOW - (lines.length - 1) * SLIDE) / typed;

  lines.forEach((li) => {
    li.querySelectorAll('.pre, .noun, .post, .carry').forEach((el) => el.classList.add('wipe'));
  });

  function wipe(el) {
    const ms = Math.max(90, Math.round(el.textContent.length * per));
    el.style.transition = 'none';
    void el.offsetWidth;
    el.style.transition = 'clip-path ' + ms + 'ms steps(' + Math.max(2, el.textContent.length) + ', end)';
    el.classList.add('is-on');
    return sleep(ms);
  }

  function showLanded(el) {
    el.style.transition = 'none';
    el.classList.remove('wipe');
    el.style.clipPath = 'none';
    el.classList.add('is-on', 'is-hot');
  }

  function fly(from, to) {
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const cs = getComputedStyle(from);
    const ghost = from.cloneNode(true);
    ghost.className = 'chain-fly';
    ghost.style.left = a.left + 'px';
    ghost.style.top = a.top + 'px';
    ghost.style.font = cs.font;
    ghost.style.letterSpacing = cs.letterSpacing;
    ghost.style.lineHeight = cs.lineHeight;
    document.body.append(ghost);
    const motion = ghost.animate([
      { transform: 'translate(0px, 0px)' },
      { transform: 'translate(' + (b.left - a.left) + 'px, ' + (b.top - a.top) + 'px)' }
    ], { duration: SLIDE, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'forwards' });
    return motion.finished.then(() => ghost.remove());
  }

  async function play() {
    for (let i = 0; i < lines.length; i++) {
      const li = lines[i];
      const pre = li.querySelector('.pre');
      const noun = li.querySelector('.noun');
      const post = li.querySelector('.post');
      const carry = li.querySelector('.carry');
      await wipe(pre);
      if (i === 0) await wipe(noun);
      await wipe(post);
      noun.classList.remove('is-hot');
      await wipe(carry);
      if (i === lines.length - 1) {
        carry.classList.add('is-destiny');
        await sleep(GLOW);
        break;
      }
      carry.classList.add('is-hot');
      const nextNoun = lines[i + 1].querySelector('.noun');
      await fly(carry, nextNoun);
      carry.classList.remove('is-hot');
      showLanded(nextNoun);
    }
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    hold();
  }

  play();
})();
