/* Standing rule: every word on jayroddi.dev is italic.
   habits.css resets `* { font-style: normal }`, which beats inheritance,
   so homepage text has to set italic on the element itself. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../site/assets/shell.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('../site/index.html', import.meta.url), 'utf8');

assert.match(css, /Standing rule: every word on jayroddi\.dev is italic/);
assert.match(css, /\* \{ font-style: normal \}/);

const rule = css.slice(css.indexOf('.hero-title,'), css.indexOf('/* paradox chain'));
for (const sel of [
  '.hero-title,',
  '.hero-title .name,',
  '.hero-sub,',
  '.chain,',
  '.chain li,',
  '.chain .pre,',
  '.chain .noun,',
  '.chain .post,',
  '.chain .carry,',
  '.chain .ch,',
  '.chain-fly {'
]) {
  assert.ok(rule.includes(sel), sel);
}
assert.match(rule, /font-style:\s*italic/);
assert.match(css, /body\.board \.home-quotes \.quotes time \{\s*font-style: italic/);
assert.match(css, /\.chain \.noun,\s*\.chain \.carry \{\s*color: #1AADB3/);
assert.match(css, /\.chain \.carry\.destiny \{\s*color: #FFD700/);
assert.match(html, /<p class="hero-sub">navigating the messy middle i created for myself<\/p>/);
assert.doesNotMatch(html, /the best thing my 38 years have taught me/);
assert.match(css, /\.hero-sub \{[^}]*color: rgba\(244, 239, 230, \.72\)/);
assert.match(html, /my name is <span class="name">jay<\/span>, and i am a paradox</);
assert.doesNotMatch(html, /paradox\./);

console.log('home italic rule ok');
