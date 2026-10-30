# jayroddi.dev

Personal site. The repository is still named `jaytha.ninja`. The live site is [https://jayroddi.dev](https://jayroddi.dev). `jaytha.ninja` forwards through [jayroddi/jaytha-ninja-redirect](https://github.com/jayroddi/jaytha-ninja-redirect), which sends every path, query, and hash to jayroddi.dev.

`site/CNAME` is `jayroddi.dev`. Pushes to `main` deploy `site/` to GitHub Pages (`.github/workflows/pages.yml`).

The homepage is the snaps photo grid. The ground is plain and follows the system: black when the system is dark, white when it is light (`prefers-color-scheme`). There is no mist, no gradient, and no matrix rain on `/`.

In order:

1. `✌️🤟🤙 // jayroddi.dev // 🇺🇸🇯🇵🇳🇿`. Only `jayroddi.dev` is teal `#1AADB3`. Each `//` is the system foreground (`--fg`: white in dark, black in light). The emoji keep their own colour. The title is italic. It does not pulse or glow. It is a link to `/daily`, the quote feed. There is no underline. The space under the title matches the space under the teal subtitle (`--habit-gap`, 16px). On a narrow screen the line wraps between those pieces, and `jayroddi.dev` stays on one line.
2. A teal page subheader, one emoji and no words, brand teal `#1AADB3`, italic, 11px at every width (also 11px under 360px). `/` is `📷`. `/daily/` is `🗓️`. `/music/` is `🎧`. `/books/` is `📚`. `/quotes/` is `💬`. `/habits/` is `🗓️`.
3. On `/`, the photo grid. The habit grids (code, workouts, steps, sleep, faith) live on `/habits/`.

A menu button is vertically centered on the title block, at the right edge of the content column, on `/` and on every page that shares this header, on a wide screen and on a phone. The icon centers on the title block. It is three short lines in teal `#1AADB3`. A tap opens a small panel, not a full-screen menu: snaps, music, books, quotes, habits, then `@jayroddi`. Daily is not in the menu. Page links stay teal. `@jayroddi` follows the system (white in dark, black in light) and links to https://x.com/jayroddi. The hamburger is teal `#1AADB3`. Snaps points at `/`. Habits is the last page link, immediately before `@jayroddi`. The current page is underlined. Escape and a click outside close it. There is no center nav, email field, konami row, or social icon row.

`/music/`, `/books/`, `/quotes/`, and `/habits/` open from that menu. `/snaps/` forwards to `/`. `/me/` forwards to `/habits/`. `/daily/` is the quote feed (the same list as `/quotes/`). `/confirmed/` still opens by URL. Each page starts with the same header: the italic title `✌️🤟🤙 // jayroddi.dev // 🇺🇸🇯🇵🇳🇿`, then the hamburger, then that page’s emoji subheader. The nightly sync still updates snaps and the playlist.

## snaps

`/` is the photo grid (`site/index.html`). `/snaps/` forwards there. `python3 scripts/sync_snaps.py` reads the public Lightroom album and writes `site/snaps/`. Images stay on Adobe. Nothing with a location is stored.

`site/snaps/snaps.json` is the index (`base`, `key`, and `months`, newest first). Each month is `site/snaps/m/YYYY-MM.json`, newest first. A photo is `{i, v, d, a, w, h, t, s, l, c}`: asset id, revision, Chicago date, capture time, oriented width and height, the 640 / 1280 / 2048 rendition ids, and a dominant color from the 640 JPEG. `a` is that capture clock tagged America/Chicago (`2026-10-25T07:33:00-05:00`). Each tile stamps it in the bottom-right as `2026.10.25 // 7:33am`, italic mono, readable without covering the photo. The lightbox repeats that line, centered under the photo. A photo with no time shows the date only. `scripts/snaps_colors.json` remembers those colors so the next run does not download an unchanged rendition.

The old grid asked for the 640 rendition and offered the 1280 in `srcset`. The lightbox used the 2048.

## music

`/music/` is the playlist page. `site/music/playlist.json` is the playlist file. The playlist is `forgot about jay`, id `2gnGKUyfcjB5aecShkH33N`, https://open.spotify.com/playlist/2gnGKUyfcjB5aecShkH33N. A tile opens that playlist with the track named: `https://open.spotify.com/playlist/2gnGKUyfcjB5aecShkH33N?highlight=spotify:track:{id}`. The file still stores the bare track url. `https://open.spotify.com/track/{id}?context=spotify:playlist:…` is the other context form, and the web player still shows the track page for it, so the tiles do not use it.

`python3 scripts/spotify_playlist.py site/music/playlist.json` refreshes that file from the Spotify Web API. It needs `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN`. Without the refresh token it exits 0 and leaves the file alone. It writes only when the tracks change (`fetched` is not enough).

## books

`/books/` is the shelf. `site/books/books.json` and `site/books/covers/` stay in the repo. `site/books/books.js` groups covers by read year, newest year first, newest read first inside a year. A read of `YYYY-MM` (no day) sorts after every full date in that month. A book with no read date would land in a final `no date` group. A book with `"glow": "gold"` gets the pulsing gold border (`glow-gold`, an explicit top recommendation). `"glow": "orange"`, `"teal"`, or `"favorite"` gets the pulsing orange border (`glow-orange`, a favorite).

`python3 scripts/books_import.py site/books/books.json [goodreads.csv]` rebuilds the file and `site/books/covers/` from a Goodreads export. Ids listed in `scripts/books_hidden.json` are dropped. Covers in `scripts/books_cover_overrides.json` replace the Open Library fetch.

## quotes

`/quotes/` is the quote list. `site/quote-of-the-day/quotes.json` stays in the repo, newest first. One object per day, and only these fields:

```json
{"date": "YYYY-MM-DD", "text": "the quote", "author": "Name"}
```

`date` is America/Chicago. `/quotes/` and `/daily/` read that file. `/quote-of-the-day/` still forwards home. The homepage header is the title in `site/index.html`. It does not rotate.

A new object in `quotes.json` is still just a commit. Nothing on the homepage reads that file.

## habits

The grids are on `/habits/` (`site/habits/index.html`). `/me/` forwards there. `/` is snaps. `/daily/` is the quote feed. The grids, in order:

| grid | file | what a cell is |
|---|---|---|
| code | `site/habits/cursor.json` | one day's total: commits + pull requests opened + pull requests merged + AI line edits + ride points + journal thinking + non-cycling workouts. Colour steps are fixed at 2 / 8 / 14 / 24. |
| workouts | `site/habits/workouts.json` | that day's Apple exercise minutes. The heading is workouts. The file name stays `workouts.json`. Colour steps are the `intensity.edges` in the file (14 / 29 / 59 / 89). |
| steps | `site/habits/steps.json` | that day's step count. Fixed cuts: 2,500 / 5,000 / 7,500 / 10,000. |
| sleep | `site/habits/sleep.json` | the 0–100 score (duration 50, bedtime consistency 30, interruptions 20) and minutes asleep. Colour steps are the 20th / 40th / 60th / 80th of the nonzero nights on screen. A streak is nights scoring 70 or more. A past night with no record stays empty. |
| faith | `site/habits/faith.json` | from `start` through the day before `full`, the span splits into four levels. From `full` through today (America/Chicago) each day is a full cell, unless the date is in `no`. The browser fills a new day, so the grid moves forward without a commit. |

The journal grid is hidden. Its section is commented out on `/habits/`, and `journal` is `"enabled": false` in `site/habits/trackers.json`. `journal.json` and `journal-jarvis.json` stay in the repo.

`python3 scripts/habits.py all` rebuilds `cursor.json` from GitHub. Dates are author dates in America/Chicago. Merge commits are skipped. A pull request counts on the day it was opened and again on the day it merged. AI line edits come from `site/habits/cursor-lines.json` and are not fetched. The Pages workflow runs this before upload and still deploys if the fetch fails. A private repo needs `HABITS_GITHUB_TOKEN`. `python3 scripts/habits.py check` checks the schema and does not use the network.

Workouts, steps, and sleep are committed JSON. This repo does not fetch Apple Health or Strava on a schedule.

Old `/habits/YYYY-MM-DD/` addresses redirect to `/`.

## nightly sync

`.github/workflows/snaps.yml` runs four times a day on the America/Chicago clock: 6:00am, noon, 6:00pm, and midnight, including weekends. Actions cron is UTC, so each local hour is listed twice (CDT and CST). The first step runs a scheduled cron only when it matches the current Chicago offset for that hour, from the cron that queued the run rather than the clock, so a late delivery still syncs once and the other offset does not. A manual dispatch always runs.

That job syncs the Lightroom album, then the Spotify playlist. A Spotify failure does not block the photo sync. It commits `site/snaps/`, `scripts/snaps_colors.json`, and `site/music/playlist.json` only when something changed, then starts the Pages deploy.

`.github/workflows/pages.yml` deploys on every push to `main`, on manual dispatch, and on `2,32 5,6 * * *` (just after midnight Chicago, both CDT and CST). Before upload it refreshes `cursor.json` and runs `python3 scripts/make_cards.py flip`, which copies a staged `og-next/` into `site/og/` once that date has started in Chicago. Either step can fail without blocking the deploy.

The quote file is the commit described above, not a step in `snaps.yml`, and the homepage does not show it.

## what the homepage leaves off

No Buttondown field, no konami row, no social icons, no matrix rain, and no teal/orange toggle on `/`. `/confirmed/` is the signup page again. The homepage does not load `rain.js` and has no `#rain` canvas.
