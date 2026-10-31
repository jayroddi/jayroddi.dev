/* v3: teal until today's snaps puzzle is solved, then gold until midnight
   America/Chicago. no orange step. the mast title is not a control.
   a stored jtn.accent pick is cleared. light and dark follow the system. */
(function () {
  var KEY = 'jtn.snaps.unlock';
  var day = chicagoDay(new Date());

  function chicagoDay(now) {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now);
    var g = function (type) {
      var part = parts.find(function (p) { return p.type === type; });
      return part ? part.value : '';
    };
    return g('year') + '-' + g('month') + '-' + g('day');
  }

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function solved() {
    return read() === chicagoDay(new Date());
  }

  function paint() {
    try { localStorage.removeItem('jtn.accent'); } catch (e) {}
    var root = document.documentElement;
    if (solved()) root.dataset.accent = 'gold';
    else delete root.dataset.accent;
  }

  function emit() {
    window.dispatchEvent(new CustomEvent('jtn-accent', {
      detail: { solved: solved(), day: chicagoDay(new Date()) }
    }));
  }

  function unlock() {
    var today = chicagoDay(new Date());
    try { localStorage.setItem(KEY, today); } catch (e) {}
    day = today;
    paint();
    emit();
  }

  function tick() {
    var next = chicagoDay(new Date());
    if (next === day) return;
    day = next;
    paint();
    emit();
  }

  paint();
  setInterval(tick, 30000);
  document.addEventListener('visibilitychange', tick);

  window.JayAccent = {
    today: function () { return chicagoDay(new Date()); },
    solved: solved,
    unlock: unlock
  };
})();
