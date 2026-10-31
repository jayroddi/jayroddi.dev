#!/usr/bin/env node
/* Rotation and encoding checks for the daily board. Does not print phrases. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'site/snaps/puzzle.js'), 'utf8');
const sandbox = { Intl, Date, atob, console };
sandbox.globalThis = sandbox;
vm.runInNewContext(code, sandbox);
const P = sandbox.JayPuzzle;
if (!P) throw new Error('JayPuzzle missing');

const bank = JSON.parse(fs.readFileSync(path.join(root, 'site/snaps/puzzles.json'), 'utf8'));
if (bank.epoch !== '2026-10-31') throw new Error('epoch');
if (bank.given !== 'RSTLNE') throw new Error('given');
if (!Array.isArray(bank.puzzles) || bank.puzzles.length !== 52) throw new Error('count ' + bank.puzzles.length);

const seen = new Set();
for (const row of bank.puzzles) {
  if (!row.category || !row.phrase) throw new Error('shape');
  const phrase = P.decode(row.phrase);
  if (!/^[A-Z]+(?: [A-Z]+)*$/.test(phrase)) throw new Error('alphabet');
  if (bank.puzzles.some(other => JSON.stringify(other).includes(phrase))) throw new Error('plaintext in bank');
  if (seen.has(phrase)) throw new Error('duplicate');
  seen.add(phrase);
  const letters = P.lettersOnly(phrase);
  if (letters.split('').every(ch => bank.given.includes(ch))) throw new Error('nothing to guess');
}

if (P.puzzleAt(bank.puzzles, bank.epoch, bank.epoch) !== bank.puzzles[0]) throw new Error('day 0');
const day51 = '2026-12-21';
if (P.daysBetween(bank.epoch, day51) !== 51) throw new Error('day 51 offset');
if (P.puzzleAt(bank.puzzles, day51, bank.epoch) !== bank.puzzles[51]) throw new Error('day 51');
if (P.puzzleAt(bank.puzzles, '2026-12-22', bank.epoch) !== bank.puzzles[0]) throw new Error('wrap');
if (P.chicagoDay(new Date('2026-11-01T04:59:00Z')) !== '2026-10-31') throw new Error('before midnight');
if (P.chicagoDay(new Date('2026-11-01T05:00:00Z')) !== '2026-11-01') throw new Error('midnight');
console.log('ok');
