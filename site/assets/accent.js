/* v1: jayroddi.dev cycles the accent. teal is the default (no attribute).
   orange, then gold, then teal again. the pick stays in localStorage. */
(function () {
  var KEY = 'jtn.accent';
  var ORDER = ['teal', 'orange', 'gold'];

  function read() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function write(name) {
    try {
      if (!name || name === 'teal') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, name);
    } catch (e) {}
  }
  function apply(name) {
    var root = document.documentElement;
    if (name === 'orange' || name === 'gold') root.dataset.accent = name;
    else delete root.dataset.accent;
  }
  function current() {
    var name = document.documentElement.dataset.accent;
    return name === 'orange' || name === 'gold' ? name : 'teal';
  }

  apply(read());

  function bind() {
    var buttons = document.querySelectorAll('.mast .brand');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        var next = ORDER[(ORDER.indexOf(current()) + 1) % ORDER.length];
        apply(next);
        write(next);
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
