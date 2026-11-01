/* fills the today strip on mock B and marks the page ready once the grids have numbers. */
(() => {
  function short(name, label){
    const text = (label || '').replace(/\s*·\s*today\s*$/, '');
    if (!text || /no record/.test(text)) return '—';
    if (name === 'steps'){
      const m = text.match(/([\d,]+)\s+steps/);
      return m ? m[1] : '—';
    }
    if (name === 'sleep'){
      const m = text.match(/score\s+(\d+)/);
      return m ? m[1] : '—';
    }
    if (name === 'workouts'){
      const m = text.match(/(\d+)\s+exercise min/);
      return m ? m[1] + 'm' : '—';
    }
    if (name === 'faith'){
      const m = text.match(/:\s*(\d+|no)\b/);
      if (!m || m[1] === 'no') return '—';
      return m[1] === '5' ? 'full' : m[1];
    }
    const n = text.match(/^(\d+)/);
    return n ? n[1] : '—';
  }
  function fillToday(){
    const row = document.querySelector('.today-row');
    if (!row) return;
    row.replaceChildren();
    document.querySelectorAll('.tracker').forEach(section => {
      const name = section.getAttribute('aria-label') || '';
      const cell = section.querySelector('.cell.today');
      const li = document.createElement('li');
      const sl = document.createElement('span');
      sl.className = 'sl';
      sl.textContent = name;
      const sv = document.createElement('b');
      sv.className = 'sv';
      sv.textContent = short(name, cell && cell.getAttribute('aria-label'));
      li.append(sl, sv);
      row.appendChild(li);
    });
  }
  function ready(){
    const totals = [...document.querySelectorAll('.tracker [data-k="total"]')];
    if (totals.length < 5) return false;
    if (totals.some(el => el.textContent === '0' || el.textContent === '—')) return false;
    return !!document.querySelector('.cell[data-lv="1"], .cell[data-lv="2"], .cell[data-lv="3"], .cell[data-lv="4"], .cell[data-lv="5"]');
  }
  function tick(){
    if (!ready()){ setTimeout(tick, 50); return; }
    if (document.body.classList.contains('mock-b')) fillToday();
    document.documentElement.dataset.mock = 'ready';
  }
  tick();
})();
