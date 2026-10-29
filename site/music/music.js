/* music.js v0.2 (jay 2026.10.29): playlist cover grid. a tile opens the playlist with that track
   named (open.spotify.com/playlist/ID?highlight=spotify:track:ID). the web player stays on the
   playlist. track?context=spotify:playlist:ID still renders the track page there, so it is not used.
   playlist.json still stores the bare track url; the playlist id on that file builds the link.
   a url that is not a spotify track opens the playlist itself. */
(() => {
  const ol = document.querySelector('.covers');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const trackInPlaylist = (playlist, url) => {
    const id = playlist && playlist.id;
    const playlistUrl = (playlist && playlist.url) || (id ? 'https://open.spotify.com/playlist/' + id : '');
    const base = String(url || '').split('#')[0].split('?')[0];
    const track = (base.match(/\/track\/([A-Za-z0-9]+)$/) || [])[1];
    if (id && track) return 'https://open.spotify.com/playlist/' + id + '?highlight=spotify:track:' + track;
    return playlistUrl || base;
  };
  fetch('/music/playlist.json?v=0.1').then(r => r.json()).then(d => {
    const playlist = d.playlist || {};
    ol.innerHTML = d.tracks.map(t => `<li><a href="${esc(trackInPlaylist(playlist, t.url))}" target="_blank" rel="noopener" aria-label="${esc(t.name)} by ${esc(t.artists)}"><img src="${esc(t.cover)}" alt="" loading="lazy" decoding="async" width="300" height="300"><span class="cap">${esc(t.name.toLowerCase())} // ${esc(t.artists.toLowerCase())}</span></a></li>`).join('');
    let lp;   // long-press shows the caption (touch)
    ol.addEventListener('touchstart', e => { const a = e.target.closest('a'); if (!a) return; lp = setTimeout(() => { ol.querySelectorAll('a.show').forEach(x => x.classList.remove('show')); a.classList.add('show'); a.dataset.lp = 1; }, 420); }, {passive: true});
    ['touchend', 'touchmove', 'touchcancel'].forEach(t => ol.addEventListener(t, () => clearTimeout(lp), {passive: true}));
    ol.addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.dataset.lp) { e.preventDefault(); delete a.dataset.lp; } });
    ol.addEventListener('contextmenu', e => { if (e.target.closest('a')) e.preventDefault(); });
  }).catch(() => {});

  const canvas = document.getElementById('rain');
  if (canvas && window.JayRain){
    const T = [26, 173, 179], PALE_TEAL = [121, 205, 207], HEAD = [255, 255, 255], PALE_ORANGE = [255, 150, 121];
    const mob = () => document.documentElement.clientWidth < 760;
    const rain = JayRain.Rain(canvas, {
      fs: 16, fsMobile: 13, mono: '"JetBrains Mono", monospace', seed: 5, head: HEAD, headMix: .6,
      tint: T, paleTint: PALE_TEAL, paleOrange: PALE_ORANGE,
      palette: (x, w, r) => r < .84 ? T : PALE_TEAL,
      bands: (w, H) => [{y0: 0, y1: H, perCol: mob() ? 1.6 : 2.1, lenMin: 8, lenMax: 30, alpha: .56, stepMin: 60, stepMax: 170, colDensity: () => 1}],
      alphaAt: (x, y, R) => 1 - .45 * JayRain.smooth(R.H * .55, R.H, y),
      partSel: '.copy, .gallery, .foot', partPad: 50, partFloor: .25
    });
    JayRain.register(rain);
    document.fonts.ready.then(() => {
      rain.build();
      requestAnimationFrame(rain.frame);
    });
  }
})();
