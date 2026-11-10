/* Standing rule: every word on jayroddi.dev is italic.
   habits.css resets `* { font-style: normal }`, which beats inheritance,
   so homepage text has to set italic on the element itself. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../site/assets/shell.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');
const chain = readFileSync(new URL('../site/assets/chain.js', import.meta.url), 'utf8');

assert.match(css, /Standing rule: every word on jayroddi\.dev is italic/);
assert.match(css, /\* \{ font-style: normal \}/);

const rule = css.slice(css.indexOf('.hero-title,'), css.indexOf('/* The phrase uses'));
for (const sel of [
  '.hero-title,',
  '.hero-title .name,',
  '.phrase,',
  '.phrase .discipline,',
  '.phrase .plain,',
  '.phrase .destiny,',
  '.phrase .ch,',
  '.heart,',
  '.heart .em {'
]) {
  assert.ok(rule.includes(sel), sel);
}
assert.match(rule, /font-style:\s*italic/);
assert.match(css, /body\.board \.home-quotes \.quotes time \{\s*font-style: italic/);
assert.match(css, /\.phrase \.discipline \{ color: #1AADB3/);
assert.match(css, /\.phrase \.plain \{ color: #f4efe6/);
assert.match(css, /\.phrase \.destiny \{ color: #FFD700/);
assert.match(css, /--phrase-size: 18px/);
assert.match(css, /\.phrase \{[^}]*font-size: var\(--phrase-size\)/);
assert.match(css, /\.heart \{[^}]*font-size: clamp\(12\.5px, 3\.05vw, 38px\)/);
assert.match(css, /@media \(max-width: 720px\) \{\s*\.heart \{ font-size: clamp\(12\.5px, 4\.05vw, 28px\)/);
assert.match(css, /@media \(max-height: 760px\) \{\s*\.heart \{ font-size: clamp\(12\.5px, 3\.4vw, 30px\)/);
assert.doesNotMatch(css, /chain-caret/);
assert.match(html, /i'm <span class="name">jay<\/span>, and i build stuff w\/ my 💻/);
assert.match(html, /<p class="phrase"><span class="discipline">discipline<\/span><span class="plain"> is <\/span><span class="destiny">destiny<\/span><\/p>/);
assert.match(html, /<p class="heart">🇺🇸✌️🤟✞🤘🤙🏴‍☠️<\/p>/);
assert.doesNotMatch(html, /watch your|karnazes|home-note|class="hero-sub"|class="chain"|chain-caret|paradox/);
assert.doesNotMatch(html, /localStorage|sessionStorage/);
assert.doesNotMatch(chain, /localStorage|sessionStorage|document\.cookie|chain-caret/);
assert.match(chain, /#1AADB3/);
assert.match(chain, /#FFD700/);
assert.match(chain, /#f4efe6/);

console.log('home italic rule ok');
