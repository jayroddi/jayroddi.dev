/* v2: accents stay teal (#1AADB3 in dark, #127F84 on white). the teal → orange → gold
   cycle is off, and the mast title is not a control. a stored pick is cleared
   so an older visit cannot recolor --c. light and dark follow the system. */
(function () {
  try { localStorage.removeItem('jtn.accent'); } catch (e) {}
  delete document.documentElement.dataset.accent;
})();
