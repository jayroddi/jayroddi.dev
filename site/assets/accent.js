/* v2: accents stay teal (#1AADB3, the unset --c). the teal → orange → gold
   cycle is off, and the mast title is not a control. a stored pick is cleared
   so an older visit cannot recolor --c. dark mode stays locked. */
(function () {
  try { localStorage.removeItem('jtn.accent'); } catch (e) {}
  delete document.documentElement.dataset.accent;
})();
