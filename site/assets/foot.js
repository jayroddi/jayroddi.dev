/* v2.83: no social row. the header title toggles speed and pulses in the speed colour.
   v2.82: left icon line is wolf, github, spotify, email. right icon line is x, instagram, threads, linkedin.
   v2.81: the nav lines come first, then the two icon lines (wolf through x, then github through email).
   v2.80: under the header the row is two lines, wolf through x on the left, github through email on the right.
   v2.78: order after the wolf: threads, instagram, x, github, spotify, linkedin, email.
   v2.79 (jay 2026.10.20): email is hi@jayroddi.lol (icloud).
   v2.78: the wolf is a <button aria-label="switch speed"> that calls JayRain.toggle(); no link.
   v2.77: the grids page is /me/ (/habits/ redirects); on / the wolf links to /me/.
   v2.76: the pulsing ninja is capri's wolf (wolf-r3), inline; only the bandana is currentColor = the speed colour --c. same links, size and pulse.
   v2.75: version bump with the new header (byline + snaps // quotes // habits nav, css 2.68).
   v2.74: github is jayroddi (the account rename from jaythaninja).
   v2.73: order after the ninja: github, spotify, threads, instagram, x, linkedin, email.
   v2.72: / is the snaps page and the grids moved to /habits/. on / the ninja links to /habits/; on every other page it links home.
   v2.71: spotify links to jay's profile (user/1238911903), not the playlist.
   v2.70: threads is back (@jayroddi). order after the ninja: instagram, threads, x, github, spotify, linkedin, email.
   v2.69: /quotes is back (unlinked); its ninja links home like on /snaps.
   v2.68: on /snaps the ninja links home (same tab); everywhere else it links to /snaps.
   v2.67: linkedin is jayroddi too.
   v2.66: x and instagram are jayroddi again. github stays jaythaninja.
   v2.65: the ninja links to /snaps (jay's hidden photography) instead of /now/.
   v2.64: threads and strava are gone from the row. the rest stay evenly spaced.
   v2.22: the homepage line above this row is the text in /header.json.
   v2.18 (jay 2026.10.11): the homepage puts this row in header.mast, above the grids, as the title.
   every other page still gets it in the footer. the homepage footer keeps its signup and konami pad, so a footer
   with a pad is not replaced. the cartoon ninja is first (a quiet link to /habits/ from /, and home from every other page), then the 7 icons.
   colours follow the page states (--c / --f). a page with a typing intro sets data-intro="on" on <html>; rain.js marks
   the page when that intro finishes and the ninja pulses (rain.css). a page with no intro pulses once it has loaded. */
(() => {
const foot = document.querySelector('footer.foot');
if (!foot || foot.dataset.built) return; foot.dataset.built = '1';
const lineEl = document.querySelector('.mast .line');
if (lineEl) fetch('/header.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject()).then(d => {
  if (lineEl.isConnected && d && typeof d.line === 'string') lineEl.textContent = d.line;
}).catch(() => {});
// v2.83: the title is the speed switch (teal <-> orange). the social row is gone.
const title = document.querySelector('.mast .pages');
if (title) title.addEventListener('click', () => { if (window.JayRain && JayRain.toggle) JayRain.toggle(); });
// v1.99: typing pages set data-intro="on" and call JayRain.introDone() when the caret would have stayed.
// a page with no intro starts the title pulse once it has loaded.
const armPulse = () => {
  const root = document.documentElement;
  if (root.classList.contains('intro-done') || root.dataset.intro === 'on') return;
  if (window.JayRain && typeof JayRain.introDone === 'function') JayRain.introDone();
  else root.classList.add('intro-done');
};
if (document.readyState === 'complete') armPulse();
else addEventListener('load', armPulse, {once: true});
})();
