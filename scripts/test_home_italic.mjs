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
assert.match(html, /chain\.css\?v=6/);
assert.match(html, /chain\.js\?v=3/);
assert.match(html, /shell\.css\?v=43/);
assert.match(html, /shell\.js\?v=25/);
assert.match(html, /<span class="noun">thoughts<\/span>/);
assert.match(html, /<span class="carry destiny">destiny<\/span>/);
assert.match(html, /<li><span class="gold">don't take today off<\/span><\/li>/);
const habitsCss = readFileSync(new URL('../site/habits/habits.css', import.meta.url), 'utf8');
assert.match(habitsCss, /\.cell\.today:not\(\.sweep\)\{background:#FFD700/);
assert.doesNotMatch(html, /hero-title|discipline is destiny|class="heart"|scroll-hint|location\.replace/);
const chainCss = readFileSync(new URL('../site/assets/chain.css', import.meta.url), 'utf8');
const chainJs = readFileSync(new URL('../site/assets/chain.js', import.meta.url), 'utf8');
assert.match(chainCss, /\.chain,[\s\S]*font-family: var\(--mono/);
assert.match(chainCss, /\.chain,[\s\S]*font-size: 12px/);
assert.match(chainCss, /\.chain,[\s\S]*font-weight: 500/);
assert.match(chainCss, /\.chain,[\s\S]*font-style: italic/);
assert.match(chainCss, /\.chain \{[\s\S]*color: #fff;/);
assert.match(chainCss, /\.chain \.noun,\s*\n\.chain \.carry \{\s*\n  color: #1AADB3;/);
assert.match(chainCss, /\.chain \.carry\.destiny,\s*\n\.chain \.gold \{\s*\n  color: #FFD700;/);
assert.match(chainJs, /classList\.contains\('gold'\)/);
assert.match(chainJs, /park\(tail, 'after'\)/);
assert.match(chainCss, /\.chain li:last-child \{\s*\n  margin-top: 1\.55em;/);
assert.match(chainCss, /width: \.58em;\n  height: 1\.08em;/);
assert.match(chainCss, /animation: chain-blink 1\.05s infinite/);
assert.match(chainCss, /background: #FFD700;/);
assert.match(chainCss, /\.chain-caret \{\s*\n[^}]*background: #1AADB3;/);
assert.match(chainJs, /\(5000 - beatTotal\)/);
assert.doesNotMatch(chainJs, /class="heart"|popHeart|hero-title/);
assert.doesNotMatch(grind, /chain\.js|ol class="chain"/);
assert.match(quotes, /<section id="quotes" class="home-quotes">/);
assert.match(quotes, /<blockquote class="q">a life that looks good or sounds good is nothing compared to a life that feels good<\/blockquote>/);
assert.match(quotes, /<p class="by">-jay shetty<\/p>/);
assert.doesNotMatch(quotes, /jim rohn|five people you spend/);
assert.match(css, /\.home-quotes \.pin \.q \{[^}]*text-align: center/);
assert.match(quotes, /<ol class="quotes" aria-label="quotes"><\/ol>/);
const feed = readFileSync(new URL('../site/quote-of-the-day/quotes.json', import.meta.url), 'utf8');
assert.doesNotMatch(feed, /jim rohn|five people you spend|jay shetty|a life that looks good/);
const quotesJson = JSON.parse(feed);
const rowling = "and so rock bottom became the solid foundation on which I rebuilt my life. you might never fail on the scale I did, but some failure in life is inevitable. it is impossible to live without failing at something, unless you live so cautiously that you might as well not have lived at all – in which case, you fail by default.";
assert.equal(quotesJson[0].date, '2026-11-13');
assert.equal(quotesJson[0].text, rowling);
assert.equal(rowling.length, 323);
assert.equal(quotesJson[0].author, 'jk rowling');
assert.equal(quotesJson[0].url, 'https://news.harvard.edu/gazette/story/2008/06/text-of-j-k-rowling-speech/');
assert.equal(quotesJson[1].date, '2026-11-12');
assert.equal(quotesJson[1].author, 'Naval Ravikant');
const visible = (entry, day) => !!(entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.date) && entry.date <= day && (entry.text || entry.quote) && entry.author);
assert.equal(visible(quotesJson[0], '2026-11-12'), false);
assert.equal(visible(quotesJson[0], '2026-11-13'), true);
assert.match(shell, /entry\.date <= day/);
assert.match(shell, /link\.target = '_blank'/);
assert.match(shell, /link\.rel = 'noopener noreferrer'/);
assert.match(css, /a\.ext:visited \.q,\s*\nbody\.board \.home-quotes \.quotes a\.ext:visited \.by \{\s*\n  color: #FFD700;/);
assert.match(css, /text-decoration: underline;/);
assert.match(css, /body\.board \.home-quotes \.quotes \.q \{\s*\n  color: rgba\(244, 239, 230, \.78\);/);
assert.match(css, /body\.board \.home-quotes \.quotes \.by \{\s*\n  color: #1AADB3;/);
assert.doesNotMatch(quotes, /hero-title|class="subhead"|class="heart"|chain\.js/);
assert.match(shell, /fetch\('\/quote-of-the-day\/quotes\.json'/);

const nav = [
  "['/', '🤓', 'grind']",
  "['/snaps/', '📷', 'snaps']",
  "['/log/', '🍿', 'log']",
  "['/love/', '💛', 'love']",
  "['/quotes/', '📣', 'quotes']",
  "['/interwebs/', '🎭', 'interwebs']",
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
