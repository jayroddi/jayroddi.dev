// The log folds the same title and author into one tile. No network.
import fs from 'fs';
import assert from 'assert';

const src = fs.readFileSync(new URL('../site/log/log.js', import.meta.url), 'utf8');
const start = src.indexOf('function fold(');
const end = src.indexOf('function groupKey(');
assert.ok(start > 0 && end > start, 'dedupe functions are in log.js');
const api = new Function(src.slice(start, end) + '\nreturn { fold, dedupeItems, dedupeLog };')();
const { dedupeItems, dedupeLog } = api;

function book(t, a, extra = {}) {
  return Object.assign({ c: 'books', t, a, d: '2024-06-20', r: null, img: 'cover.jpg', blurb: null }, extra);
}

const swapped = book('Ryan Holiday', 'Right Thing Right Now', { i: 'swapped', img: 'short.jpeg', r: '★★★★☆' });
const full = book('Right Thing, Right Now: Justice in an Unjust World', 'Ryan Holiday', { i: 'full', img: 'long.jpg' });
const folded = dedupeItems([swapped, full]);
assert.equal(folded.length, 1);
assert.equal(folded[0].t, full.t);
assert.equal(folded[0].a, 'Ryan Holiday');
assert.equal(folded[0].r, '★★★★☆');
assert.equal(folded[0].img, 'long.jpg');

const punct = dedupeItems([
  book('Right Thing Right Now', 'Ryan Holiday', { i: 'short' }),
  book('Right Thing, Right Now', 'Ryan Holiday', { i: 'comma' })
]);
assert.equal(punct.length, 1);
assert.equal(punct[0].a, 'Ryan Holiday');

const editions = dedupeItems([
  book('I Will Teach You to Be Rich', 'Ramit Sethi'),
  book('I Will Teach You to Be Rich, 2nd Edition', 'Ramit Sethi')
]);
assert.equal(editions.length, 2);

const sequels = dedupeItems([
  { c: 'movies', t: '101 Dalmatians (1996)', a: null },
  { c: 'movies', t: '101 Dalmatians (1961)', a: null },
  { c: 'albums', t: 'American Idiot', a: 'Green Day' },
  { c: 'albums', t: 'American Idiot (20th Anniversary)', a: 'Green Day' },
  { c: 'books', t: 'Inward', a: 'Yung Pueblo' },
  { c: 'books', t: 'The Way Forward (The Inward Trilogy)', a: 'Yung Pueblo' }
]);
assert.equal(sequels.length, 6);

const media = JSON.parse(fs.readFileSync(new URL('../site/log/media.json', import.meta.url), 'utf8'));
const once = dedupeLog(media);
assert.equal(once.items.length, media.items.length);
assert.equal(once.items.filter((item) => item.c === 'books').length, 111);
assert.equal(once.items.some((item) => /rooks/i.test(item.a || '') || /fighting for your marriage/i.test(item.t || '')), false);
const holiday = once.items.filter((item) => /right thing/i.test(item.t) || /right thing/i.test(item.a || ''));
assert.equal(holiday.length, 1);
assert.equal(holiday[0].t, 'Right Thing, Right Now: Justice in an Unjust World');
assert.equal(holiday[0].a, 'Ryan Holiday');
const booksChip = once.filters.find((filter) => filter.c === 'books');
assert.equal(booksChip.n, 111);
assert.equal(once.filters.find((filter) => filter.c === 'all').n, 473);
const boy = once.items.filter((item) => item.t === 'The Boy Who Was Raised as a Dog');
assert.equal(boy.length, 1);
assert.equal(boy[0].a, 'Bruce D. Perry & Maia Szalavitz');
assert.equal(boy[0].d, '2026-11-06');
assert.equal(boy[0].c, 'books');
assert.equal(boy[0].r, null);
assert.equal(boy[0].blurb, null);
assert.equal(once.items[0].i, 'books-the-boy-who-was-raised-as-a-dog-2026-11-06-f2e6d7');
assert.equal(once.items[1].t, 'Godzilla Minus Zero');

const withTwin = dedupeLog({
  filters: media.filters,
  items: [swapped, ...media.items]
});
assert.equal(withTwin.items.length, media.items.length);
assert.equal(withTwin.items.filter((item) => item.i === 'swapped').length, 0);
assert.equal(withTwin.items.filter((item) => /right thing/i.test(item.t)).length, 1);
assert.equal(withTwin.filters.find((filter) => filter.c === 'books').n, 111);

const rooks = dedupeItems([
  book('Fighting For Your Marriage While Separated', 'Linda Rooks', { i: 'rooks' }),
  book('Linda Rooks', 'Fighting for Your Marriage While Separated: A Guide', { i: 'rooks-swap' }),
  book('Ego Is the Enemy', 'Ryan Holiday', { i: 'ego' })
]);
assert.equal(rooks.length, 1);
assert.equal(rooks[0].i, 'ego');

const keptIds = new Set(once.items.map((item) => item.i));
for (const title of [
  'Ego Is the Enemy',
  'Courage Is Calling: Fortune Favors the Brave',
  'Discipline Is Destiny: The Power of Self-Control',
  'The Obstacle Is the Way',
  'Growth Hacker Marketing'
]) {
  assert.ok(once.items.some((item) => item.t === title && item.a === 'Ryan Holiday'), title);
}
assert.equal(keptIds.size, once.items.length);

console.log('log dedupe ok');
