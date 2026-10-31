# jayroddi.dev

Personal site. The repository is still named `jaytha.ninja`. The live site is [https://jayroddi.dev](https://jayroddi.dev). `jaytha.ninja` forwards through [jayroddi/jaytha-ninja-redirect](https://github.com/jayroddi/jaytha-ninja-redirect), which sends every path, query, and hash to jayroddi.dev.

`site/CNAME` is `jayroddi.dev`. Pushes to `main` deploy `site/` to GitHub Pages (`.github/workflows/pages.yml`).

The homepage is the photo grid. The ground follows the system: black when the system is dark, white when it is light (`prefers-color-scheme`). There is no mist and no gradient.

In order:

1. The header is one row at 12px. `✌️🤟🤙` is on the left. `life finds a way` is centered. `🇺🇸🇯🇵🇳🇿` is on the right. Under that, the nav is `snaps · music · books · quotes · habits`. `/daily/` is not in the nav. The accent stays teal (`#1AADB3` in dark, `#127F84` on white) until the day’s final puzzle is solved in this browser. Then the site is gold until midnight America/Chicago (`#FFD700` in dark, `#A67C00` on white). The title is not a control, and there is no orange step. Body text stays `--fg` (white in dark, black in light). The emoji keep their own colour. The title does not pulse or glow.
2. On `/` and `/snaps/`, the subtitle is `📷`, then the final puzzle. On `/habits/`, the subtitle is today’s quote from `site/quote-of-the-day/quotes.json` (America/Chicago, future dates hidden). The other pages keep a single emoji subheader. `/daily/` is `🗓️`. `/music/` is `🎧`. `/books/` is `📚`. `/quotes/` is `💬`.
3. The habit grids (code, workouts, steps, sleep, faith) live on `/habits/`. `/` and `/snaps/` are the photo grid.

`/music/`, `/books/`, `/quotes/`, `/habits/`, `/snaps/`, and `/daily/` stay live when you open the URL. `/me/` and old `/habits/YYYY-MM-DD/` addresses forward to `/habits/`. `/daily/` is the quote feed (the same list as `/quotes/`). `/confirmed/` still opens by URL. Each page starts with the same header: `✌️🤟🤙` on the left, `life finds a way` in the center, `🇺🇸🇯🇵🇳🇿` on the right, then that page’s subtitle. The nightly sync still updates snaps and the playlist.

## snaps

`/` and `/snaps/` are the photo grid. `python3 scripts/sync_snaps.py` reads the public Lightroom album and writes `site/snaps/`. Nothing with a location is stored.

`site/snaps/snaps.json` is the index (`base`, `key`, and `months`, newest first). Each month is `site/snaps/m/YYYY-MM.json`, newest first. A photo is `{i, v, d, a, w, h, t, s, l, c}`: asset id, revision, Chicago date, capture time, oriented width and height, the 640 / 1280 / 2048 rendition ids, and a dominant color from the 640 JPEG. `a` is that capture clock tagged America/Chicago (`2026-10-25T07:33:00-05:00`). Each tile stamps it in the bottom-right as `2026.10.25 // 7:33am`, italic mono, readable without covering the photo. The lightbox repeats that line, centered under the photo. A photo with no time shows the date only. `scripts/snaps_colors.json` remembers those colors so the next run does not download an unchanged rendition.

While the day’s puzzle is unsolved, the newest month loads the baked frost JPEG and older months load the sharp rendition under a lighter CSS blur, so age reads clearer. A missing frost file falls back to the sharp URL with a heavy blur. Solving the puzzle loads the sharp URL for every photo until midnight America/Chicago. The sharp ids stay in the JSON. `python3 scripts/publish_snaps.py --bake` fills `frost-cache/`. `--apply` copies ready JPEGs into `site/snaps/f/` for that deploy and does not strip `base`, `key`, `v`, `t`, `s`, or `l`. The grain does not compress, so a full bake is about 270MB. Those files stay out of git (`frost-cache/`, `site/snaps/f/`, and `scripts/snaps_frost.json` are gitignored). The recipe is a two-pass Gaussian blur at 0.06 of the long edge, saturation 0.75, brightness 1.08, a 0.28 white haze, and mono grain with sigma 12.

The board under the 📷 emoji is the daily final puzzle. `R S T L N E` start filled. A single letter reveals every copy of that letter. The whole phrase solves the day. The bank is `site/snaps/puzzles.json`. Index 0 is `epoch` (America/Chicago). Each next Chicago day uses the next object. After the last one, the list wraps. Append objects. Do not reorder or insert earlier ones, or past days shift. `phrase` is ASCII XOR `0xA5`, then base64, so the answer is not sitting in the file as plain text. Add one with `python3 scripts/puzzle_bank.py "PHRASE" "Category"`. To retest a solve, remove `jtn.snaps.unlock` from localStorage and reload. The decoy password field is gone. `workers/snap-guesses/` is unused by the page.

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

A new object in `quotes.json` is still just a commit. `/habits/` and the lists pick it up from that file.

## habits

The grids live on `/habits/` (`site/habits/index.html`). `/` is the photo grid. `/me/` forwards to `/habits/`. `/daily/` is the quote feed and is not in the nav. The grids, in order:

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

Old `/habits/YYYY-MM-DD/` addresses redirect to `/habits/`.

## nightly sync

`.github/workflows/snaps.yml` runs four times a day on the America/Chicago clock: 6:00am, noon, 6:00pm, and midnight, including weekends. Actions cron is UTC, so each local hour is listed twice (CDT and CST). The first step runs a scheduled cron only when it matches the current Chicago offset for that hour, from the cron that queued the run rather than the clock, so a late delivery still syncs once and the other offset does not. A manual dispatch always runs.

That job syncs the Lightroom album and bakes any new mid-frost JPEGs into the Actions cache (`frost-cache/`, not committed), then the Spotify playlist. A Spotify failure does not block the photo sync. It commits `site/snaps/` and `scripts/snaps_colors.json` and `site/music/playlist.json` only when something changed, then starts the Pages deploy. The frost JPEGs ride that deploy's cache, not the commit.

`.github/workflows/pages.yml` deploys on every push to `main`, on manual dispatch, and on `0,2,32 5,6 * * *` (midnight Chicago, plus two retries, both CDT and CST). Before upload it bakes frost into the cache and copies ready JPEGs into the artifact. Sharp Lightroom ids stay in the uploaded JSON. A missing frost file does not block the deploy. It refreshes `cursor.json`, and runs `python3 scripts/make_cards.py flip`, which copies a staged `og-next/` into `site/og/` once that date has started in Chicago. The habits refresh and the card flip can fail without blocking the deploy.

The quote file is the commit described above, not a step in `snaps.yml`. `/habits/` shows today’s entry from that file.

## what the homepage leaves off

No Buttondown field, no konami row, no social icons, and no teal/orange speed toggle on `/`. Matrix rain is on the board pages (`/`, `/habits/`, `/snaps/`, `/quotes/`, `/daily/`, `/books/`, `/music/`, `/confirmed/`): 25% behind `.copy`, `.gallery`, and `.foot`, full strength in the side gutters, and that same floor across the whole screen under 760px. `/confirmed/` is the signup page again.
