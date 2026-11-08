// The log folds the same title and author into one tile. No network.
import fs from 'fs';
import assert from 'assert';

const src = fs.readFileSync(new URL('../site/log/log.js', import.meta.url), 'utf8');
const start = src.indexOf('function fold(');
const end = src.indexOf('function groupKey(');
assert.ok(start > 0 && end > start, 'dedupe functions are in log.js');
const api = new Function(src.slice(start, end) + '\nreturn { fold, dedupeItems, dedupeLog, matchesQuery };')();
const { dedupeItems, dedupeLog, matchesQuery } = api;

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
assert.equal(once.filters.find((filter) => filter.c === 'all').n, 479);
assert.equal(once.filters.find((filter) => filter.c === 'albums').n, 155);
const boy = once.items.filter((item) => item.t === 'The Boy Who Was Raised as a Dog');
assert.equal(boy.length, 1);
assert.equal(boy[0].a, 'Bruce D. Perry & Maia Szalavitz');
assert.equal(boy[0].d, '2026-11-06');
assert.equal(boy[0].c, 'books');
assert.equal(boy[0].r, null);
assert.equal(boy[0].blurb, null);
const motor = once.items.filter((item) => item.t === 'AMERICAN MOTOR SPORTS (420CC EDITION)');
assert.equal(motor.length, 1);
assert.equal(motor[0].a, 'Bilmuri');
assert.equal(motor[0].d, '2026-11-08');
assert.equal(motor[0].c, 'albums');
assert.equal(motor[0].r, null);
assert.equal(motor[0].blurb, null);
assert.equal(motor[0].glow, 'gold');
const see = once.items.filter((item) => item.t === 'You Can See Everything');
assert.equal(see.length, 1);
assert.equal(see[0].d, '2026-10-16');
assert.equal(see[0].c, 'movies');
assert.equal(see[0].a, null);
assert.equal(see[0].r, null);
assert.equal(see[0].blurb, null);
assert.equal(see[0].glow, 'gold');
assert.equal(see[0].img, 'movies-you-can-see-everything-2026-10-16-dd4467.jpg');
const odyssey = once.items.filter((item) => item.t === 'The Odyssey');
assert.equal(odyssey.length, 1);
assert.equal(odyssey[0].d, '2026-07-26');
assert.equal(odyssey[0].c, 'movies');
assert.equal(odyssey[0].a, null);
assert.equal(odyssey[0].r, null);
assert.equal(odyssey[0].blurb, null);
assert.equal(odyssey[0].glow, 'gold');
assert.equal(odyssey[0].img, 'movies-the-odyssey-2026-07-26-1df820.jpg');
assert.equal(motor[0].img, 'albums-american-motor-sports-420cc-edition-2026-11-08-1d5b69.jpg');
assert.equal(once.items[0].i, 'albums-american-motor-sports-420cc-edition-2026-11-08-1d5b69');
assert.equal(once.items[1].t, 'The Only Living Pickpocket in New York');

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

const raised = { t: 'The Boy Who Was Raised as a Dog', a: 'Bruce D. Perry & Maia Szalavitz' };
assert.equal(matchesQuery(raised, 'DOG'), true);
assert.equal(matchesQuery(raised, 'perry'), true);
assert.equal(matchesQuery(raised, 'szalavitz'), true);
assert.equal(matchesQuery(raised, 'boy dog'), true);
assert.equal(matchesQuery(raised, 'godzilla'), false);
assert.equal(matchesQuery({ t: "You Can't Please Everyone", a: 'Vex King' }, 'cant'), true);
assert.equal(matchesQuery({ t: 'Godzilla Minus Zero', a: null, blurb: "it's incredible" }, 'incredible'), false);
assert.equal(matchesQuery({ t: 'Godzilla Minus Zero', a: null }, ''), true);
assert.equal(matchesQuery({ t: 'Godzilla Minus Zero', a: null }, '   '), true);
assert.equal(once.items.length, 479);
assert.equal(once.items[0].t, 'AMERICAN MOTOR SPORTS (420CC EDITION)');

console.log('log dedupe ok');
