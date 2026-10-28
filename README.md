# jayroddi.lol

Personal site. The repository is still named `jaytha.ninja`. The live site is [https://jayroddi.lol](https://jayroddi.lol). `jaytha.ninja` forwards through [jayroddi/jaytha-ninja-redirect](https://github.com/jayroddi/jaytha-ninja-redirect), which sends every path, query, and hash to jayroddi.lol.

`site/CNAME` is `jayroddi.lol`. Pushes to `main` deploy `site/` to GitHub Pages (`.github/workflows/pages.yml`).

The homepage is quiet. The ground is plain and follows the system: black when the system is dark, white when it is light (`prefers-color-scheme`, the same variables as before the quiet strip). There is no mist, no gradient, and no matrix rain on `/`.

In order:

1. `you can see everythi`. Teal (`--c`: `#1AADB3` in the dark theme, `#127F84` in the light theme). It does not pulse, glow, or change colour. It is not a control.
2. One James Clear line in that same teal, then his name in the quieter ink (`--ink-2`), which flips with the theme.
3. The habit grids: code, workouts, steps, sleep, faith. The labels and the filled cells use the same teal. Stats labels and values that are not teal flip with the theme.

Every visible word on the homepage is italic: the title, the quote, the name, the grid labels, the month and weekday captions, the less/more legend, and the stats.

A menu button sits on the title line, at the right edge of the content column, on `/` and on every page that shares this header, on a wide screen and on a phone. It is three short lines in `#FF4D1A`, the only orange on these pages. A tap opens a small panel, not a full-screen menu: daily, snaps, music, books, quotes. Daily is the homepage. The current page is underlined. `/me/` is not in the menu; the address still works. Escape and a click outside close it. There is no center nav, email field, konami row, or social row.

`/snaps/`, `/music/`, `/books/`, and `/quotes/` open from that menu. `/me/` and `/confirmed/` still open by URL. Each one starts with the same header as the homepage: the teal italic title, then the James Clear line and his name. Under that is that page’s own content. There is no second title line, no email field, no konami row, and no social row. The ground is plain (no mist) and follows the system the same way `/` does. `/habits/` still forwards to `/me/`. The nightly sync still updates snaps and the playlist.

## snaps

`/snaps/` is the photo grid (it was the homepage until the quiet strip). `python3 scripts/sync_snaps.py` reads the public Lightroom album and writes `site/snaps/`. Images stay on Adobe. Nothing with a location is stored.

`site/snaps/snaps.json` is the index (`base`, `key`, and `months`, newest first). Each month is `site/snaps/m/YYYY-MM.json`, newest first. A photo is `{i, v, d, a, w, h, t, s, l, c}`: asset id, revision, Chicago date, capture time, oriented width and height, the 640 / 1280 / 2048 rendition ids, and a dominant color from the 640 JPEG. `a` is that capture clock tagged America/Chicago (`2026-10-25T07:33:00-05:00`). Each tile stamps it in the bottom-right as `2026.10.25 // 7:33am`, italic mono, readable without covering the photo. The lightbox repeats that line, centered under the photo. A photo with no time shows the date only. `scripts/snaps_colors.json` remembers those colors so the next run does not download an unchanged rendition.

The old grid asked for the 640 rendition and offered the 1280 in `srcset`. The lightbox used the 2048.

## music

`/music/` is the playlist page. `site/music/playlist.json` is the playlist file.

`python3 scripts/spotify_playlist.py site/music/playlist.json` refreshes that file from the Spotify Web API. It needs `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN`. Without the refresh token it exits 0 and leaves the file alone. It writes only when the tracks change (`fetched` is not enough).

## books

`/books/` is the shelf. `site/books/books.json` and `site/books/covers/` stay in the repo. `site/books/books.js` groups covers by read year, newest year first, newest read first inside a year. A read of `YYYY-MM` (no day) sorts after every full date in that month. A book with no read date would land in a final `no date` group.

`python3 scripts/books_import.py site/books/books.json [goodreads.csv]` rebuilds the file and `site/books/covers/` from a Goodreads export. Ids listed in `scripts/books_hidden.json` are dropped. Covers in `scripts/books_cover_overrides.json` replace the Open Library fetch.

## quotes

`/quotes/` is the quote list. `site/quote-of-the-day/quotes.json` stays in the repo, newest first. One object per day, and only these fields:

```json
{"date": "YYYY-MM-DD", "text": "the quote", "author": "Name"}
```

`date` is America/Chicago. `/quotes/` reads that file. `/quote-of-the-day/` still forwards home. The homepage quote is the James Clear line in `site/index.html`. It does not rotate.

A new object in `quotes.json` is still just a commit. Nothing on the homepage reads that file.

## habits

The grids are on `/` (`site/index.html`) and again on `/me/` (`site/me/index.html`), which is the full page from before the quiet strip. `/habits/` forwards to `/me/`. The grids, in order:

| grid | file | what a cell is |
|---|---|---|
| code | `site/habits/cursor.json` | one day's total: commits + pull requests opened + pull requests merged + AI line edits + ride points + journal thinking + non-cycling workouts. Colour steps are fixed at 2 / 8 / 14 / 24. |
| workouts | `site/habits/workouts.json` | that day's Apple exercise minutes. The heading is workouts. The file name stays `workouts.json`. Colour steps are the `intensity.edges` in the file (14 / 29 / 59 / 89). |
| steps | `site/habits/steps.json` | that day's step count. Fixed cuts: 2,500 / 5,000 / 7,500 / 10,000. |
| sleep | `site/habits/sleep.json` | the 0–100 score (duration 50, bedtime consistency 30, interruptions 20) and minutes asleep. Colour steps are the 20th / 40th / 60th / 80th of the nonzero nights on screen. A streak is nights scoring 70 or more. A past night with no record stays empty. |
| faith | `site/habits/faith.json` | from `start` through the day before `full`, the span splits into four levels. From `full` through today (America/Chicago) each day is a full cell, unless the date is in `no`. The browser fills a new day, so the grid moves forward without a commit. |

The journal grid is hidden. Its section is commented out on `/` and on `/me/`, and `journal` is `"enabled": false` in `site/habits/trackers.json`. `journal.json` and `journal-jarvis.json` stay in the repo.

`python3 scripts/habits.py all` rebuilds `cursor.json` from GitHub. Dates are author dates in America/Chicago. Merge commits are skipped. A pull request counts on the day it was opened and again on the day it merged. AI line edits come from `site/habits/cursor-lines.json` and are not fetched. The Pages workflow runs this before upload and still deploys if the fetch fails. A private repo needs `HABITS_GITHUB_TOKEN`. `python3 scripts/habits.py check` checks the schema and does not use the network.

Workouts, steps, and sleep are committed JSON. This repo does not fetch Apple Health or Strava on a schedule.

Old `/habits/YYYY-MM-DD/` addresses redirect to `/`.

## nightly sync

`.github/workflows/snaps.yml` runs four times a day on the America/Chicago clock: 6:00am, noon, 6:00pm, and midnight, including weekends. Actions cron is UTC, so each local hour is listed twice (CDT and CST). The first step runs a scheduled cron only when it matches the current Chicago offset for that hour, from the cron that queued the run rather than the clock, so a late delivery still syncs once and the other offset does not. A manual dispatch always runs.

That job syncs the Lightroom album, then the Spotify playlist. A Spotify failure does not block the photo sync. It commits `site/snaps/`, `scripts/snaps_colors.json`, and `site/music/playlist.json` only when something changed, then starts the Pages deploy.

`.github/workflows/pages.yml` deploys on every push to `main`, on manual dispatch, and on `2,32 5,6 * * *` (just after midnight Chicago, both CDT and CST). Before upload it refreshes `cursor.json` and runs `python3 scripts/make_cards.py flip`, which copies a staged `og-next/` into `site/og/` once that date has started in Chicago. Either step can fail without blocking the deploy.

The quote file is the commit described above, not a step in `snaps.yml`, and the homepage does not show it.

## what the homepage leaves off

No Buttondown field, no konami row, no social icons, no matrix rain, and no teal/orange toggle on `/`. `/confirmed/` is the signup page again. The homepage does not load `rain.js` and has no `#rain` canvas. The restored pages still do: rain, glows, the title speed switch, the email field, and the konami row, as they were just before the quiet strip.
