# welcome shell

A mock of a jayroddi.dev shell. It is not the live site. Nothing here is linked from `site/`. GitHub Pages only uploads `site/`, so this folder does not deploy.

From the repo root:

```
python3 -m http.server 8766
```

Open http://127.0.0.1:8766/mocks/welcome-shell/

The page reads the quote file, the habit json, the snaps manifest, the playlist, and the shelf from `site/`. Those paths are rewritten in the mock so a server rooted at the repo can see them. There is no sound.

## what you get

Welcome does not scroll. The greeting is fixed copy. Under it is today's quote in America/Chicago, dated the way `/quotes` dates a line (`2026.11.01`), with the words and the name in the same sizes and colours as that page.

The pill is the nav: grind, snaps, music, books, quotes, social. A tab shows that page. The title in the mast comes back to welcome. The page bodies are the live markup and the live scripts (`habits.js`, `snaps.js`, `music.js`, `books.js`), with the hamburger left off because the pill replaces it.

Behind every page is a field of empty teal squares. On a desktop the field is stronger in the gutters and quieter under the column. On a phone it stays soft across the screen. Six of the gutter squares blink on the same 1.2s opacity pulse as the live today cell. They stay out of the column, so they never sit on the type or inside a real habit grid.

## what was scrapped

The earlier mock in this PR was a scrolling theater: parallax hero, word-by-word manifesto, keycaps, a case of squares you pull out, a pixel wipe, and a sound pill. That is gone. This folder replaces `mocks/motion-portfolio/`.
