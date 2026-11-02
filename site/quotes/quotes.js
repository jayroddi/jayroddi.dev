/* landing is always today's quote. the right arrow brings the next older quote in from the right. */
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

  function show(nextIndex, dir) {
    if (busy || !current || nextIndex < 0 || nextIndex >= list.length || nextIndex === index) return;
    const enter = dir > 0 ? 'from-right' : 'from-left';
    const leave = dir > 0 ? 'to-left' : 'to-right';
    if (reduce) {
      index = nextIndex;
      paint(list[index]);
      arrows();
      return;
    }
    busy = true;
    const outgoing = current;
    const incoming = slide(list[nextIndex]);
    incoming.classList.add('layer', enter);
    stage.append(incoming);
    incoming.getBoundingClientRect();
    outgoing.classList.add('swap', leave);
    const onLeave = (event) => {
      if (event.propertyName !== 'transform' || event.target !== outgoing) return;
      outgoing.removeEventListener('transitionend', onLeave);
      incoming.classList.add('swap');
      incoming.getBoundingClientRect();
      incoming.classList.remove(enter);
      const onEnter = (event) => {
        if (event.propertyName !== 'transform' || event.target !== incoming) return;
        incoming.removeEventListener('transitionend', onEnter);
        outgoing.remove();
        incoming.classList.remove('swap');
        current = incoming;
        index = nextIndex;
        busy = false;
        arrows();
      };
      incoming.addEventListener('transitionend', onEnter);
    };
    outgoing.addEventListener('transitionend', onLeave);
  }

  prev.addEventListener('click', () => show(index - 1, -1));
  next.addEventListener('click', () => show(index + 1, 1));
  addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(index + 1, 1);
    if (event.key === 'ArrowLeft') show(index - 1, -1);
  });

  let startX = 0;
  let tracking = false;
  const onPill = (event) => {
    const el = event.target;
    return !!(el && el.closest && el.closest('.nav-stack, .social-dock'));
  };
  addEventListener('pointerdown', (event) => {
    if (onPill(event)) return;
    tracking = true;
    startX = event.clientX;
  });
  addEventListener('pointerup', (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    if (dx < -48) show(index + 1, 1);
    else if (dx > 48) show(index - 1, -1);
  });
  addEventListener('pointercancel', () => { tracking = false; });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { if (list.length) lock(); }, 120);
  });

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
  }).catch(() => {});
})();
