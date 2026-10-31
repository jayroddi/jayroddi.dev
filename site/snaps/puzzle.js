/* Daily final board for the snaps page. RSTLNE starts filled. A letter guess
   reveals every copy of that letter. The whole phrase solves the day.
   The bank is /snaps/puzzles.json. Index 0 is epoch. Each next America/Chicago
   day takes the next phrase, then the list wraps. A solve stores that Chicago
   date in localStorage (jtn.snaps.unlock) and JayAccent turns the site gold
   until midnight. */
(function (root) {
  var GIVEN = 'RSTLNE';

  function chicagoDay(now) {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(now || new Date());
    var g = function (type) {
      var part = parts.find(function (p) { return p.type === type; });
      return part ? part.value : '';
    };
    return g('year') + '-' + g('month') + '-' + g('day');
  }

  function daysBetween(epoch, day) {
    var a = Date.parse(epoch + 'T00:00:00Z');
    var b = Date.parse(day + 'T00:00:00Z');
    if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
    return Math.round((b - a) / 86400000);
  }

  function puzzleAt(puzzles, day, epoch) {
    if (!puzzles.length) return null;
    var n = daysBetween(epoch, day);
    if (n < 0) n = 0;
    if (n < puzzles.length) return puzzles[n];
    return puzzles[n % puzzles.length];
  }

  function decode(text) {
    var raw = atob(text);
    var out = '';
    for (var i = 0; i < raw.length; i++) out += String.fromCharCode(raw.charCodeAt(i) ^ 0xA5);
    return out;
  }

  function lettersOnly(text) {
    return String(text || '').toUpperCase().replace(/[^A-Z]/g, '');
  }

  root.JayPuzzle = {
    GIVEN: GIVEN,
    chicagoDay: chicagoDay,
    daysBetween: daysBetween,
    puzzleAt: puzzleAt,
    decode: decode,
    lettersOnly: lettersOnly
  };

  if (!root.document) return;

  var boardEl = document.getElementById('final-board');
  var catEl = document.getElementById('final-cat');
  var form = document.getElementById('final-form');
  var input = document.getElementById('final-in');
  var noteEl = document.getElementById('final-note');
  if (!boardEl || !form || !input) return;

  var shownDay = '';
  var phrase = '';
  var known = {};

  function note(text) {
    if (noteEl) noteEl.textContent = text || '';
  }

  function reveal(ch) {
    known[ch] = true;
  }

  function fillGiven() {
    known = {};
    for (var i = 0; i < GIVEN.length; i++) reveal(GIVEN.charAt(i));
  }

  function solvedPhrase() {
    for (var i = 0; i < phrase.length; i++) {
      var ch = phrase.charAt(i);
      if (ch === ' ') continue;
      if (!known[ch]) return false;
    }
    return !!phrase;
  }

  function paint() {
    boardEl.replaceChildren();
    var words = phrase.split(' ');
    words.forEach(function (word) {
      var row = document.createElement('div');
      row.className = 'final-word';
      for (var i = 0; i < word.length; i++) {
        var ch = word.charAt(i);
        var tile = document.createElement('span');
        tile.className = 'final-tile' + (known[ch] ? ' on' : '');
        tile.textContent = known[ch] ? ch : '';
        tile.setAttribute('aria-hidden', 'true');
        row.appendChild(tile);
      }
      boardEl.appendChild(row);
    });
    var hidden = lettersOnly(phrase).split('').filter(function (ch) { return !known[ch]; }).length;
    boardEl.setAttribute('aria-label', hidden ? hidden + ' letters still hidden' : 'solved');
  }

  function showSolved() {
    for (var i = 0; i < phrase.length; i++) {
      var ch = phrase.charAt(i);
      if (ch !== ' ') reveal(ch);
    }
    paint();
    form.hidden = true;
    note('solved');
  }

  function guess(raw) {
    var text = String(raw || '').toUpperCase().replace(/\s+/g, ' ').trim();
    if (!text || !phrase) return;
    var only = lettersOnly(text);
    if (!only) return;
    if (only.length === 1) {
      var ch = only;
      if (known[ch]) {
        note('already up');
        input.value = '';
        return;
      }
      if (phrase.indexOf(ch) === -1) {
        note('nope');
        input.value = '';
        return;
      }
      reveal(ch);
      input.value = '';
      note('');
      paint();
      if (solvedPhrase()) finish();
      return;
    }
    if (only === lettersOnly(phrase)) {
      finish();
      return;
    }
    note('nope');
  }

  function finish() {
    showSolved();
    if (root.JayAccent) root.JayAccent.unlock();
  }

  function render(row, day) {
    phrase = decode(row.phrase);
    shownDay = day;
    if (catEl) catEl.textContent = row.category || '';
    var already = root.JayAccent && root.JayAccent.solved();
    if (already) {
      showSolved();
      return;
    }
    fillGiven();
    paint();
    form.hidden = false;
    note('');
  }

  function fail(message) {
    phrase = '';
    boardEl.replaceChildren();
    form.hidden = true;
    if (catEl) catEl.textContent = '';
    note(message);
  }

  function load() {
    var day = root.JayPuzzle.chicagoDay(new Date());
    fetch('/snaps/puzzles.json', {cache: 'no-cache'})
      .then(function (res) {
        if (!res.ok) throw new Error('puzzle');
        return res.json();
      })
      .then(function (data) {
        var puzzles = data && Array.isArray(data.puzzles) ? data.puzzles : [];
        var row = root.JayPuzzle.puzzleAt(puzzles, day, data.epoch || '2026-10-31');
        if (!row || typeof row.phrase !== 'string') throw new Error('puzzle');
        render(row, day);
      })
      .catch(function () { fail('puzzle unavailable'); });
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    guess(input.value);
  });

  window.addEventListener('jtn-accent', function (event) {
    var detail = event.detail || {};
    if (detail.day && detail.day !== shownDay) load();
  });

  load();
})(typeof window !== 'undefined' ? window : globalThis);
