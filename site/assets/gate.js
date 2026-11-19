/* Riddle gate. The expected entry is not stored. Only its SHA-256 is. */
(() => {
  const KEY = 'jay-gate';
  const HASH = '9de96f89f90714c7c7936cafd5b8c3c15378da2fea4ca43d911f2341b34ead4b';
  const GROUPS = [7, 3, 3, 4];
  const root = document.documentElement;
  if (root.classList.contains('gate-open')) return;

  function track(name) {
    try { if (typeof gtag === 'function') gtag('event', name); } catch (e) {}
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
