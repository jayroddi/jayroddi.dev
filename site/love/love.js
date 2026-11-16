/* Dated blocks, newest first. A line with a url is a link. A line without one stays text. */
const now = document.getElementById('love-now');
const lists = document.getElementById('love-lists');
const NOTES = [
  'loving life - myself, my kids, all the organic, genuine connections',
  'having full trust in god / the universe (new for me)',
  'building apps, building companies, building the future',
  'getting rid of dad bod #2',
  'getting close on spaceX juniper, but need people to follow through with their commitments...',
  'mideeyah is in alpha but something keeps telling me to pivot to something much bigger',
  'yeti mt is the 🐐 but cold & wet is my nemesis so we may be in hibernation soon',
  'looking at job postings while simultaneously...',
  'having catch ups with people at all levels across dfw corporate and woof it\'s somehow even worse since i left',
  'after a summer of realizing i have always tried to be/stay in relationships because i felt i was supposed to be with someone, i finally learned how to just let go and allow every aspect of my life to just flow... but on 10.21 i met the woman who has set the standard for the person i want to spend forever with'
];
const STEPS = ['reading diablo', 'unmounting jayos2.0', 'writing skyline', 'verifying boot', 'install complete'];

function line(entry) {
  if (!entry || typeof entry.text !== 'string') return null;
  const text = entry.text.replace(/\s+$/, '');
  if (!text) return null;
  const li = document.createElement('li');
  const url = typeof entry.url === 'string' ? entry.url.trim() : '';
  if (/^https?:\/\//i.test(url)) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = text;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (entry.gold) link.className = 'gold';
    li.append(link);
  } else {
    li.textContent = text;
  }
  return li;
}

function placeName(text) {
  return String(text || '')
    .replace(/^(?:\p{Extended_Pictographic}\uFE0F?\s*)+/u, '')
    .replace(/^the\s+/i, '')
    .trim()
    .toLowerCase();
}

function ordered(group) {
  if (!group.length || !group.every((item) => item && item.gold)) return group;
  return group.map((item, index) => ({ item, index }))
    .sort((a, b) => placeName(a.item.text).localeCompare(placeName(b.item.text), 'en') || (a.index - b.index))
    .map((row) => row.item);
}

function installer() {
  const os = document.createElement('section');
  os.className = 'os';
  os.setAttribute('aria-label', 'operating system installation');
  const from = document.createElement('p');
  from.className = 'os-from';
  from.textContent = 'jayos2.0 diablo';
  const bar = document.createElement('div');
  bar.className = 'os-bar';
  bar.setAttribute('aria-hidden', 'true');
  const fill = document.createElement('i');
  bar.append(fill);
  const to = document.createElement('p');
  to.className = 'os-to';
  to.textContent = 'jayos3.0 skyline (gm) 2026.11.16';
  const log = document.createElement('p');
  log.className = 'os-log';
  os.append(from, bar, to, log);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    os.classList.add('is-done');
    log.textContent = 'install complete';
    return os;
  }
  let step = 0;
  log.textContent = STEPS[0];
  const timer = setInterval(() => {
    step += 1;
    if (step >= STEPS.length - 1) {
      clearInterval(timer);
      log.textContent = STEPS[STEPS.length - 1];
      os.classList.add('is-done');
      return;
    }
    log.textContent = STEPS[step];
  }, 800);
  return os;
}

function notes() {
  const list = document.createElement('ul');
  list.className = 'os-notes';
  NOTES.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    list.append(li);
  });
  return list;
}

function intro(dateText) {
  const date = document.createElement('p');
  date.className = 'support-date';
  date.textContent = dateText;
  const lfg = document.createElement('p');
  lfg.className = 'os-lfg';
  lfg.textContent = 'lfg 2027 🚀';
  const frag = document.createDocumentFragment();
  frag.append(date, installer(), notes(), lfg);
  return frag;
}

function block(entry) {
  if (!entry || typeof entry.date !== 'string' || !Array.isArray(entry.groups)) return null;
  const section = document.createElement('section');
  section.className = 'support-block';
  entry.groups.forEach((group) => {
    if (!Array.isArray(group)) return;
    const list = document.createElement('ul');
    list.className = 'support-group';
    ordered(group).forEach((item) => {
      const row = line(item);
      if (row) list.append(row);
    });
    if (list.childNodes.length) section.append(list);
  });
  return section.childNodes.length ? section : null;
}

fetch('/love/items.json', { cache: 'no-cache' })
  .then((res) => res.ok ? res.json() : [])
  .then((rows) => {
    if (!lists || !Array.isArray(rows)) return;
    if (now && rows[0] && typeof rows[0].date === 'string') now.replaceChildren(intro(rows[0].date));
    const frag = document.createDocumentFragment();
    rows.forEach((entry) => {
      const node = block(entry);
      if (node) frag.append(node);
    });
    lists.replaceChildren(frag);
  })
  .catch(() => {});
