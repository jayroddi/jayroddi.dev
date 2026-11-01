/* v3: the top-right menu. three lines, a short list, escape and a click outside close it.
   the list is grind, snaps, music, books, quotes, then @jayroddi. daily is not in it. */
(function () {
  const boot = () => {
    const root = document.querySelector('.site-menu');
    if (!root) return;
    const btn = root.querySelector('.menu-btn');
    const panel = root.querySelector('.menu-panel');
    if (!btn || !panel) return;
    const links = Array.prototype.slice.call(panel.querySelectorAll('a'));

    const norm = (p) => {
      p = (p || '').split('?')[0].split('#')[0].replace(/\/index\.html$/, '');
      if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
      return p || '/';
    };
    const here = norm(location.pathname);
    links.forEach((a) => {
      if (norm(a.getAttribute('href')) === here) a.setAttribute('aria-current', 'page');
    });

    const items = () => [btn].concat(links);
    const open = () => {
      panel.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      const current = panel.querySelector('[aria-current="page"]') || links[0];
      if (current) current.focus();
    };
    const close = (focusBtn) => {
      if (panel.hidden) return;
      const inside = panel.contains(document.activeElement);
      panel.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      if (focusBtn || inside) btn.focus();
    };

    btn.addEventListener('click', () => {
      if (panel.hidden) open();
      else close(false);
    });

    document.addEventListener('keydown', (e) => {
      if (panel.hidden) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close(true);
        return;
      }
      if (e.key !== 'Tab') return;
      const list = items();
      let i = list.indexOf(document.activeElement);
      if (i < 0) i = 0;
      e.preventDefault();
      const next = e.shiftKey ? (i - 1 + list.length) % list.length : (i + 1) % list.length;
      list[next].focus();
    });

    document.addEventListener('pointerdown', (e) => {
      if (panel.hidden || root.contains(e.target)) return;
      close(false);
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
