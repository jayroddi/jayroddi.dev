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

The center is the hands, `a/b tester of the year? 🎭`, and `america/chicago`. Under that, on a soft patch so the type stays readable, is the greeting and today's quote in America/Chicago, dated the way `/quotes` dates a line. The rest of the field stays loud.

## other pages

A tab shows that live page (same markup and scripts, hamburger left off). The same square field continues behind it, clearly quieter under the content column than on the home field, and stronger in the desktop gutters. On a phone the field stays soft across the screen.

Six squares blink on the same 1.2s opacity pulse as the live today cell. On home they sit in the open field, not under the title, the greeting, or the quote. On the other pages they stay in the gutters, out of the real habit grids.
