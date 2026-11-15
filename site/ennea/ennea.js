/* who i am. edit TYPES to change scores or blurbs.
   2 is the main type. 1 is the left wing, 3 the right. */
(() => {
  const root = document.getElementById('ennea');
  if (!root) return;

  const TYPES = [
    { n: 2, name: 'helper', score: 93, role: 'main type', wing: 'main',
      blurb: 'twos show up for people. they catch the feeling before it is said, and they give their time, attention, and care. the growth is honoring their own needs too, and trusting they are loved for who they are, not only for what they give.' },
    { n: 1, name: 'reformer', score: 79, role: 'left wing', wing: 'wing',
      blurb: 'ones want it right. they see the miss, then they work it until it holds. the edge is letting good enough stand, and saving some of that care for themselves.' },
    { n: 3, name: 'achiever', score: 61, role: 'right wing', wing: 'wing',
      blurb: 'threes aim at the win and adapt to whatever the room needs. they look capable because they are. the trap is living as the highlight and losing the person under it.' },
    { n: 8, name: 'challenger', score: 86, role: '', wing: '',
      blurb: 'eights take the lead and protect their people. direct, hard to move, a little armored. strength is the gift. so is knowing when to set it down.' },
    { n: 6, name: 'loyalist', score: 82, role: '', wing: '',
      blurb: 'sixes scan for the trouble, then they stay. loyal, prepared, a bit braced. the work is trusting the ground they are already standing on.' },
    { n: 4, name: 'individualist', score: 79, role: '', wing: '',
      blurb: 'fours feel it in full and want a life that looks like them. meaning matters more than fitting the mold.' },
    { n: 7, name: 'enthusiast', score: 79, role: '', wing: '',
      blurb: 'sevens keep the next good thing in sight. fast, bright, restless. the move is staying when the room gets quiet.' },
    { n: 5, name: 'investigator', score: 54, role: '', wing: '',
      blurb: 'fives watch before they step in. they want the map, then they come closer. enough knowing, then the room.' },
    { n: 9, name: 'peacemaker', score: 43, role: '', wing: '',
      blurb: 'nines keep the peace and go along. easy to miss what they actually want. the work is saying it out loud.' }
  ];

  const byN = new Map(TYPES.map((t) => [t.n, t]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CX = 100;
  const CY = 100;
  const R = 72;

  const angle = (n) => -Math.PI / 2 + (n === 9 ? 0 : n) * (2 * Math.PI / 9);
  const xy = (n, radius) => {
    const a = angle(n);
    return [CX + Math.cos(a) * radius, CY + Math.sin(a) * radius];
  };
  const line = (nums, radius) => nums.map((n) => {
    const [x, y] = xy(n, radius);
    return x.toFixed(2) + ' ' + y.toFixed(2);
  }).join(' ');

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 200 200');
  svg.setAttribute('class', 'ennea-svg');
  svg.setAttribute('aria-hidden', 'true');

  const addPath = (cls, d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', 'ennea-line ' + cls);
    path.setAttribute('pathLength', '1');
    path.setAttribute('d', d);
    svg.append(path);
  };

  const ringEl = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  ringEl.setAttribute('class', 'ennea-line ring');
  ringEl.setAttribute('pathLength', '1');
  ringEl.setAttribute('cx', String(CX));
  ringEl.setAttribute('cy', String(CY));
  ringEl.setAttribute('r', String(R));
  svg.append(ringEl);
  addPath('hex', 'M ' + line([1, 4, 2, 8, 5, 7, 1], R));
  addPath('tri', 'M ' + line([9, 3, 6, 9], R));
  const [x1, y1] = xy(1, R + 8);
  const [x3, y3] = xy(3, R + 8);
  addPath('wing', 'M ' + x1.toFixed(2) + ' ' + y1.toFixed(2) + ' A ' + (R + 8) + ' ' + (R + 8) + ' 0 0 1 ' + x3.toFixed(2) + ' ' + y3.toFixed(2));

  const ring = document.createElement('div');
  ring.className = 'ennea-ring';
  ring.append(svg);

  TYPES.forEach((t) => {
    const [x, y] = xy(t.n, R);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ennea-pt' + (t.wing === 'main' ? ' is-main' : t.wing === 'wing' ? ' is-wing' : '');
    btn.dataset.n = String(t.n);
    btn.style.left = (x / 2) + '%';
    btn.style.top = (y / 2) + '%';
    const size = 22 + (t.score / 100) * 14;
    btn.style.width = size + 'px';
    btn.style.height = size + 'px';
    btn.textContent = String(t.n);
    btn.setAttribute('aria-label', 'type ' + t.n + ' ' + t.name + ', ' + t.score + ' percent');
    ring.append(btn);
  });

  const list = document.createElement('ol');
  list.className = 'ennea-list';
  TYPES.forEach((t, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ennea-row' + (t.wing === 'main' ? ' is-main' : t.wing === 'wing' ? ' is-wing' : '');
    btn.dataset.n = String(t.n);
    btn.style.setProperty('--p', String(t.score));
    btn.setAttribute('aria-label', 'type ' + t.n + ' ' + t.name + ', ' + t.score + ' percent');
    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(t.n);
    const name = document.createElement('span');
    name.className = 'ennea-name';
    name.append(document.createTextNode(t.name));
    if (t.role) {
      const role = document.createElement('span');
      role.className = 'ennea-role';
      role.textContent = t.role;
      name.append(role);
    }
    const pct = document.createElement('span');
    pct.className = 'ennea-pct';
    pct.dataset.score = String(t.score);
    pct.textContent = reduce ? t.score + '%' : '0%';
    const track = document.createElement('span');
    track.className = 'ennea-track';
    track.style.transitionDelay = (0.15 + i * 0.05) + 's';
    const fill = document.createElement('span');
    fill.className = 'ennea-fill';
    fill.style.transitionDelay = (0.2 + i * 0.06) + 's';
    track.append(fill);
    btn.append(num, name, pct, track);
    li.append(btn);
    list.append(li);
  });

  const blurb = document.createElement('p');
  blurb.className = 'ennea-blurb';
  blurb.id = 'ennea-blurb';

  const read = document.createElement('div');
  read.className = 'ennea-read';
  read.append(list, blurb);

  const body = document.createElement('div');
  body.className = 'ennea-body';
  body.append(ring, read);
  root.append(body);

  let picked = 2;
  let hot = 2;

  function show(n) {
    hot = n;
    const type = byN.get(n);
    root.querySelectorAll('[data-n]').forEach((el) => {
      const on = Number(el.dataset.n) === n;
      el.classList.toggle('is-hot', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    blurb.textContent = type ? type.blurb : '';
  }

  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-n]');
    if (!btn || !root.contains(btn)) return;
    picked = Number(btn.dataset.n);
    show(picked);
  });
  root.addEventListener('pointerover', (e) => {
    const btn = e.target.closest('[data-n]');
    if (!btn || !root.contains(btn)) return;
    show(Number(btn.dataset.n));
  });
  root.addEventListener('pointerout', (e) => {
    const btn = e.target.closest('[data-n]');
    if (!btn) return;
    const next = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest('[data-n]') : null;
    if (next && root.contains(next)) return;
    show(picked);
  });
  root.addEventListener('focusin', (e) => {
    const btn = e.target.closest('[data-n]');
    if (!btn || !root.contains(btn)) return;
    picked = Number(btn.dataset.n);
    show(picked);
  });

  show(2);

  const pcts = [...root.querySelectorAll('.ennea-pct')];
  const tick = (start) => {
    const t = Math.min(1, (performance.now() - start) / 900);
    const ease = 1 - Math.pow(1 - t, 3);
    pcts.forEach((el) => {
      el.textContent = Math.round(Number(el.dataset.score) * ease) + '%';
    });
    if (t < 1) requestAnimationFrame(() => tick(start));
  };

  requestAnimationFrame(() => {
    root.classList.add('is-drawn');
    if (!reduce) requestAnimationFrame(() => tick(performance.now()));
  });
})();
