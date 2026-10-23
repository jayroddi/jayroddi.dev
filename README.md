# jayroddi.lol

Personal site. The repository is still named `jaytha.ninja`. The live site is [https://jayroddi.lol](https://jayroddi.lol). `jaytha.ninja` forwards through [jayroddi/jaytha-ninja-redirect](https://github.com/jayroddi/jaytha-ninja-redirect), which sends every path, query, and hash to jayroddi.lol.

`site/CNAME` is `jayroddi.lol`. Pushes to `main` deploy `site/` to GitHub Pages (`.github/workflows/pages.yml`).

The header on every public page is `mi deh yah`. Under it the nav is `snaps // music // books // quotes // me`.

| page | what it is |
|---|---|
| `/` | snaps. `site/index.html` loads the Lightroom grid. `/snaps/` redirects here. |
| `/music/` | album-cover grid for the Spotify playlist. |
| `/books/` | covers grouped by the year they were read. |
| `/quotes/` | daily quotes, newest first. |
| `/me/` | habit grids: code, workouts, steps, sleep, faith. `/habits/` redirects here. The files stay in `site/habits/`. |

Each of those pages ends in the same footer: a Buttondown email field and the konami row.

## snaps

`python3 scripts/sync_snaps.py` reads the public Lightroom album and writes `site/snaps/`. Images stay on Adobe. Nothing with a location is stored.

`site/snaps/snaps.json` is the index (`base`, `key`, and `months`, newest first). Each month is `site/snaps/m/YYYY-MM.json`, newest first. A photo is `{i, v, d, w, h, t, s, l, c}`: asset id, revision, Chicago date, oriented width and height, the 640 / 1280 / 2048 rendition ids, and a dominant color from the 640 JPEG. `scripts/snaps_colors.json` remembers those colors so the next run does not download an unchanged rendition.

The grid asks for the 640 rendition and offers the 1280 in `srcset`. The lightbox uses the 2048. Months are three columns, or six from 900px. The page draws the newest month, then more as you scroll.

## music

`/music/` reads `site/music/playlist.json`. One tile per track. A tap opens that track on Spotify. The note under the nav is `every day i'm shuffling`.

`python3 scripts/spotify_playlist.py site/music/playlist.json` refreshes that file from the Spotify Web API. It needs `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and `SPOTIFY_REFRESH_TOKEN`. Without the refresh token it exits 0 and leaves the file alone. It writes only when the tracks change (`fetched` is not enough).

## books

`/books/` reads `site/books/books.json`. `site/books/books.js` groups covers by read year, newest year first, newest read first inside a year. A read of `YYYY-MM` (no day) sorts after every full date in that month. A book with no read date would land in a final `no date` group. The note under the nav is `we read to know we are not alone`.

`python3 scripts/books_import.py site/books/books.json [goodreads.csv]` rebuilds the file and `site/books/covers/` from a Goodreads export. Ids listed in `scripts/books_hidden.json` are dropped. Covers in `scripts/books_cover_overrides.json` replace the Open Library fetch.

## quotes

`/quotes/` reads `site/quote-of-the-day/quotes.json`. Newest first. One object per day, and only these fields:

```json
{"date": "YYYY-MM-DD", "text": "the quote", "author": "Name"}
```

`date` is America/Chicago. A date still in the future stays hidden. `text` keeps its original casing. The note under the nav is `15 years and counting`. `/quote-of-the-day/` redirects to `/`.

A new quote is a commit that puts that day's object at the top. There is no Actions workflow for it. The page picks it up on the next deploy.

## me

`/me/` (`site/me/index.html`) is the habits page. The note under the nav is `we fall to the level of our habits`. The grids, in order:

| grid | file | what a cell is |
|---|---|---|
| code | `site/habits/cursor.json` | one day's total: commits + pull requests opened + pull requests merged + AI line edits + ride points + journal thinking + non-cycling workouts. Colour steps are fixed at 2 / 8 / 14 / 24. |
| workouts | `site/habits/workouts.json` | that day's Apple exercise minutes. The heading is workouts. The file name stays `workouts.json`. Colour steps are the `intensity.edges` in the file (14 / 29 / 59 / 89). |
| steps | `site/habits/steps.json` | that day's step count. Fixed cuts: 2,500 / 5,000 / 7,500 / 10,000. |
| sleep | `site/habits/sleep.json` | the 0–100 score (duration 50, bedtime consistency 30, interruptions 20) and minutes asleep. Colour steps are the 20th / 40th / 60th / 80th of the nonzero nights on screen. A streak is nights scoring 70 or more. A past night with no record stays empty. |
| faith | `site/habits/faith.json` | from `start` through the day before `full`, the span splits into four levels. From `full` through today (America/Chicago) each day is a full cell, unless the date is in `no`. The browser fills a new day, so the grid moves forward without a commit. |

The journal grid is hidden. Its section is commented out on `/me/`, and `journal` is `"enabled": false` in `site/habits/trackers.json`. `journal.json` and `journal-jarvis.json` stay in the repo.

`python3 scripts/habits.py all` rebuilds `cursor.json` from GitHub. Dates are author dates in America/Chicago. Merge commits are skipped. A pull request counts on the day it was opened and again on the day it merged. AI line edits come from `site/habits/cursor-lines.json` and are not fetched. The Pages workflow runs this before upload and still deploys if the fetch fails. A private repo needs `HABITS_GITHUB_TOKEN`. `python3 scripts/habits.py check` checks the schema and does not use the network.

Workouts, steps, and sleep are committed JSON. This repo does not fetch Apple Health or Strava on a schedule.

Old `/habits/YYYY-MM-DD/` addresses redirect to `/`.

## nightly sync

`.github/workflows/snaps.yml` runs at midnight America/Chicago. The crons are `0 5 * * *` and `0 6 * * *` (midnight CDT and midnight CST). The first step continues only when `TZ=America/Chicago date +%H` is `00`, so the pair fires once. A manual dispatch always runs.

That job syncs the Lightroom album, then the Spotify playlist. A Spotify failure does not block the photo sync. It commits `site/snaps/`, `scripts/snaps_colors.json`, and `site/music/playlist.json` only when something changed, then starts the Pages deploy.

`.github/workflows/pages.yml` deploys on every push to `main`, on manual dispatch, and on `2,32 5,6 * * *` (just after midnight Chicago, both CDT and CST). Before upload it refreshes `cursor.json` and runs `python3 scripts/make_cards.py flip`, which copies a staged `og-next/` into `site/og/` once that date has started in Chicago. Either step can fail without blocking the deploy.

The quote of the day is the commit described above, not a step in `snaps.yml`.

## signup

The footer on `/`, `/music/`, `/books/`, `/quotes/`, and `/me/` posts to Buttondown (`embed-subscribe/jayroddi`). The field placeholder is `stay updated w/email, or cheat code if you are a real nerd`. `/confirmed/` is the confirmation page.

The konami row under the field is unchanged: up, up, down, down, left, right, left, right, b, a, then start. On a keyboard the same arrows, then b, a, then Enter, when focus is outside the email field.
