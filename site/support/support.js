/* Dated blocks, newest first. A line with a url is a link. A line without one stays text. */
const root = document.getElementById('support');

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
    li.append(link);
  } else {
    li.textContent = text;
  }
  return li;
}

function block(entry) {
  if (!entry || typeof entry.date !== 'string' || !Array.isArray(entry.groups)) return null;
  const section = document.createElement('section');
  section.className = 'support-block';
  const date = document.createElement('p');
  date.className = 'support-date';
  date.textContent = entry.date;
  section.append(date);
  entry.groups.forEach((group) => {
    if (!Array.isArray(group)) return;
    const list = document.createElement('ul');
    list.className = 'support-group';
    group.forEach((item) => {
      const row = line(item);
      if (row) list.append(row);
    });
    if (list.childNodes.length) section.append(list);
  });
  return section.childNodes.length > 1 ? section : null;
}

fetch('/support/items.json', { cache: 'no-cache' })
  .then((res) => res.ok ? res.json() : [])
  .then((rows) => {
    if (!root || !Array.isArray(rows)) return;
    const frag = document.createDocumentFragment();
    rows.forEach((entry) => {
      const node = block(entry);
      if (node) frag.append(node);
    });
    root.replaceChildren(frag);
  })
  .catch(() => {});
