/* landing is always today's quote. the right arrow brings the next older quote in from the right. */
(() => {
  const card = document.getElementById('quote-card');
  const prev = document.querySelector('.arrow.prev');
  const next = document.querySelector('.arrow.next');
  if (!card || !prev || !next) return;

  const chicago = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const dots = (day) => day.replace(/-/g, '.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let list = [];
  let index = 0;
  let busy = false;

  function paint(entry) {
    card.replaceChildren();
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
    card.append(li);
  }

  function arrows() {
    prev.hidden = index === 0;
    next.hidden = index >= list.length - 1;
  }

  function show(nextIndex, dir) {
    if (busy || nextIndex < 0 || nextIndex >= list.length || nextIndex === index) return;
    const enter = dir > 0 ? 'from-right' : 'from-left';
    const leave = dir > 0 ? 'to-left' : 'to-right';
    if (reduce) {
      index = nextIndex;
      paint(list[index]);
      arrows();
      return;
    }
    busy = true;
    card.classList.add('swap', leave);
    const done = (event) => {
      if (event.propertyName !== 'transform') return;
      card.removeEventListener('transitionend', done);
      index = nextIndex;
      paint(list[index]);
      card.classList.remove('swap', leave);
      card.classList.add(enter);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.classList.add('swap');
          card.classList.remove(enter);
          const finish = (event) => {
            if (event.propertyName !== 'transform') return;
            card.removeEventListener('transitionend', finish);
            card.classList.remove('swap');
            busy = false;
            arrows();
          };
          card.addEventListener('transitionend', finish);
        });
      });
    };
    card.addEventListener('transitionend', done);
  }

  prev.addEventListener('click', () => show(index - 1, -1));
  next.addEventListener('click', () => show(index + 1, 1));
  addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(index + 1, 1);
    if (event.key === 'ArrowLeft') show(index - 1, -1);
  });

  let startX = 0;
  let tracking = false;
  card.addEventListener('pointerdown', (event) => {
    tracking = true;
    startX = event.clientX;
  });
  card.addEventListener('pointerup', (event) => {
    if (!tracking) return;
    tracking = false;
    const dx = event.clientX - startX;
    if (dx < -48) show(index + 1, 1);
    else if (dx > 48) show(index - 1, -1);
  });
  card.addEventListener('pointercancel', () => { tracking = false; });

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
    paint(list[0]);
    arrows();
  }).catch(() => {});
})();
