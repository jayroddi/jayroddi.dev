/* v2: the accent stays teal. this clears a stored orange or gold pick
   (jtn.accent) and does not cycle. the mast title is not a control. */
(function () {
  try { localStorage.removeItem('jtn.accent'); } catch (e) {}
  delete document.documentElement.dataset.accent;
})();
