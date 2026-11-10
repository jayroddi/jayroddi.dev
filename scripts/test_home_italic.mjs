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

const rule = css.slice(css.indexOf('.hero-title,'), css.indexOf('/* typewriter'));
for (const sel of [
  '.hero-title,',
  '.hero-title .name,',
  '.chain,',
  '.chain li,',
  '.chain .pre,',
  '.chain .noun,',
  '.chain .post,',
  '.chain .carry,',
  '.chain .ch,',
  '.chain-caret,',
  '.heart,',
  '.heart .em {'
]) {
  assert.ok(rule.includes(sel), sel);
}
assert.match(rule, /font-style:\s*italic/);
assert.match(css, /body\.board \.home-quotes \.quotes time \{\s*font-style: italic/);
assert.match(css, /\.chain \.noun,\s*\.chain \.carry \{\s*color: #1AADB3/);
assert.match(css, /\.chain \.carry\.destiny \{\s*color: #FFD700/);
assert.match(css, /\.chain-caret \{[^}]*background: #1AADB3/);
assert.match(html, /i'm <span class="name">jay<\/span>, and i build stuff w\/ my 💻/);
assert.doesNotMatch(html, /karnazes|home-note/);
assert.match(html, /<p class="heart">🇺🇸✌️🤟✞🤘🤙🏴‍☠️<\/p>/);
assert.match(html, /because they will become your&nbsp;<\/span><span class="carry">behaviors/);
assert.match(html, /<span class="noun">behaviors<\/span><span class="post">&nbsp;because they will become your/);
assert.doesNotMatch(html, /class="hero-sub"/);
assert.doesNotMatch(html, /localStorage|sessionStorage/);
assert.doesNotMatch(chain, /localStorage|sessionStorage|document\.cookie/);
assert.doesNotMatch(html, /paradox/);

console.log('home italic rule ok');
