/* Timeline from /outloud/posts.json. Newest first. Text stays text. */
(() => {
  const root = document.getElementById('outloud');
  const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  function stamp(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date);
    const get = (type) => {
      const part = parts.find((item) => item.type === type);
      return part ? part.value : '';
    };
    const month = MONTHS[Number(get('month')) - 1] || '';
    const dayPeriod = get('dayPeriod').toLowerCase();
    return month + ' ' + get('day') + ', ' + get('year') + ' · ' + get('hour') + ':' + get('minute') + ' ' + dayPeriod;
  }

  function linkText(node, text) {
    const pattern = /https?:\/\/[^\s<]+/g;
    let last = 0;
    let match;
    while ((match = pattern.exec(text))) {
      node.append(document.createTextNode(text.slice(last, match.index)));
      let href = match[0];
      const trail = href.match(/[),.:!?]+$/);
      let extra = '';
      if (trail) {
        extra = trail[0];
        href = href.slice(0, -extra.length);
      }
      const link = document.createElement('a');
      link.href = href;
      link.textContent = href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      node.append(link);
      if (extra) node.append(document.createTextNode(extra));
      last = match.index + match[0].length;
    }
    node.append(document.createTextNode(text.slice(last)));
  }

  function empty() {
    const note = document.createElement('p');
    note.className = 'out-empty';
    note.textContent = 'nothing out loud yet';
    root.replaceChildren(note);
  }

  function render(rows) {
    if (!root) return;
    if (!Array.isArray(rows) || !rows.length) {
      empty();
      return;
    }
    const items = rows
      .filter((row) => row && typeof row.text === 'string' && row.text.trim() && typeof row.ts === 'string')
      .slice()
      .sort((a, b) => (a.ts < b.ts ? 1 : a.ts > b.ts ? -1 : 0));
    if (!items.length) {
      empty();
      return;
    }
    const frag = document.createDocumentFragment();
    items.forEach((row) => {
      const article = document.createElement('article');
      article.className = 'out-post';
      const when = document.createElement('p');
      when.className = 'out-when';
      when.textContent = stamp(row.ts);
      const body = document.createElement('p');
      body.className = 'out-text';
      linkText(body, row.text);
      article.append(when, body);
      frag.append(article);
    });
    root.replaceChildren(frag);
  }

  fetch('/outloud/posts.json', { cache: 'no-cache' })
    .then((res) => res.ok ? res.json() : [])
    .then(render)
    .catch(() => empty());
})();
