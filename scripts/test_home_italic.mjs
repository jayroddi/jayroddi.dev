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
assert.match(css, /\.home-quotes \.pin \.by \{[^}]*color: #FFD700/);
assert.doesNotMatch(css, /chain-caret|hero-title|\.phrase /);

assert.match(html, /class="trackers"/);
assert.match(html, /class="board is-grind"/);
assert.doesNotMatch(html, /hero-title|discipline is destiny|class="heart"|chain\.js|scroll-hint|location\.replace/);
assert.match(quotes, /<section id="quotes" class="home-quotes">/);
assert.match(quotes, /<blockquote class="q">you are the average of the five people you spend the most time with\.<\/blockquote>/);
assert.match(quotes, /<p class="by">jim rohn<\/p>/);
assert.match(quotes, /<ol class="quotes" aria-label="quotes"><\/ol>/);
const feed = readFileSync(new URL('../site/quote-of-the-day/quotes.json', import.meta.url), 'utf8');
assert.doesNotMatch(feed, /jim rohn|five people you spend/);
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
