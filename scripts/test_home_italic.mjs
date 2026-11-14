/* Standing rule: every word on jayroddi.dev is italic.
   habits.css resets `* { font-style: normal }`, which beats inheritance,
   so the nav and the quote feed set italic on the element itself. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../site/assets/shell.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const quotes = readFileSync(new URL('../site/quotes/index.html', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../site/assets/shell.js', import.meta.url), 'utf8');
const grind = readFileSync(new URL('../site/grind/index.html', import.meta.url), 'utf8');
const habits = readFileSync(new URL('../site/habits/index.html', import.meta.url), 'utf8');
const me = readFileSync(new URL('../site/me/index.html', import.meta.url), 'utf8');

assert.match(css, /Standing rule: every word on jayroddi\.dev is italic/);
assert.match(css, /\* \{ font-style: normal \}/);
assert.match(css, /\.tabs a\.mark \{[^}]*font-style: italic/);
assert.match(css, /body\.board \.home-quotes \.quotes time,[\s\S]*font-style: italic/);
assert.match(css, /\.home-quotes \.pin \.q \{[^}]*color: #fff;/);
assert.match(css, /\.home-quotes \.pin \.by \{[^}]*color: #FFD700/);
assert.doesNotMatch(css, /chain-caret|hero-title|\.phrase /);

assert.match(html, /class="trackers"/);
assert.match(html, /class="board is-grind"/);
assert.match(html, /<ol class="chain">/);
assert.match(html, /chain\.css\?v=10/);
assert.match(html, /chain\.js\?v=7/);
assert.match(html, /shell\.css\?v=44/);
assert.match(html, /shell\.js\?v=30/);
assert.match(html, /<span class="noun">thoughts<\/span>/);
assert.match(html, /<span class="carry destiny">destiny<\/span>/);
assert.doesNotMatch(html, /don't take today off/);
const habitsCss = readFileSync(new URL('../site/habits/habits.css', import.meta.url), 'utf8');
assert.match(habitsCss, /\.cell\.today:not\(\.sweep\)\{background:#FFD700/);
assert.doesNotMatch(html, /hero-title|discipline is destiny|class="heart"|scroll-hint|location\.replace/);
const chainCss = readFileSync(new URL('../site/assets/chain.css', import.meta.url), 'utf8');
const chainJs = readFileSync(new URL('../site/assets/chain.js', import.meta.url), 'utf8');
assert.match(chainCss, /\.chain,[\s\S]*font-family: var\(--mono/);
assert.match(chainCss, /font-size: clamp\(8\.9px, calc\(2\.86vw - 1\.83px\), 12px\)/);
assert.match(chainCss, /\.chain li \{[^}]*white-space: nowrap/);
assert.match(chainCss, /@media \(max-width: 374px\) \{\s*\.chain li \{ white-space: normal; \}/);
assert.match(chainCss, /\.chain,[\s\S]*font-weight: 500/);
assert.match(chainCss, /\.chain,[\s\S]*font-style: italic/);
assert.match(chainCss, /\.chain \{[\s\S]*color: #fff;/);
assert.match(chainCss, /\.chain \.noun,\s*\n\.chain \.carry \{\s*\n  color: #1AADB3;/);
assert.match(chainCss, /\.chain \.carry\.destiny \{\s*\n  color: #FFD700;/);
assert.match(chainJs, /classList\.contains\('destiny'\)/);
assert.doesNotMatch(chainJs, /classList\.contains\('gold'\)/);
assert.match(chainJs, /caret\.remove\(\)/);
assert.doesNotMatch(chainJs, /is-parked|settle\(/);
assert.doesNotMatch(chainCss, /li:last-child/);
assert.match(chainCss, /width: \.58em;\n  height: 1\.08em;/);
assert.match(chainCss, /animation: chain-blink 1\.05s infinite/);
assert.doesNotMatch(chainCss, /is-parked/);
assert.doesNotMatch(chainJs, /animationName === 'today-cursor'/);
assert.match(habitsCss, /@keyframes today-cursor/);
assert.match(chainCss, /background: #FFD700;/);
assert.match(chainCss, /\.chain-caret \{\s*\n[^}]*background: #1AADB3;/);
assert.match(chainJs, /const span = 2300/);
assert.match(chainJs, /\(span - beatTotal\)/);
assert.match(chainJs, /await sleep\(\(60 \+ Math\.random\(\) \* 30\) \* span \/ 5000\)/);
assert.doesNotMatch(chainJs, /class="heart"|popHeart|hero-title/);
assert.doesNotMatch(grind, /chain\.js|ol class="chain"/);
assert.match(quotes, /id="viewport"/);
assert.match(quotes, /\/quotes\/mural\.jpg/);
assert.match(quotes, /\/quotes\/mural\.css\?v=7/);
assert.match(quotes, /\/quotes\/mural\.js\?v=5/);
assert.match(quotes, /<dialog id="quote"/);
assert.doesNotMatch(quotes, /home-quotes|jay shetty|class="pin"|<ol class="quotes"/);
assert.doesNotMatch(quotes, /jim rohn|five people you spend/);
assert.match(css, /\.home-quotes \.pin \.q \{[^}]*text-align: center/);
const muralJs = readFileSync(new URL('../site/quotes/mural.js', import.meta.url), 'utf8');
const muralCss = readFileSync(new URL('../site/quotes/mural.css', import.meta.url), 'utf8');
assert.match(muralJs, /STAR_REGION = "dark"/);
assert.match(muralJs, /codylarae\.read/);
assert.match(muralJs, /e\.date <= day/);
assert.doesNotMatch(muralJs, /link\.className = "ext"/);
assert.doesNotMatch(muralJs, /q\.url/);
assert.match(muralJs, /classList\.add\("is-today"\)/);
assert.doesNotMatch(muralJs, /gold-tooth|lightning/);
assert.match(muralJs, /\/quotes\/swoosh\.png/);
assert.match(muralJs, /SWOOSH_X = 1268 \/ 2800/);
assert.match(muralJs, /SWOOSH_Y = 655 \/ 1867/);
assert.match(muralJs, /aria-label", "nike swoosh"/);
assert.ok(muralJs.includes('you\\u2019re remembered for the rules you break\\n\\njust do it'));
assert.match(muralCss, /body\.is-quotes \.swoosh \{[\s\S]*width: 65px/);
assert.match(muralCss, /height: calc\(65px \* 232 \/ 513\)/);
assert.match(muralCss, /swoosh-pulse 1\.6s ease-in-out infinite/);
assert.match(muralCss, /drop-shadow\(0 0 24px rgba\(255, 215, 0, 0\.5\)\)/);
assert.doesNotMatch(muralCss, /opacity: 0\.82/);
assert.match(muralCss, /dialog\.is-swoosh blockquote \{[^}]*color: #FFD700/);
assert.match(muralCss, /dialog\.is-swoosh blockquote \{[^}]*text-align: center/);
const swooshPng = readFileSync(new URL('../site/quotes/swoosh.png', import.meta.url));
assert.ok(swooshPng.length > 1000);
assert.match(muralCss, /font-style: italic/);
assert.match(muralCss, /\.inner time \{[\s\S]*color: #1AADB3/);
assert.match(muralCss, /color: #FFD700/);
assert.match(muralCss, /prefers-reduced-motion: reduce/);
assert.match(muralCss, /body\.is-quotes\.is-welcome::after \{[^}]*content: none/);
assert.match(muralCss, /body\.is-quotes \.viewport \{[\s\S]*position: fixed/);
assert.match(muralCss, /height: 100dvh/);
assert.match(css, /body\.is-welcome::after \{[\s\S]*linear-gradient\(to top, #000 58px, transparent\)/);
assert.doesNotMatch(css, /body\.is-quotes\.is-welcome::after/);
const feed = readFileSync(new URL('../site/quote-of-the-day/quotes.json', import.meta.url), 'utf8');
assert.doesNotMatch(feed, /jim rohn|five people you spend|jay shetty|a life that looks good/);
const quotesJson = JSON.parse(feed);
const rowling = "and so rock bottom became the solid foundation on which I rebuilt my life. you might never fail on the scale I did, but some failure in life is inevitable. it is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all – in which case, you fail by default.";
assert.equal(quotesJson[0].date, '2026-11-13');
assert.equal(quotesJson[0].text, rowling);
assert.equal(rowling.length, 323);
assert.equal(quotesJson[0].author, 'jk rowling');
assert.deepEqual(Object.keys(quotesJson[0]), ['date', 'text', 'author']);
assert.equal(quotesJson[0].url, undefined);
assert.doesNotMatch(feed, /harvard\.edu|j-k-rowling-speech/);
assert.equal(quotesJson[1].date, '2026-11-12');
assert.equal(quotesJson[1].author, 'Naval Ravikant');
const visible = (entry, day) => !!(entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.date <= day && (entry.text || entry.quote) && entry.author);
assert.equal(visible(quotesJson[0], '2026-11-12'), false);
assert.equal(visible(quotesJson[0], '2026-11-13'), true);
assert.match(shell, /entry\.date <= day/);
assert.doesNotMatch(shell, /link\.className = 'ext'/);
assert.doesNotMatch(shell, /entry\.url/);
assert.doesNotMatch(css, /a\.ext/);
assert.doesNotMatch(muralCss, /a\.ext/);
assert.match(css, /body\.board \.home-quotes \.quotes \.q \{\s*\n  color: rgba\(244, 239, 230, \.78\);/);
assert.match(css, /body\.board \.home-quotes \.quotes \.by \{\s*\n  color: #1AADB3;/);
assert.doesNotMatch(quotes, /hero-title|class="subhead"|class="heart"|chain\.js/);
assert.match(shell, /fetch\('\/quote-of-the-day\/quotes\.json'/);

const nav = [
  "['/', '🤓', 'grind']",
  "['/snaps/', '📷', 'snaps']",
  "['/log/', '🍿', 'log']",
  "['/love/', '💛', 'love']",
  "['/interwebs/', '🎥', 'interwebs']",
  "['/quotes/', '✨', 'quotes']",
  "['/brain/', '🧠', 'brain']"
];
let at = -1;
for (const line of nav) {
  const found = shell.indexOf(line);
  assert.ok(found > at, line);
  at = found;
}
assert.doesNotMatch(shell, /👋|🗓️/);

const forward = 'location.replace("/" + location.search + location.hash)';
for (const page of [grind, habits, me]) {
  assert.match(page, new RegExp(forward.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(page, /class="trackers"|\/grind\//);
}

console.log('home italic rule ok');
