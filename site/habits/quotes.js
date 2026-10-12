/* v2.27: daily quotes under the konami row. the feed is /quote-of-the-day/quotes.json
   (newest first; one object per day: date, text, author). the whole list is inserted at once,
   after the konami row's fade has finished. nothing in the list is staggered. */
(() => {
  const foot = document.querySelector('footer.foot');
  const pad = foot && foot.querySelector('.pad');
  if (!foot) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chicago = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
  const dots = d => d.replace(/-/g, '.');

  function paint(list){
    const ol = document.createElement('ol');
    ol.className = 'quotes';
    ol.setAttribute('aria-label', 'quotes');
    const frag = document.createDocumentFragment();
    list.forEach(e => {
      const li = document.createElement('li');
      const d = document.createElement('p');
      d.className = 'd';
      const time = document.createElement('time');
      time.dateTime = e.date;
      time.textContent = dots(e.date);
      d.appendChild(time);
      const q = document.createElement('blockquote');
      q.className = 'q';
      q.textContent = e.text;
      const by = document.createElement('p');
      by.className = 'by';
      by.textContent = '- ' + e.author;
      li.append(d, q, by);
      frag.appendChild(li);
    });
    ol.appendChild(frag);
    if (pad) pad.insertAdjacentElement('afterend', ol);
    else foot.appendChild(ol);
  }

  function whenPadDone(fn){
    if (!pad){ fn(); return; }
    let done = false;
    const go = () => { if (done) return; done = true; fn(); };
    const waitFade = () => {
      if (reduced){ go(); return; }
      const running = typeof pad.getAnimations === 'function' && pad.getAnimations().some(a => a.playState === 'running');
      const opaque = parseFloat(getComputedStyle(pad).opacity) >= 0.99;
      if (!running && opaque){ go(); return; }
      const onEnd = e => {
        if (e.target !== pad || e.propertyName !== 'opacity') return;
        pad.removeEventListener('transitionend', onEnd);
        go();
      };
      pad.addEventListener('transitionend', onEnd);
      setTimeout(go, 500);
    };
    if (pad.classList.contains('in')) waitFade();
    else {
      const mo = new MutationObserver(() => {
        if (!pad.classList.contains('in')) return;
        mo.disconnect();
        waitFade();
      });
      mo.observe(pad, {attributes: true, attributeFilter: ['class']});
    }
  }

  fetch('/quote-of-the-day/quotes.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject()).then(rows => {
    if (!Array.isArray(rows)) return;
    const day = chicago();
    const list = rows.filter(e => e && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (typeof e.text === 'string' && e.text.trim() || typeof e.quote === 'string' && e.quote.trim()) && e.author && e.date <= day)
      .map(e => ({date: e.date, text: (e.text || e.quote).trim(), author: String(e.author).trim()}))
      .sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    if (!list.length) return;
    whenPadDone(() => paint(list));
  }).catch(() => {});
})();
