# jayroddi.dev

Personal site. The repository is still named `jaytha.ninja`. The live site is [https://jayroddi.dev](https://jayroddi.dev). `jaytha.ninja` forwards through [jayroddi/jaytha-ninja-redirect](https://github.com/jayroddi/jaytha-ninja-redirect), which sends every path, query, and hash to jayroddi.dev.

`site/CNAME` is `jayroddi.dev`. Pushes to `main` deploy `site/` to GitHub Pages (`.github/workflows/pages.yml`).

The homepage is the habit grids. The ground is plain black. The site is locked to the dark palette for now and does not follow `prefers-color-scheme: light`. There is no mist and no gradient.

In order:

1. The header is one row at 12px, the same size as the homepage quote. Grid titles, the less/more line, and the stat values are 12px too. Month labels stay 10px and the stat captions stay 11px. `✌️🤟🤙` is on the left. `jayroddi.dev` is centered on the row. A click cycles the accent teal (`#1AADB3`) → orange (`#FF4D1A`) → gold (`#FFD700`) → teal. The choice stays in this browser. It recolours `--c` (the quote author and the grid accents). The title shows the next accent (`--c-next`). The quote words and the body text stay white. `🇺🇸🇯🇵🇳🇿` is on the right. There is no `//` and no menu. The emoji keep their own colour. The title does not pulse or glow. There is no underline. The space under the row matches the space under the subtitle (`--habit-gap`, 16px).
2. On `/` and `/habits/`, the subtitle is today’s quote from `site/quote-of-the-day/quotes.json` (America/Chicago, future dates hidden). The words are `--fg` (white), 12px italic mono, centered, lowercase. The author is the next line, teal `#1AADB3`, with a hyphen tight to the name (`-derek sivers`). The other pages keep a teal emoji subheader, one glyph and no words, italic, 11px at every width (also 11px under 360px). `/snaps/` is `📷`. `/daily/` is `🗓️`. `/music/` is `🎧`. `/books/` is `📚`. `/quotes/` is `💬`.
3. On `/` and `/habits/`, the habit grids (code, workouts, steps, sleep, faith). The photo grid lives on `/snaps/`.

There is no in-site menu. `/music/`, `/books/`, `/quotes/`, `/habits/`, `/snaps/`, and `/daily/` stay live when you open the URL. `/me/` forwards to `/habits/`. `/daily/` is the quote feed (the same list as `/quotes/`). `/confirmed/` still opens by URL. Each of those pages starts with the same header: `✌️🤟🤙` on the left, `jayroddi.dev` in the center, `🇺🇸🇯🇵🇳🇿` on the right, then that page’s subtitle. The nightly sync still updates snaps and the playlist.

## snaps

`/snaps/` is the photo grid (`site/snaps/index.html`). `python3 scripts/sync_snaps.py` reads the public Lightroom album and writes `site/snaps/`. Nothing with a location is stored.

Until 2026-11-01 00:00 America/Chicago the grid and the lightbox load Adobe renditions. `site/snaps/snaps.json` in the repo is the index (`base`, `key`, and `months`, newest first). Each month is `site/snaps/m/YYYY-MM.json`, newest first. A photo is `{i, v, d, a, w, h, t, s, l, c}`: asset id, revision, Chicago date, capture time, oriented width and height, the 640 / 1280 / 2048 rendition ids, and a dominant color from the 640 JPEG. `a` is that capture clock tagged America/Chicago (`2026-10-25T07:33:00-05:00`). Each tile stamps it in the bottom-right as `2026.10.25 // 7:33am`, italic mono, readable without covering the photo. The lightbox repeats that line, centered under the photo. A photo with no time shows the date only. `scripts/snaps_colors.json` remembers those colors so the next run does not download an unchanged rendition.

The grid asks for the 640 rendition and offers the 1280 in `srcset`. The lightbox uses the 2048.

From 2026-11-01 00:00 America/Chicago the Pages deploy serves only mid-frost JPEGs: `site/snaps/f/{asset}.jpg` from the 640, and `site/snaps/f/{asset}-l.jpg` from the 1280 (otherwise the 2048, otherwise the 640). The recipe is a two-pass Gaussian blur at 0.06 of the long edge, saturation 0.75, brightness 1.08, a 0.28 white haze, and mono grain with sigma 12. The grain does not compress, so a full bake is about 270MB. Those files stay out of git (`frost-cache/` and `scripts/snaps_frost.json` are gitignored and kept in the Actions cache). The sync bakes into that cache, and so does `python3 scripts/publish_snaps.py --bake`. `--apply` is a no-op until the gate. After the gate it copies the cache into the Pages artifact, sets `"frost": true`, drops `base`, `key`, `v`, `t`, `s`, and `l` from the uploaded JSON, and removes the Adobe preconnect from `site/snaps/index.html`. The public site then has no sharp rendition URL. The repo copy keeps the ids, because the next sync has to download new photos. If a frost file is missing, that deploy leaves the sharp URLs in place instead of shipping a broken grid. The Pages cron starts at the top of the midnight hour (`0,2,32 5,6 * * *`, Chicago CDT and CST) so the flip starts at 00:00. It finishes when that deploy goes live. A deploy before then warms the cache and still ships the sharp grid.

The decoy field under the 📷 emoji uses the same flag. It is a password input. The placeholder is `if you know me well enough, you'd know the password`. No guess unlocks anything. A submit says `nope`. The page POSTs `{guess}` to `GUESS_URL` in `site/snaps/snaps.js`, which is empty until the worker is deployed, and it never has a write token. Repeats inside 2.5 seconds are not sent, and the page stops sending after 20 in an hour. The worker (`workers/snap-guesses/`) stores the guess, the time, the user agent, and Cloudflare's country, region, and city in KV, and it drops an address after 20 in an hour or 80 in a day. Jay reads `https://<worker>/?token=<READ_TOKEN>` (or `?format=json`), or the `GUESSES` namespace in the Cloudflare dashboard. Share that URL with xavier; the token is the read credential. Deploy steps are in `workers/snap-guesses/wrangler.toml`. The free KV plan is about 1,000 writes a day, and each stored guess is two of them.

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

`date` is America/Chicago. `/quotes/` and `/daily/` read that file and paint the whole list (future dates stay hidden). `/` and `/habits/` read the same file and show only today’s entry. `/quote-of-the-day/` still forwards home.

A new object in `quotes.json` is still just a commit. The homepage quote and the lists pick it up from that file.

## habits

The grids are the homepage (`site/index.html`) and `/habits/` (`site/habits/index.html`). `/me/` forwards to `/habits/`. `/snaps/` is the photo grid. `/daily/` is the quote feed. The grids, in order:

| grid | file | what a cell is |
|---|---|---|
| code | `site/habits/cursor.json` | one day's total: commits + pull requests opened + pull requests merged + AI line edits + ride points + journal thinking + non-cycling workouts. Colour steps are fixed at 2 / 8 / 14 / 24. |
| workouts | `site/habits/workouts.json` | that day's Apple exercise minutes. The heading is workouts. The file name stays `workouts.json`. Colour steps are the `intensity.edges` in the file (14 / 29 / 59 / 89). |
| steps | `site/habits/steps.json` | that day's step count. Fixed cuts: 2,500 / 5,000 / 7,500 / 10,000. |
| sleep | `site/habits/sleep.json` | the 0–100 score (duration 50, bedtime consistency 30, interruptions 20) and minutes asleep. Colour steps are the 20th / 40th / 60th / 80th of the nonzero nights on screen. A streak is nights scoring 70 or more. A past night with no record stays empty. |
| faith | `site/habits/faith.json` | from `start` through the day before `full`, the span splits into four levels. From `full` through today (America/Chicago) each day is a full cell, unless the date is in `no`. The browser fills a new day, so the grid moves forward without a commit. |

The journal grid is hidden. Its section is commented out on `/` and `/habits/`, and `journal` is `"enabled": false` in `site/habits/trackers.json`. `journal.json` and `journal-jarvis.json` stay in the repo.

`python3 scripts/habits.py all` rebuilds `cursor.json` from GitHub. Dates are author dates in America/Chicago. Merge commits are skipped. A pull request counts on the day it was opened and again on the day it merged. AI line edits come from `site/habits/cursor-lines.json` and are not fetched. The Pages workflow runs this before upload and still deploys if the fetch fails. A private repo needs `HABITS_GITHUB_TOKEN`. `python3 scripts/habits.py check` checks the schema and does not use the network.

Workouts, steps, and sleep are committed JSON. This repo does not fetch Apple Health or Strava on a schedule.

Old `/habits/YYYY-MM-DD/` addresses redirect to `/`.

## nightly sync

`.github/workflows/snaps.yml` runs four times a day on the America/Chicago clock: 6:00am, noon, 6:00pm, and midnight, including weekends. Actions cron is UTC, so each local hour is listed twice (CDT and CST). The first step runs a scheduled cron only when it matches the current Chicago offset for that hour, from the cron that queued the run rather than the clock, so a late delivery still syncs once and the other offset does not. A manual dispatch always runs.

That job syncs the Lightroom album and bakes any new mid-frost JPEGs into the Actions cache (`frost-cache/`, not committed), then the Spotify playlist. A Spotify failure does not block the photo sync. It commits `site/snaps/` and `scripts/snaps_colors.json` and `site/music/playlist.json` only when something changed, then starts the Pages deploy. The frost JPEGs ride that deploy's cache, not the commit.

`.github/workflows/pages.yml` deploys on every push to `main`, on manual dispatch, and on `0,2,32 5,6 * * *` (midnight Chicago, plus two retries, both CDT and CST). Before upload it runs `python3 scripts/publish_snaps.py --apply` (a no-op until the frost gate), refreshes `cursor.json`, and runs `python3 scripts/make_cards.py flip`, which copies a staged `og-next/` into `site/og/` once that date has started in Chicago. The habits refresh and the card flip can fail without blocking the deploy. The frost gate does not: a crash there keeps the previous deploy up. A missing frost file does not. That case exits 0 and leaves the sharp URLs for that deploy.

The quote file is the commit described above, not a step in `snaps.yml`. The homepage shows today’s entry from that file.

## what the homepage leaves off

No Buttondown field, no konami row, no social icons, and no teal/orange speed toggle on `/`. Matrix rain is on the board pages (`/`, `/habits/`, `/snaps/`, `/quotes/`, `/daily/`, `/books/`, `/music/`, `/confirmed/`): 25% behind `.copy`, `.gallery`, and `.foot`, full strength in the side gutters, and that same floor across the whole screen under 760px. `/confirmed/` is the signup page again.
