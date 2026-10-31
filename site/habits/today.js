/* v2: today's quote under the mast on / and /habits/. the feed is still
   /quote-of-the-day/quotes.json. the filter matches quotes.js: a real date,
   text (or quote), an author, and date <= today in America/Chicago, so a
   future entry stays hidden. only the entry dated today is painted. the
   name is the next line, lowercase via css, with a hyphen tight to the
   name (-derek sivers). /quotes and /daily still paint the full list and
   still drop a leading dash. */
(() => {
  const host = document.querySelector('.day-quote');
  if (!host) return;
  const chicago = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());

  fetch('/quote-of-the-day/quotes.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject()).then(rows => {
    if (!Array.isArray(rows)) return;
    const day = chicago();
    const list = rows.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (typeof e.text === 'string' && e.text.trim() || typeof e.quote === 'string' && e.quote.trim()) && e.author && e.date <= day)
      .map(e => ({date: e.date, text: (e.text || e.quote).trim(), author: String(e.author).trim().replace(/^\s*[-–—]\s*/, '')}));
    const hit = list.find(e => e.date === day);
    if (!hit || !hit.text || !hit.author) return;
    const q = document.createElement('p');
    q.className = 'qt';
    q.textContent = hit.text;
    const by = document.createElement('p');
    by.className = 'qa';
    by.textContent = '-' + hit.author;
    host.replaceChildren(q, by);
    host.hidden = false;
  }).catch(() => {});
})();
