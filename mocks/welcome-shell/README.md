# welcome shell

A mock of a jayroddi.dev shell. It is not the live site. Nothing here is linked from `site/`. GitHub Pages only uploads `site/`, so this folder does not deploy.

From the repo root:

```
python3 -m http.server 8766
```

Open http://127.0.0.1:8766/mocks/welcome-shell/

The page reads the quote file, the habit json, the snaps manifest, the playlist, and the shelf from `site/`. Those paths are rewritten in the mock so a server rooted at the repo can see them. There is no sound. The `sound off` pill only relabels itself.

## home

Home does not scroll. It is one screen: a dense teal square field, stronger through the middle and faded at the top and bottom. The pill is home, grind, snaps, music, books, quotes, social. The active tab is white. Under it, `sound off`.

The center title is `hi, i'm jay`. Under it, on a soft patch, is only today's quote: the date (`2026.11.01`), a blank line, the words, a blank line, and the name. The rest of the field stays loud.

## other pages

A tab shows that live page (same markup and scripts, hamburger left off). Grind has no square field. Its background is the site black or white. The other pages keep the field, quieter under the content column than on home, and stronger in the desktop gutters. On a phone that field stays soft across the screen.

Six squares blink on the same 1.2s opacity pulse as the live today cell, on the pages that still show the field. On home they stay off the title and the quote. On the other field pages they stay in the gutters, out of the real habit grids. Grind has no field, so it has no blinkers.
