/* Riddle gate. The expected entry is not stored. Only its SHA-256 is. */
(() => {
  const KEY = 'jay-gate';
  const HASH = '9de96f89f90714c7c7936cafd5b8c3c15378da2fea4ca43d911f2341b34ead4b';
  const GROUPS = [7, 3, 3, 4];
  const root = document.documentElement;
  const GA = 'G-G8DYYL3KYM';

  function optedOut() {
    if (window['ga-disable-' + GA] === true) return true;
    try { return localStorage.getItem('jr_ga_off') === '1'; } catch (e) { return false; }
  }

  const pending = [];
  let flushTimer = 0;
  let flushTries = 0;

  function ensureTag() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    const queued = window.dataLayer.some((item) => item && item[0] === 'config');
    if (!queued) {
      window.gtag('js', new Date());
      window.gtag('config', GA);
    }
    if (!document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA);
      document.head.appendChild(script);
    }
  }

  function clientId() {
    const match = document.cookie.match(/(?:^|; )_ga=GA1\.\d+\.(\d+\.\d+)/);
    return match ? match[1] : '';
  }

  function sessionBits() {
    const match = document.cookie.match(new RegExp('(?:^|; )_ga_' + GA.slice(2) + '=GS\\d+\\.\\d+\\.s(\\d+)\\$o(\\d+)'));
    return match ? { sid: match[1], sct: match[2] } : null;
  }

  function flush() {
    if (optedOut()) { pending.length = 0; return; }
    const cid = clientId();
    if (!cid) {
      if (!flushTimer) flushTimer = setInterval(flush, 200);
      flushTries += 1;
      if (flushTries > 40) clearInterval(flushTimer);
      return;
    }
    if (flushTimer) { clearInterval(flushTimer); flushTimer = 0; }
    const session = sessionBits();
    while (pending.length) {
      const name = pending.shift();
      const params = new URLSearchParams({
        v: '2',
        tid: GA,
        cid: cid,
        en: name,
        dl: location.origin + location.pathname,
        'ep.page_path': location.pathname,
        _s: '2'
      });
      if (session) {
        params.set('sid', session.sid);
        params.set('sct', session.sct);
        params.set('seg', '1');
      }
      const url = 'https://www.google-analytics.com/g/collect?' + params.toString();
      try {
        if (!navigator.sendBeacon || !navigator.sendBeacon(url)) {
          fetch(url, { method: 'POST', mode: 'no-cors', keepalive: true });
        }
      } catch (e) {}
    }
  }

  // gtag.js records commands that are already queued when it boots, then drops
  // later gtag('event') calls. A beacon after the client id exists is the hit
  // that actually leaves the browser. The only parameter is the page path.
  function track(name) {
    if (optedOut()) return;
    if (name !== 'gate_view' && name !== 'gate_unlock' && name !== 'gate_pass') return;
    try {
      ensureTag();
      pending.push(name);
      flush();
    } catch (e) {}
  }

  if (root.classList.contains('gate-open')) {
    track('gate_pass');
    return;
  }

  const boxes = [];
  const gate = document.createElement('form');
  gate.className = 'jay-gate';
  gate.setAttribute('autocomplete', 'off');
  gate.setAttribute('aria-label', "what is jay's favorite drink when made by a specific person?");

  const prompt = document.createElement('p');
  prompt.className = 'jay-gate-q';
  prompt.textContent = "what is jay's favorite drink when made by a specific person?";

  const words = document.createElement('div');
  words.className = 'jay-gate-words';
  let line = null;
  GROUPS.forEach((count, index) => {
    if (index % 2 === 0) {
      line = document.createElement('div');
      line.className = 'jay-gate-line';
      words.append(line);
    }
    const word = document.createElement('div');
    word.className = 'jay-word';
    for (let i = 0; i < count; i += 1) {
      const input = document.createElement('input');
      input.type = 'text';
      input.maxLength = 1;
      input.inputMode = 'text';
      input.autocapitalize = 'off';
      input.autocomplete = 'off';
      input.spellcheck = false;
      input.setAttribute('autocorrect', 'off');
      input.setAttribute('aria-label', 'letter');
      word.append(input);
      boxes.push(input);
    }
    line.append(word);
  });
  gate.append(prompt, words);
  document.body.append(gate);
  boxes[0].focus();
  track('gate_view');

  const indexOf = (el) => boxes.indexOf(el);
  const focusAt = (i) => {
    if (i < 0) i = 0;
    if (i >= boxes.length) i = boxes.length - 1;
    const box = boxes[i];
    box.focus();
    try { box.setSelectionRange(0, box.value.length); } catch (e) {}
  };

  function entry() {
    let at = 0;
    const parts = GROUPS.map((count) => {
      let word = '';
      for (let i = 0; i < count; i += 1) word += (boxes[at + i].value || '').toLowerCase();
      at += count;
      return word;
    });
    return parts.join(' ');
  }

  function clearAll() {
    boxes.forEach((box) => { box.value = ''; });
    focusAt(0);
  }

  function shake() {
    gate.classList.remove('is-shake');
    void gate.offsetWidth;
    gate.classList.add('is-shake');
    clearAll();
  }

  function fillFrom(start, text) {
    const letters = String(text || '').toLowerCase().replace(/[^a-z]/g, '').split('');
    let at = start;
    letters.forEach((letter) => {
      if (at >= boxes.length) return;
      boxes[at].value = letter;
      at += 1;
    });
    focusAt(Math.min(at, boxes.length - 1));
    if (at >= boxes.length) check();
  }

  async function digest(text) {
    const bytes = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  let busy = false;
  async function check() {
    if (busy) return;
    if (boxes.some((box) => !box.value)) return;
    busy = true;
    let hash = '';
    try { hash = await digest(entry()); } catch (e) { busy = false; shake(); return; }
    if (hash !== HASH) { busy = false; shake(); return; }
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
    track('gate_unlock');
    root.classList.add('gate-open');
    root.classList.remove('is-locked');
    gate.classList.add('is-out');
    const next = root.getAttribute('data-gate-next');
    const done = () => {
      gate.remove();
      if (next) location.replace(next);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else setTimeout(done, 400);
  }

  gate.addEventListener('submit', (event) => { event.preventDefault(); check(); });
  words.addEventListener('paste', (event) => {
    const input = event.target;
    if (!input || input.tagName !== 'INPUT') return;
    event.preventDefault();
    const text = (event.clipboardData || window.clipboardData).getData('text');
    fillFrom(indexOf(input), text);
  });
  boxes.forEach((box) => {
    box.addEventListener('keydown', (event) => {
      event.stopPropagation();
      const i = indexOf(box);
      if (event.key === 'Backspace') {
        event.preventDefault();
        if (box.value) { box.value = ''; return; }
        if (i > 0) { boxes[i - 1].value = ''; focusAt(i - 1); }
        return;
      }
      if (event.key === 'ArrowLeft') { event.preventDefault(); focusAt(i - 1); return; }
      if (event.key === 'ArrowRight') { event.preventDefault(); focusAt(i + 1); return; }
      if (event.key === ' ' || event.key === 'Enter') event.preventDefault();
    });
    box.addEventListener('input', () => {
      const letter = (box.value || '').toLowerCase().replace(/[^a-z]/g, '');
      box.value = letter.slice(-1);
      if (!box.value) return;
      const i = indexOf(box);
      if (i < boxes.length - 1) focusAt(i + 1);
      else check();
    });
  });
})();
