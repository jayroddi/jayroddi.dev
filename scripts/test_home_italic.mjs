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
assert.match(html, /chain\.css\?v=4/);
assert.match(html, /chain\.js\?v=2/);
assert.match(html, /<span class="noun">thoughts<\/span>/);
assert.match(html, /<span class="carry destiny">destiny<\/span>/);
assert.doesNotMatch(html, /hero-title|discipline is destiny|class="heart"|scroll-hint|location\.replace/);
const chainCss = readFileSync(new URL('../site/assets/chain.css', import.meta.url), 'utf8');
const chainJs = readFileSync(new URL('../site/assets/chain.js', import.meta.url), 'utf8');
assert.match(chainCss, /\.chain,[\s\S]*font-family: var\(--mono/);
assert.match(chainCss, /\.chain,[\s\S]*font-size: 12px/);
assert.match(chainCss, /\.chain,[\s\S]*font-weight: 500/);
assert.match(chainCss, /\.chain,[\s\S]*font-style: italic/);
assert.match(chainCss, /\.chain \{[\s\S]*color: #fff;/);
assert.match(chainCss, /\.chain \.noun,\s*\n\.chain \.carry \{\s*\n  color: #1AADB3;/);
assert.match(chainCss, /\.chain \.carry\.destiny \{\s*\n  color: #FFD700;/);
assert.match(chainCss, /width: \.58em;\n  height: 1\.08em;/);
assert.match(chainCss, /animation: chain-blink 1\.05s infinite/);
assert.match(chainCss, /background: #FFD700;/);
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
