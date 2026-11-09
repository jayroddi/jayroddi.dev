/* Ordered list of {name, url}. An empty file leaves the page blank under the header. */
const list = document.getElementById('support');

fetch('/support/items.json', { cache: 'no-cache' })
  .then((res) => res.ok ? res.json() : [])
  .then((rows) => {
    if (!list || !Array.isArray(rows)) return;
    const frag = document.createDocumentFragment();
    rows.forEach((row) => {
      if (!row || typeof row.name !== 'string' || typeof row.url !== 'string') return;
      const name = row.name.trim();
      const url = row.url.trim();
      if (!name || !/^https?:\/\//i.test(url)) return;
      const li = document.createElement('li');
      const link = document.createElement('a');
      link.href = url;
      link.textContent = name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.append(link);
      frag.append(li);
    });
    list.replaceChildren(frag);
  })
  .catch(() => {});
