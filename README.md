# jaytha.ninja

Personal site. The homepage `/` (`site/index.html`) is the snaps photo grid; its data stays in `site/snaps/` (`snaps.json`, `m/`), written by `scripts/sync_snaps.py`. The habit grids page is `/habits/` (`site/habits/index.html`, next to its data files). The header line is `suffering is optional`, linking to `/quotes/`. `/snaps/`, `/tweets`, the old day pages and the other retired pages redirect to `/`. `/confirmed/` stays for the Buttondown confirmation landing.

Pushes to `main` deploy that folder to GitHub Pages through GitHub Actions. The custom domain is jaytha.ninja. DNS lives at Namecheap.

## daily pages + data flow

The homepage's daily lines (top half) each read one file; the daily pages read the same files. Nothing on the homepage is edited by hand except `COPY.lyric` and `COPY.dayDate` in `site/index.html`.

| homepage line | page | data |
|---|---|---|
| `// yyyy.mm.dd` | (none) | `COPY.dayDate` in `site/index.html` |
| `🎧 <lyric> →` | /song-of-the-day/ | `site/song-of-the-day/songs.json` (+ `COPY.lyric`) |
| quotes | /quotes (the list). /quote-of-the-day/ still redirects to `/` | `site/quote-of-the-day/quotes.json` |
| photo + `📸 snap of the day →` caption, centred (only when the newest entry is dated today or yesterday, America/Chicago) | /snap-of-the-day/ | `site/snap-of-the-day/snaps.json` + `site/snap-of-the-day/snaps/` |

Lyrics have exactly one blank line between every line (v1.69, jay 2026.10.04): no lines touching and no bigger gap at verse breaks. `songs.json` stores the lyric one line per line (no blank lines); `pick.py` (`lyric_lines`, in /home/box/jaytha-songs) does that when the drop stages the song, whatever spacing the paste came with (lyrics sites often double-space). /song-of-the-day/ then shows the non-blank lines with one blank line between each, today's and the archive. The homepage 🎧 line runs the lyric together on one line as before. Only lyrics: daily updates keep exactly the spacing jay pastes.

Every page shows the newest entry dated today or earlier (America/Chicago) at the top and the older ones below it, newest first. Future-dated entries stay hidden until their day.

### quotes.json (v2.44)
`site/quote-of-the-day/quotes.json` is the daily quote feed. Newest first, UTF-8, 2-space indent. One object per day, and only these three fields:

```json
{"date": "YYYY-MM-DD", "text": "the quote", "author": "Name"}
```

A nightly drop appends that day's object at the top of the array. `date` is America/Chicago. `text` keeps the quote's original casing; `/quotes` lowercases it. `author` is the person's name. Do not add a slug or any other field.

`/quotes` redirects to `/` (v2.63). While the page was up it listed every entry dated today or earlier, newest first, in one centered column. The quote text is left-justified. The attribution is on its own line, right-justified, in the speed color, with no leading dash. The whole list appears at once. The file stays at `site/quote-of-the-day/quotes.json`, so a nightly append still feeds the page. `/quote-of-the-day/` still redirects to `/`. The same file feeds the quote share card (`text`, or the older `quote` key).

### tweets (v2.59)
`/tweets` redirects to `/`. The public page, `site/tweets/tweets.json`, and `site/tweets/photos/` are not deployed. `scripts/build_tweets.py` and `scripts/add_tweet.py` stay in the repo and are not part of the deploy. The journal grid does not read that feed.

The feed those scripts write, when the page is up, is newest exchange first. One object per exchange:

```json
{"ts": "2026-10-13T09:30:00-05:00", "messages": [{"author": "jay", "text": "the tweet", "photo": "2026-10-13-0930.webp", "w": 1600, "h": 900}, {"author": "tess", "text": "a reply"}]}
```

`ts` is an ISO timestamp and it must include an explicit offset, such as `-05:00` or `Z`. A timestamp with no offset is not shown. Each message has `author`, optional `text`, and optional `photo`. `text` keeps the original casing and line breaks. `photo` is only a file name in `site/tweets/photos/`. The file name is `YYYY-MM-DD-HHMM.<ext>` from that exchange's America/Chicago time on a 24-hour clock: `2026-10-13-0930.webp` is 9:30am CT, and `2026-06-03-2105.jpg` is 9:05pm CT. When `photo` is present, `w` and `h` are the pixel width and height of that published file. The page centers the Chicago time (`oct 13, 2026 · 9:18 am`). Jay is on the right: the photo, then a small `jay` label in the speed color, then the text. Anyone else is on the left, with their name in a muted color above the text. Reply text is kept as written. The photo `alt` is empty. A timestamp still in the future stays hidden. An empty list shows `no tweets yet`, centered, in lowercase. The sitemap stays `/` only. While the page is down, `/tweets` redirects home and those files are not deployed.

The source is the vault log `inputs/tweets/YYYY-MM-DD.md`. Tess starts Jay's message with `- 9:32 am —`. The words are the indented lines under that header. The builder strips the leading `- ` and the trailing ` —`, then dedents the body. One photo is a camera line under that message. A second camera line on the same message is ignored, so the file name does not become part of the text. A reply is an indented line whose name is in the known list, which is `tess` for now. More indented lines stay with that reply. A line such as `ps:` or a link stays in the tweet text. An exchange with no reply shows only Jay. The raw file stays in that folder and is gitignored. The site commits only the optimized copy:

```
- 9:32 am —
  the tweet
  another line
  📷 2026-10-13-0932.jpg
  tess: a reply
  that continues

- 10:15 pm —
  a later one
```

`python3 scripts/build_tweets.py` rewrites the feed from that log. It keeps exchanges at or after 2026-10-13 09:30 America/Chicago and drops every earlier one. Pillow resizes the long edge to 1600px, strips EXIF, and writes `site/tweets/photos/YYYY-MM-DD-HHMM.webp` with `w` and `h`.

One tweet can also be appended by hand. `--ts` needs the offset:

```
python3 scripts/add_tweet.py "the words" --ts 2026-10-13T09:30:00-05:00
python3 scripts/add_tweet.py "the words" --photo shot.jpg --ts 2026-10-13T09:30:00-05:00
```

A later `build_tweets.py` run replaces `tweets.json` from the log.

### snaps.json (v1.56)
`[{"date": "YYYY-MM-DD", "src": "/snap-of-the-day/snaps/snap-YYYY-MM-DD.webp", "w": <src width>, "h": <src height>, "home": "/snap-of-the-day/snaps/snap-YYYY-MM-DD-home.webp", "alt": "<what's in the photo>"}, …]`, newest first, UTF-8, 2-space indent.
Two files per snap: `src` is the full shape (portrait stays portrait; 1600px on the long edge), shown on /snap-of-the-day/ at that shape (w/h reserve the frame); `home` is the homepage's 3:2 landscape crop (1200x800), shown under the daily lines with the caption. Both have all metadata (EXIF/GPS) stripped.
`snap.py` (in /home/box/jaytha-songs) makes both files and the entry: `python3 snap.py add --site <repo>/site --date YYYY-MM-DD --file <photo> --alt "…"` (`--focus 0.3` moves the homepage crop up; `remove --date` takes one out).

## 11:31pm drop: snap of the day (v1.56) + share cards (v1.61)
The nightly drop runs at 11:31pm America/Chicago and ships the next day's song + quote (+ update) (+ snap), all dated that next day. The site holds them until 12:00am CT and flips everything at midnight (v1.59), and the share cards flip with them (see share cards below).
Jay sends a photo at night; it is saved as `/home/box/jaytha-songs/pending-snap.jpg` (one at a time; a newer photo replaces it). At the 11:31pm drop, alongside the song + quote (+ update):
0. Only once `site/snap-of-the-day/` is on main (v1.56 live). Until then leave pending-snap.jpg where it is.
1. No `pending-snap.jpg` = no snap today; ship the rest as usual. If snaps.json already has that date's entry (2026-09-28 … 2026-10-03 shipped with v1.56 itself), don't publish it again: just do step 6.
2. The snap's date is the drop's date: tomorrow's America/Chicago date (it shows from 12:00am CT), unless jay gave a date.
3. Run `python3 /home/box/jaytha-songs/snap.py add --site <repo>/site --date YYYY-MM-DD --file /home/box/jaytha-songs/pending-snap.jpg --alt "<short plain description, lowercase>"`. It writes `site/snap-of-the-day/snaps/snap-YYYY-MM-DD-home.webp` (3:2, 1200x800, centre-cropped) and `snap-YYYY-MM-DD.webp` (full shape, 1600px long edge), strips all metadata (EXIF/GPS) from both, keeps them small (≤ 300 KB / ≤ 180 KB), and adds `{date, src, w, h, home, alt}` to the top of snaps.json (an entry with the same date is replaced, with its old files).
4. Check the homepage crop (`-home.webp`): if the subject is cut off, rerun with `--focus` (0 = keep the top, 1 = keep the bottom).
5. Ship both photos + snaps.json in the same nightly PR as songs.json / quotes.json (COPY.dayDate is updated with that drop as usual).
6. Move the original to `/home/box/jaytha-songs/snaps/YYYY-MM-DD.jpg` (kept off the site) so pending-snap.jpg is cleared.
7. Last, once the entries are in: `python3 scripts/make_cards.py stage --date <the drop's date, YYYY-MM-DD>` and commit `og-next/` + `site/og/` + any html it touched in the same PR (see share cards).
If the photo can't be read, leave snaps.json alone and tell jay (the song + quote + cards still ship). Never publish the original jpg (it can carry GPS).

## share cards (v1.61)
Link previews use `/og/home.png` (the intro + `// yyyy.mm.dd`), `/og/song.png`, `/og/quote.png` and `/og/snap.png` (the newest entry dated that day or earlier, like the pages), rendered from capri's templates in `scripts/cards/`. Every other page uses the static `/og-image.png`. Every og:image / twitter:image pointing at a card ends in `?d=YYYY-MM-DD` (the cards' date) so social apps refetch when the cards change.
- **11:31pm, with the drop:** `python3 scripts/make_cards.py stage --date YYYY-MM-DD` (needs node + playwright-core and chrome; `NODE_PATH` / `CHROME` override the box defaults). It first catches the repo up with the cards that went live at the last midnight, then renders that date's cards into `og-next/` (outside `site/`, so never deployed) with `og-next/date.txt`.
- **12:00am CT, no commit needed:** the Pages workflow also runs just after midnight (cron `2,32 5,6 * * *` UTC covers CDT + CST) and on every push. Before uploading `site/` it runs `python3 scripts/make_cards.py flip`, which copies `og-next/` into `site/og/` and rewrites `?d=` once that date has started in Chicago. Before then, or if the cards are already live, it does nothing. It never fails the deploy.
- By hand: `make_cards.py now --date YYYY-MM-DD` renders straight into `site/og/` and rewrites `?d=` (`--generic` also redoes `og-image.png`). `make_cards.py stamp --date YYYY-MM-DD` only rewrites `?d=`. `make_cards.py flip --today YYYY-MM-DD` runs the flip as if it were that day (try it on a scratch checkout).

## snaps (v2.33)

`/snaps` is a photo grid of Jay's public Lightroom album. It is a real page (it does not redirect home). The site nav links `/`, `/snaps`, and `/quotes`. The sitemap stays `/` only.

`python3 scripts/sync_snaps.py` reads the public album and writes `site/snaps/`. Images stay on Adobe. Nothing with a location is stored.

The listing is `GET https://photos.adobe.io/v2/spaces/70e5cd134b2e42feae9e82952152c5e8/resources` with header `x-api-key: LightroomMobileWeb1`. The body is JSON after a `while (1) {}` line. The album's `/rels/space_album_images_videos` link is paged with `links.next` (album `86ec4bba2cd6437da54cced3b2c6f50d`). Capture date is the camera's local date. If that is missing, the import time is read in America/Chicago.

`site/snaps/snaps.json` is the index: `base`, `key`, and `months` (newest first, `{m, n}`). Each month is `site/snaps/m/YYYY-MM.json`, newest first. A photo is `{i, v, d, w, h, t, s, l, c}`: asset id, revision, date, oriented width and height, the 640 / 1280 / 2048 rendition ids, and a dominant color (`rrggbb`) from the 640 JPEG. `scripts/snaps_colors.json` remembers those colors so the next run does not download an unchanged rendition.

The grid asks for the 640 rendition (the smallest Adobe size that stays sharp, about 512px on the long edge) and offers the 1280 in `srcset`. The lightbox covers the viewport with the same 90% black. The photo is centered and contained: the grid thumbnail shows at once, then the 2048 replaces it in that same box. Left is a newer photo and right is an older one, across months. Esc, the close button, and the back gesture dismiss it. Each month is three flex columns, or six from 900px. Photos are dealt round-robin, newest first, so a row reads left to right and the first photo in every column shares one top edge. The page draws the newest month, then one more when the sentinel scrolls into view. A short month keeps loading until the screen is full. The first photo is requested on its own (`loading="eager"`, high priority) so it does not share the connection. The other tiles stay their color until that photo arrives, then load with `loading="lazy"` and `decoding="async"`. Each tile is sized from `w` / `h`, so the grid does not jump. The page preconnects to `https://photos.adobe.io`.

Sync runs at 11:41pm America/Chicago (`41 4,5 * * *` UTC, CDT and CST) and on manual dispatch (`.github/workflows/snaps.yml`). It commits `site/snaps/` and the color cache only when something changed, then starts the Pages deploy. A token push does not start that deploy by itself.

## konami (v1.74)
The homepage rocket still fails on a normal tap. Under the social icons, a quiet row (up, down, left, right, b, a, start) is the liftoff that makes it: up up down down left right left right b a start. On the keyboard the same arrows, then b a, then Enter, work when focus is outside a text field. Enter is start: the sequence succeeds only after that full run, Enter lights start, and a different key on that step is a miss. Enter inside the email field stays with the field. The view follows the gold rocket (the same one a successful launch flies) into a starfield, the cartoon ninja turns gold for the rest of the visit, and `+30 lives` shows (lowercase, no period). A reload clears it. Nothing is stored. The row sits in the dim gray until the code starts, then pulses the launch-hold gold, and hides while the page is gold. iOS haptics use the iOS 18 switch-input workaround.

v1.71: the gap above the row is `--pgap`, the same token as the other homepage rows. `b`, `a` and `start` are weight 400 at about the arrows' height, the arrow stroke is thinned to that same weight, and each glyph's ink sits on one center line. The row's box (glyph height, gap) is in the stylesheet, so it is reserved before first paint; gold hides it with visibility instead of removing it, and the glyph size is not measured off the icons' scale-in, so the page does not jump on a teal, orange, or gold load. After liftoff the gold ninja and `+30 lives` hold for 4.5s and pulse gold three times (one steady glow when motion is reduced).

v1.72: correct presses use that same gold pulse, building by one eleventh, instead of teal or orange. The liftoff rocket is the successful-launch gold rocket; the flight path is the same.

v1.73: each correct press (tap or key) bumps that glyph, about 1.15 scale and a bright gold flash for 250ms, then it settles back into the row pulse. The bump is transform only. Reduced motion flashes brightness and does not scale. A touch presses in immediately, with no 300ms tap delay. A miss still blinks the row red.

v1.74: a konami win recolors the page with the same gold pass as a successful email launch. Each text element and icon turns gold as the rocket's centre passes it, including while the page rides down past the rocket, over the same fade. Nothing snaps gold at once. Reduced motion still goes gold immediately.

## habits (v1.78)

`/habits/` is a test bed for a later app. The homepage daily lines include `🗓️ daily habits i'm currently tracking →` directly under the daily update and above the snap, linking to `/habits/`. It is not in the sitemap. The five year graphs stack in one column (code, workouts, journal, sleep, caffeine) and the page scrolls on every screen. On a desktop each graph is the two-graph size (75ch, 10px cells). On a phone each graph is the two-graph phone size (the full column, a 1px cell gap). The squares update in place. Nothing is pushed down when a new day starts.

On a wide screen each graph's title is the daily-page kicker (21px, teal, the state colour). On a phone the titles are 17px. The caffeine title is that same word with a line through the middle, in the heading colour. Its accessible name stays zero caffeine. Every graph's legend is less → more, plus a single gold cursor rectangle for a run of 10 or more active days. Cell colour is the site's state colour (`--c`: teal, orange after a speed tap, the light-theme shade). A streak day is solid `#FFD700` in both themes, every level. A speed tap leaves those cells gold. Journal counts notes created that day: 1, 2–4, 5–9, 10 or more. Zero caffeine covers every displayed day from 2025-10-05 through today. A zero-caffeine day is one solid `--c` cell. A caffeine day, and any day with no record, is the same empty gray cell as the other graphs. Sleep shades that same colour by score: under 50, 50–69, 70–84, 85 or more. A night with no record is the empty gray cell, and a past night with no record is named `oct 3: no record`. A cell shows the date and the quantity (journal is `sep 24: 18 notes`, sleep is `oct 8: score 99 · 5h 09m`). It does not open a day page. An old `/habits/YYYY-MM-DD/` address redirects to `/habits/`.

v1.79: the board column is the song and daily-update measure (their `60ch` at 20px, this page's 16px type, so `75ch`) with the same side margin. The graphs scale to that width and the stats stay inside it. Each graph's box is `aspect-ratio: weeks / 7`, so the reserved height is the squares' height at every width and the legend sits under the graph. The two sections are one block, centered between the home link and the footer, on a desktop as well as a phone.

| tracker | data | what counts |
|---|---|---|
| faith | `site/habits/faith.json` | Above sleep on `/`. Tracking starts 2026-06-03 (`start`). The days from that date through 2026-08-24 split evenly into four levels, 1 then 2 then 3 then 4. From 2026-08-25 (`full`) through today (America/Chicago) each day is a full cell (`data-lv="5"`). A date in `no`, and any day before the start, is the empty square. A streak counts every day at level 1 or higher. The browser fills each new day, so the grid rolls forward without a commit. |
| code | `site/habits/cursor.json` | commits + pull requests opened + pull requests merged + AI line edits + bike rides + journal thinking + non-cycling workouts. A cycling workout on or after 2026-01-01 is one coding session (`rides`). Two rides on a day count as two. The ride still counts on the fitness graph. A day from 2026-03-01 through 2026-06-30 with at least one journal note is one more (`thinking`: 1). Each non-cycling workout on or after 2026-06-01 is one more (`workouts`). Cycling is not counted again. The cell shows that one total. |
| fitness | `site/habits/workouts.json` | Apple Health + Strava. The title is fitness. The file stays `workouts.json`. Every type counts, including walks. A record with `exclude: true` is left out. Several workouts on one day add up. The cell colour is that day's active minutes. Oct–Dec 2025 and Apr–May 2026 are empty on purpose. |
| journal | `site/habits/journal.json` | Before 2026-09-29, notes created that day, including bot-written notes. From 2026-09-29 on, a daily update in `site/daily-update/recaps.json` adds one note on top of that day's Obsidian count. `site/habits/journal-jarvis.json` adds that day's jarvis count on top. The hover says "N notes". A jarvis day says "N journal entries", and a daily-update day keeps the note line and adds "+ N entries". If the recaps file or the jarvis file fails to load, the grid keeps the counts it already has. Both files are date-to-count maps and omit zero days. The jarvis file is counts only. Colour steps are the five percentile cuts of the nonzero days. |
| sleep | `site/habits/sleep.json` | Our own 0–100 sleep score (duration 50, bedtime consistency 30, interruptions 20), plus minutes asleep. The score is computed before it reaches the site. Days with no record are absent. 2025-08-16 through 2026-01-24 is a real gap. Colour steps are under 50, 50–69, 70–84, and 85 or more. A streak is consecutive nights scoring 70 or more. A past night with no record keeps the empty gray cell and is named `oct 3: no record`. |
| caffeine | `site/habits/caffeine.json` | Starts 2025-10-05, the first day the grid shows. The heading is the word caffeine with a strikethrough. `true` is a caffeine-free day (one solid speed colour). `false` is the same empty gray cell as an unrecorded day on the other graphs. Every displayed day through 2026-10-08 is `false`, so the stats stay 0. Days after today stay empty. |

The workouts file stores a day's workout count, active minutes, and, when that day has a bike ride, how many of the workouts were cycling. The per-workout list (type, time, heart rate, zones, a Strava link) is not published. `cursor.json` keeps the day's totals (commits, pull requests, AI line edits, rides, thinking, workouts) and leaves out commit titles and pull-request lists. Rebuild workouts with `python3 scripts/habits.py workouts <merged.json>` (that file stays off the site). The longest workout streak in this export is 8 days, so the workouts graph has no gold cells. The code graph and the journal graph do.

`python3 scripts/habits.py all` rebuilds `cursor.json`. Day-page HTML stays a redirect to `/habits/`. Commit dates are author dates in America/Chicago. Merge commits are skipped. A pull request counts on the day it was opened and, if it merged, again on the day it merged, so a day's total can be higher than GitHub's own calendar (the calendar counts a pull request once). AI line edits are not fetched: put them in `site/habits/cursor-lines.json` (`{"days": {"YYYY-MM-DD": 120}}`) and rerun the script. An empty `days` object means no AI edits.

Repos are listed in `site/habits/trackers.json`. `jayroddi/mideeyah` is private. The Actions token cannot see it, so those commits stay out until a `HABITS_GITHUB_TOKEN` secret (repo scope) is set. A repo the token cannot see is named in `cursor.json` under `skipped_repos`. The Pages workflow runs `scripts/habits.py all` before upload and still deploys if the fetch fails (the committed json ships).

Adding another tracker later is a block in `trackers.json`, a json file, and a `<section class="tracker">` on `/habits/` with the same graph, legend, and stats. The label is the section title. `--habit-gap` (16px) is the only vertical step on that page: the same gap above each title, between a graph and its stats, and between sections. A fifth habit needs no layout change. The page scrolls as habits are added.

v1.78: the homepage line uses a small tear-off calendar instead of an emoji, in the same column as the other daily icons, directly under the notes line and above the snap. The box is reserved in the stylesheet, and the day number (America/Chicago) is written into it in the browser, so nothing shifts and no daily rebuild is involved. The band, rings, and outline use the speed colour (`--c`). The corner hint on every page reads `tap screen for speed +`, with no chevrons, in that same speed colour, and its box is 22ch before the words are written.

v1.80: the homepage habits line uses the calendar emoji (🗓️), the same way the other daily lines use theirs, directly under the notes line. The drawn calendar and the day-number script are gone. `/habits/` requests `habits.css` and `habits.js` at `?v=1.80` (the stylesheet was `?v=1.79` after the column fit; the script was still `?v=1.77`). Day pages request that same stylesheet, and their shared version token, at `?v=1.80` (they were still `?v=1.76`).

v1.81: gold streak cells use the same intensity steps as the speed-colour cells, mixed from `#FFD700` in both themes. The legend keeps the gold cursor rectangle for "10-day streak" and shows the four gold steps next to those words. The hover line is still the count and the date. The first graph is titled `code` (the day page heading uses that same word). The file stays `cursor.json`. `/habits/` and the day pages request `habits.css` at `?v=1.81`. The shared day-page token moved with it, so `day.js` is requested at `?v=1.81` too.

v1.82: on a phone the corner hint is 11px and sits 6px under the safe area (it was 13px and 11px), so it clears the homepage date. The 22ch box is unchanged. Desktop is unchanged. `rain.css` and `rain.js` are `?v=1.82`.

v1.87: the phone speed hint paints above the scan-line fade. That fade stays on the rain, the glows, and the scan lines, and on a phone the hint is solid, without the text shadow. The email signup stays on the homepage. Every other page's footer is the icon row only. A 10-day streak cell is solid `#FFD700` in both themes, and the legend keeps the single gold cursor. `/habits/` stacks four graphs (code, workouts, journal, zero caffeine) at the two-graph size and scrolls on every screen. `--habit-gap` (16px) is the only vertical step, so a fifth habit needs no layout change. `rain.css`, `rain.js`, `foot.css`, `foot.js`, `habits.css`, `habits.js`, and `day.js` are `?v=1.87`.

v1.88: caffeine misses are a lighter coral red (`#F0625A` dark, `#E8574E` light), and every displayed day from 2025-10-05 through 2026-10-08 is a miss. Day pages cover that same span, including `/habits/2026-10-08/`. `habits.css`, `habits.js`, and `day.js` are `?v=1.88`.

v1.89: a cycling workout on or after 2026-01-01 counts as one coding session on the code grid (`rides` on the day, shown as `🚵 ride (thinking time)`). `habits.css`, `habits.js`, and `day.js` are `?v=1.89`.

v1.90: a caffeine day, and any day with no zero-caffeine record, is the plain empty gray cell, the same as an empty day on the other graphs. A zero-caffeine day stays a solid `--c` cell, and a 10-day streak stays gold. The legend is the same less → more row plus the gold cursor. `habits.css`, `habits.js`, and `day.js` are `?v=1.90`.

v1.91: the caffeine heading is the one word caffeine with a strikethrough in the heading colour, on `/habits/` and on each day page. The line sits in the middle and does not change the heading box. The accessible name stays zero caffeine. `habits.css`, `habits.js`, and `day.js` are `?v=1.91`.

v1.92: grid cells are not links. Hover or tap still shows the date and the quantity. Old `/habits/YYYY-MM-DD/` addresses redirect to `/habits/`. The public code and workout files keep per-day counts and leave out commit titles, pull-request lists, and workout details. Day pages stay off unless `HABITS_DAY_PAGES=1`. `habits.css` and `habits.js` are `?v=1.92`.

v1.93: sleep is the fifth graph, under caffeine. The cell is the 0–100 score in the speed colour (under 50, 50–69, 70–84, 85+). A night with no record is the empty gray cell. Hover is the date, the score, and the time asleep (`oct 8: score 99 · 5h 09m`). The stats are the year average, the best month (highest average among months with at least 7 nights), the best night (score and date), and streaks of nights scoring 70 or more. Ten in a row is gold. Past cells carry `role="img"` and an accessible name. `habits.css` and `habits.js` are `?v=1.93`.

v1.94: sleep sits above caffeine. The column is code, workouts, journal, sleep, caffeine, with the same `--habit-gap` between them. A past night with no sleep record keeps the empty gray cell and is named `oct 3: no record`. `habits.css` and `habits.js` are `?v=1.94`.

v1.95: workouts include 2026-10-07 (one 32-minute row) and 2026-10-08 (one 64-minute ride). The ride is one code session on that day. The public files stay per-day counts. `habits.css` and `habits.js` are `?v=1.95`.

v1.96: on a desktop the homepage social row and the konami row span the content column. The ninja and the up glyph sit on the text's left edge. The mail icon and `start` sit on the rocket's right edge. The items spread evenly between those edges. The prompt caret stays out of that flex line. A phone keeps the viewport fit it already had. The rules are in `site/index.html`.

v1.97: every page uses one content column. `--left`, `--edge`, and `--col` live in `rain.css`. Desktop is the homepage measure (777.6px, the old 72ch at 18px) with the same left inset as before and 24px on the right. A phone is 24px on each side. The homepage, `/habits/` (grids and stats stretch with the column; cells stay square and the gaps stay 3px / 1px), `/song-of-the-day/`, `/quote-of-the-day/`, `/daily-update/`, `/snap-of-the-day/`, `/now/`, `/confirmed/`, and the 404 all set their column to `var(--col)`. The footer does too, so the habits grids meet the icon row. On every width the social row and the konami row put the first item on the left edge and the last item on the right edge, spaced evenly. The prompt caret stays out of that line. `rain.css`, `foot.css`, `foot.js`, and `habits.css` are `?v=1.97`.

v1.98: a journal note and a non-cycling workout count on the code grid. A day from 2026-03-01 through 2026-06-30 with at least one journal note adds one (`thinking`). Each non-cycling workout on or after 2026-06-01 adds one (`workouts`). A cycling workout stays in `rides` and is not counted again. The day's total is commits + pull requests opened + pull requests merged + AI line edits + rides + thinking + workouts. The cell still shows that one number. A run of 10 or more active days stays gold. The rules live in `scripts/habits.py` and run with the other code counts.

v1.99: the ninja is the last icon in the social row (X, instagram, threads, github, strava, spotify, linkedin, mail, ninja) and sits on the right edge of the shared column. That row is on the homepage, `/habits/`, `/song-of-the-day/`, `/quote-of-the-day/`, `/daily-update/`, `/snap-of-the-day/`, `/now/`, `/confirmed/`, and the 404. When a page's typing intro finishes, the blinking caret does not stay. The ninja pulses instead: a soft scale and glow in the speed colour (`--c`), on the same 1.05s as the old blink, and it keeps pulsing. A page with the row and no typing intro starts that pulse once the page has loaded. Reduced motion is a still glow. The ninja is still the link to `/now/` (plain on `/now/` itself). `rain.css`, `rain.js`, and `foot.js` are `?v=1.99`.

v2.00: `/habits/` reveals one tracker at a time, in `trackers.json` order. The title types, then that graph's cells colour in, and its stats land after that sweep finishes, then the next tracker. The title speed stays 55ms per character (scramble window 4). The breath between a title and its cells stays 280ms. Each week column still flashes for 18ms, then takes its colour, then waits 26ms. Those waits are divided by the page pace, 2 at 1x and 4 at 2x. The graph heights stay reserved. Reduced motion shows every title, cell, and stat at once. The footer ninja starts pulsing when the last graph finishes. `habits.js` is `?v=2.00`.

v2.02: workouts include 2026-10-09 (one 117-minute ride). The ride is one code session on that day. The public files stay per-day counts. `habits.css` and `habits.js` are `?v=2.02`.

v2.03: the ninja is the first icon in the social row (ninja, X, instagram, threads, github, strava, spotify, linkedin, mail) and sits on the left edge of the shared column. Mail sits on the right edge. That row is on the homepage, `/habits/`, `/song-of-the-day/`, `/quote-of-the-day/`, `/daily-update/`, `/snap-of-the-day/`, `/now/`, `/confirmed/`, and the 404. The pulse is unchanged: when a page's typing intro finishes, the blinking caret does not stay and the ninja pulses in the speed colour (`--c`) on the same 1.05s, and it keeps pulsing. A page with the row and no typing intro starts that pulse once the page has loaded. Reduced motion is a still glow. The ninja is still the link to `/now/` (plain on `/now/` itself). `rain.css`, `rain.js`, and `foot.js` are `?v=2.03`.

v2.04: on the code graph, a day with 21 or more sessions is a gold cursor. It pulses on the same 1.05s blink as the text caret. Reduced motion keeps that cursor still. The square does not change size. A 10-day streak day under 21 stays the solid gold square. Workouts, journal, and sleep are unchanged. The code legend adds that cursor, labeled 21+. `habits.css` and `habits.js` are `?v=2.04`.

v2.05: the 21+ mark is the whole day cell, filled solid gold, with a steady box-shadow glow. It does not pulse or blink. A code day with 21 or more sessions gets it. So does every cell in a run of 21 or more active days, current or past, on code, workouts, journal, and sleep. A sleep night glows only when that night is recorded, the same check as the gold square. A 10-day streak day under 21 stays the solid gold square, with no glow. On a phone the cell glow is 3px, so it stays inside the 1px gap. Each legend's 21+ swatch is that glowing cell. `habits.css` and `habits.js` are `?v=2.05`.

v2.06: streak days use the same colour steps as every other active day, on code, workouts, journal, and sleep, in both themes. The gold cell, the gold glow, and the legend items "10-day streak" and "21+" are gone. Longest streak and current streak stay. Each grid has five colour steps plus the empty gray square. The cuts are the 20th, 40th, 60th, and 80th of that grid's own nonzero days in the year on screen. A tied cut moves up to the next value that grid actually has, so a step is not skipped. On the year through 2026-10-10 those cuts are: code contributions 1 / 2 / 3 / 5 (then 6+), workout minutes 62 / 86 / 117 / 168, journal notes 1 / 2 / 3 / 6, sleep score 38 / 55 / 64 / 75. The legend is the empty square and those five steps. Sleep is rescored for a 6 hour target. A night with no record stays empty. `habits.css` and `habits.js` are `?v=2.06`.

v2.07: the code grid uses a fixed five-step scale, set by hand from the nonzero code days on and after 2026-09-29 (when the bot work started). Those 12 days are 5, 6, 9, 18, 21, 25, 26, 30, 37, 45, 54, and 62. The steps are 1–10, 11–24, 25–36, 37–50, and 51+, which puts them at 3, 2, 3, 2, and 2. A day before that just falls into whichever step its count hits, so the older 1, 2, and 3 contribution days all sit on the first step. Workouts, journal, and sleep stay on their own percentiles. `habits.css` and `habits.js` are `?v=2.07`.

v2.08: the column is sleep, fitness, code, journal, and the intro walks that same order. The fitness title is the old workouts graph. The data file stays `site/habits/workouts.json`. Share text names sleep, fitness, code, and journal. From 2026-09-29 a journal day is one daily update in `site/daily-update/recaps.json`, count 1. Earlier days keep the Obsidian note counts. On the year through 2026-10-10 the journal cuts are 1 / 2 / 3 / 4 (then 5+), with 50, 10, 8, 3, and 16 days. Eleven days since 2026-09-29 have an update: Sep 29, Sep 30, Oct 1, and Oct 3 through Oct 10. Oct 2 has none. `habits.css` and `habits.js` are `?v=2.08`.

v2.09: a journal day from 2026-09-29 on is named "1 daily update" on hover. If the recaps file fails to load, the journal grid keeps the Obsidian note counts instead of going blank. `habits.js` is `?v=2.09`.

v2.10: the homepage no longer shows the 📝 daily update line. `/daily-update/` and `site/daily-update/recaps.json` stay. From 2026-09-29 a daily update adds one note on top of that day's Obsidian count, and the hover says "N notes". If the recaps file fails to load, the journal grid keeps the Obsidian counts. On the year through 2026-10-10 the journal cuts are 1 / 2 / 3 / 6 (then 7+), with 42, 10, 8, 13, and 15 days. Sep 28 stays 7 notes. Oct 2 stays 9, because that day has no update. The eleven update days are Sep 29 (6), Sep 30 (38), Oct 1 (13), Oct 3 (11), Oct 4 through Oct 7 (7), and Oct 8 through Oct 10 (1). `habits.css` and `habits.js` are `?v=2.10`.

v2.11: `site/habits/journal-jarvis.json` is a counts-only date map, and it starts empty. Each count adds on top of that day's journal total. A missing file or a failed fetch leaves the grid as it was. A day with jarvis entries says "N journal entries". A daily-update day keeps "N notes" and adds "+ N entries". `habits.js` is `?v=2.11`.

v2.12: the matrix rain matches the homepage on every page that has it. Rain behind the text stays at 75%. The footer is not dimmed. Subpages had been holding that rain at 30%, which also dropped glyphs under the draw cutoff, so the same drops looked thinner. A tall page keeps the homepage's drop count on each screen instead of spreading that count down the whole document. `rain.css` and `rain.js` are `?v=2.04`. `foot.js` stays `?v=2.03`.

v2.13: `site/habits/journal-jarvis.json` adds 7 on 2026-10-08 and 9 on 2026-10-09. Those days already have a daily update and no Obsidian count, so the journal totals are 8 and 10. The hover is "1 note + 7 entries" and "1 note + 9 entries".

v2.14: the /daily-update/ page is taken down (it now 404s) and removed from the sitemap and the homepage. `site/daily-update/recaps.json` stays as the record and still feeds the habits journal count; no new updates are published to it.

v2.15: workouts include 2026-10-10 (one 136-minute ride). The ride is one code session on that day. The public files stay per-day counts. `habits.css` is `?v=2.11`. `habits.js` is `?v=2.12`.

v2.16: `/` is the habits page, and it is the only page. The grids (sleep, fitness, code, journal), the matrix rain, and the footer are the homepage. The social row still leads with the pulsing ninja. `habits.css` and `habits.js` are `?v=2.16`. The page loads them, and the data, from the site root: `/habits/habits.css`, `/habits/habits.js`, `/habits/workouts.json`, `/habits/cursor.json`, `/habits/sleep.json`, `/habits/journal.json`, `/habits/journal-jarvis.json`, `/habits/trackers.json`, and `/daily-update/recaps.json`. Every other HTML page redirects to `/` with a meta refresh and `location.replace` (GitHub Pages has no server redirects). That includes `/habits/`, `/song-of-the-day/`, `/quote-of-the-day/`, `/snap-of-the-day/`, `/now/`, `/confirmed/`, the day pages, and the 404. Their data stays: `quotes.json`, `songs.json`, `snaps.json`, the snap images, and `recaps.json`. The og images stay. The sitemap lists only `https://jaytha.ninja/`. The homepage title is the habits one, the canonical url is `https://jaytha.ninja/`, and the meta, Open Graph, and Twitter descriptions are lowercase with no periods (`a year of habits // sleep, fitness, code, and journal`). A visually hidden `h1` reads `jay tha ninja habits`. The October 10 ride stays in `workouts.json` and `cursor.json`.

v2.17: the homepage column is centered in the viewport on every width. Headings, stats, legends, the email field, the social row, and the konami row are center-justified. The grids stay full-width blocks inside that column. The ninja is still first, and the row itself is centered. The Buttondown form is back (no line above it; the placeholder is `subscribe for updates`). The rocket is the liftoff button on that form, and the konami code is the pre-v2.16 row (up up down down left right left right b a, then Enter or start). `/confirmed/` is the old "you're in" page again. The other HTML pages still redirect to `/`. The sitemap stays `/` only. `habits.css` is `?v=2.17`. `foot.js` is `?v=2.17`. `signup.js` is `?v=2.17`. The hidden `h1` and the lowercase descriptions stay.

v2.18: the speed hint at the top of `/` is gone. Tapping the page still changes the rain speed, and the konami code still runs (up up down down left right left right b a, then Enter or start). The social row is the title, above the grids. There is 48px above it on desktop and 32px on a phone. The ninja is still first. That row and the konami row (still under the form) are the same width as the grids, with the items spaced `space-between`. Each control is a 44px tap target; on a narrow phone the nine social icons share the column so they stay inside the grid and do not overlap. `habits.css`, `rain.js`, `foot.js`, and `signup.js` are `?v=2.18`. The hidden `h1` and the lowercase descriptions stay.

v2.19: the ninja in the top social row pulses in the speed colour from the moment the row is on the page, before the grids finish. Reduced motion keeps a steady glow in that same colour from the start. `rain.css` is `?v=2.19`.

v2.20: the email field on `/` uses the same font family, size, weight, and letter-spacing as the grid stat labels (`current streak` and the rest): 11px on desktop, 10px on a phone, weight 400. The placeholder and the typed text share that type. The placeholder is `enter your email if you know ball`. `habits.css` and `signup.js` are `?v=2.20`.

v2.21: the email field still looks like those stat labels, but its computed font-size stays 16px on every screen so iPhone Safari does not zoom when the field is tapped. The input sits in a wrapper scaled to 11/16 on desktop and 10/16 on a phone (`transform-origin: 0 0`), and the wrapper's width and bottom margin give that scale back so the line, the placeholder, and the rocket stay where they were. The placeholder and the typed text both scale with that wrapper. `habits.css` and `signup.js` are `?v=2.21`.

v2.22: `/` opens with one line, in the slot the social row used to fill (same top padding, 44px tall). The social row sits directly under it, still the width of the grids, still spaced `space-between`, still 44px tap targets. The line uses the grid metric type (`october 2026` and the other `.sv` values): 14px on desktop, 13px on a phone, weight 500, normal letter-spacing. Its colour is the speed colour (`--c`), so a speed tap recolours it with the ninja. The words are the `line` field in `site/header.json`. That file is the only copy. Change it there. The hidden `h1` stays. `habits.css` and `foot.js` are `?v=2.22`.

v2.23: the `/` share card (`og:image` and `twitter:image`) is the four lines `don't tell your dreams to everybody around` / `some people smile, but wanna see you down` / `keep it quiet, don't make a sound` / `let your success be what shakes the ground`, on the same dark matrix card (teal rain, JetBrains Mono, `jay🥷`, rocket). It is `site/og-image.png` at 1200×630, and the same file at `site/og-image-v128.png`. `/` points at `https://jaytha.ninja/og-image.png?v=2.23`. The Open Graph and Twitter descriptions stay `a year of habits // sleep, fitness, code, and journal`. `make_cards.py now --date YYYY-MM-DD --generic` redraws that lyric card; it does not touch the `?v=` on `/`.

v2.24: every share and canonical URL is `https://jaytha.ninja/`. That is the canonical link, `og:url`, `twitter:url`, and the JSON-LD `WebSite` url on `/`, on `/confirmed/`, and on every redirect (including `/habits/` and the old day pages). The sitemap lists only that URL. The confirmed-page share button still copies `https://jaytha.ninja/?ref=friend`. Asset paths such as `/habits/habits.css` stay.

v2.25: the `/` share card is a 1200×630 screenshot of the live homepage stack. Top to bottom: the `line` in `site/header.json` (metric type, speed colour), the social row with the cartoon ninja first and glowing in that colour, the four lyric lines, the email field (`enter your email if you know ball` and the rocket), and the konami row. The page is `scripts/cards/share-replica.html`. It loads the real `habits.css`, `rain.css`, and `foot.css`. `python3 scripts/make_cards.py now --date YYYY-MM-DD --generic` screenshots it (Playwright, dark colour scheme) into `site/og-image.png` and `site/og-image-v128.png`. `/` points at `https://jaytha.ninja/og-image.png?v=2.25`. The page `<title>`, `og:title`, and `twitter:title` are `let your success be what shakes the ground`. `og:url` stays `https://jaytha.ninja/`. The Open Graph and Twitter descriptions stay `a year of habits // sleep, fitness, code, and journal`.

v2.26: the one-line header on `/` is `let your success be what shakes the ground`. That string is still only the `line` field in `site/header.json`. The type, the speed colour, and the slot above the social row are unchanged. The share card is redrawn with that header. `/` points at `https://jaytha.ninja/og-image.png?v=2.26`. The page `<title>`, `og:title`, and `twitter:title` stay `let your success be what shakes the ground`.

v2.27: the daily quotes are back, under the konami row on `/`. The feed is still `site/quote-of-the-day/quotes.json`. Each entry is `date`, `text`, and `author`, newest first. The list runs through 2026-10-12, including Elisabeth Elliot on 2026-10-11 and Paul Graham on 2026-10-12. The whole section is center-justified and appears at once after the konami row finishes. `/quote-of-the-day/` still redirects to `/`. `habits.css` and `quotes.js` are `?v=2.27`.

v2.28: the matrix rain is a fixed canvas one large viewport tall (`100lvh`, with `100vh` behind it), so it continues behind the quotes as the page scrolls. Brightness, density, the tap-anywhere speed toggle, and reduced motion are unchanged. Glyphs behind the grids and the quote list stay at the 75% floor; the footer form and konami row are not dimmed. A scroll, or iOS Safari showing and hiding its toolbar, does not rebuild the drops. A width or orientation change still does. `habits.css`, `habits.js`, `rain.css`, and `rain.js` are `?v=2.28`.

v2.29: rain glyphs behind the text are at 50% (was 75%). That is `partFloor` in `site/assets/rain.js`. The grids and the quote list use it. The footer form and konami row are still not dimmed. Density, the tap-anywhere speed toggle, reduced motion, and the fixed viewport canvas are unchanged. `rain.css` and `rain.js` are `?v=2.29`.

v2.30: rain glyphs behind the text are at 25% (was 50%). That is still `partFloor` in `site/assets/rain.js`. Nothing else about the rain changes. `rain.css` and `rain.js` are `?v=2.30`.

v2.31: `/snaps` is Jay's public Lightroom album as a photo grid, newest month first. The page is real, so it is not sent home with the other HTML redirects. The homepage does not link to it, and the sitemap stays `/` only. `scripts/sync_snaps.py` writes `site/snaps/snaps.json` plus one file per month. A nightly workflow (11:41pm America/Chicago, and manual dispatch) commits that data when the album changed and then starts the Pages deploy. `snaps.css` and `snaps.js` are `?v=2.31`.

v2.32: each month on `/snaps` is three columns below 900px and six columns from 900px. The photos are dealt round-robin into flex columns, newest first, so the top row reads left to right and those photos share one top edge. `snaps.css` and `snaps.js` are `?v=2.32`.

v2.33: the `/snaps` lightbox fills the viewport with the same 90% black and locks page scroll. The photo is centered, contained inside the safe area (about 95vw by 92vh), and the grid thumbnail is replaced by the 2048 in that same box once it loads. Arrow keys, the side arrows, a horizontal swipe, and the left and right halves of the screen move newer and older through the grid, loading the next month when the open one runs out. Esc, the close button, a tap on the letterbox outside the photo, and the back gesture close it. `snaps.css` and `snaps.js` are `?v=2.33`.

v2.34: the header line is a centered nav, `home // snaps // quotes`, on `/`, `/snaps`, and `/quotes`. The links are italic in the speed colour at the old grid-title size (21px, 17px on a phone). Each link is at least 44px tall. The current page is underlined. The ` // ` separators are not links; they are white in the dark theme and black in the light theme. The social row sits under the nav, then the page. Habit grid titles and the snaps month headings are the old header size (14px, 13px on a phone). The month headings were already that size. The daily quotes moved from under the konami row to `/quotes`, still centered, newest first, all at once, still read from `site/quote-of-the-day/quotes.json`, with the same rain floor behind the list. `/quotes` does not redirect home. `/quote-of-the-day/` still does. Page titles are `home`, `snaps`, and `quotes`. The share card image is unchanged. The homepage still has the konami row, the email field, the rocket, and the rain. `habits.css`, `habits.js`, `quotes.js`, and `snaps.css` are `?v=2.34`.

v2.35: `/quotes` describes itself as `daily quotes from jaytha.ninja` in the meta description, `og:description`, and `twitter:description`. The title stays `quotes`. The share image is still `og-image.png?v=2.26`, with `og:image:width` 1200, `og:image:height` 630, and the same `twitter:image:alt` as `/`.

v2.36: the homepage document title stays `home`. `og:title` and `twitter:title` on `/` are `let your success be what shakes the ground` again. The share card image is unchanged. The nav links match the habit grid titles: 14px, 13px on a phone, still italic, still the speed colour, still underlined on the current page, still at least 44px tall. `habits.css` is `?v=2.36`.

v2.37: the homepage habits section opens with faith, above sleep. It is yes or no. `site/habits/faith.json` holds the start date `2026-08-25` and a `no` list (empty). Every day from that date through today in America/Chicago is yes unless the date is in `no`, and a new day becomes yes in the browser without a commit. A yes day is a full cell (`data-lv="5"`, the speed colour). A no day, and any day before tracking starts, is the empty square. The legend and the stats match the other quantity grids: year, most active month, most active day, longest streak, current streak. `habits.js` is `?v=2.37`.

v2.38: the homepage habit grids fill together. One clock moves a bright speed-colour cursor across every grid at once, from the first cell through today, in about 1.5 seconds. Each cell takes its real colour as the cursor passes and stays filled. The titles are already on the page. The stats appear when the sweep ends. Reduced motion shows the filled grids at once. `habits.css` and `habits.js` are `?v=2.38`.

v2.39: faith starts 2026-06-03. `site/habits/faith.json` holds `start`, `full` (`2026-08-25`), and the `no` list. The days from the start through the day before full split evenly into levels 1, 2, 3, and 4. From the full date through today each day is level 5 unless it is listed in `no`. A streak counts any day at level 1 or higher. `habits.js` is `?v=2.39`.

v2.40: the nav is `home // snaps // tweets // quotes` on `/`, `/snaps`, `/tweets`, and `/quotes`. The styling is unchanged. `/tweets` is a centered timeline, newest first, titled `tweets`. The feed ships empty and shows `no tweets yet`. Each tweet shows its America/Chicago time (`oct 13, 2026 · 9:18 am`). One optional photo sits above the text and is lazy loaded from `site/tweets/photos/`. A photo file is `YYYY-MM-DD-HHMM.<ext>`, 24-hour Chicago time. The feed is `site/tweets/tweets.json` (`ts`, `text`, optional `photo`). `python3 scripts/add_tweet.py` appends a tweet. The page does not redirect home. The sitemap stays `/` only. `tweets.css` and `tweets.js` are `?v=2.40`.

v2.41: `/tweets` is built from `inputs/tweets/YYYY-MM-DD.md`. A tweet is a timestamped line. A photo is the next line, `  📷 YYYY-MM-DD-HHMM.<ext>`, and that file sits in the same folder. `python3 scripts/build_tweets.py` publishes only tweets at or after 2026-10-13 09:30 America/Chicago. `ts` must include an explicit offset. A photo's `w` and `h` are the published pixel size, and the image `alt` is empty. An empty feed shows `no tweets yet`. `tweets.js` is `?v=2.41`.

v2.42: a vault tweet header is `- 9:32 am —`, and the words are the indented lines under it. The builder strips `- ` and the trailing ` —`, then dedents the body. Only the first camera line is the photo. Another camera line is dropped instead of being added to the text. Raw photos in `inputs/tweets/` stay gitignored. The committed image is the EXIF-free webp.

v2.43: each tweet on `/tweets` is the time, then the photo, then the text. `tweets.css` and `tweets.js` are `?v=2.43`.

v2.44: on `/quotes`, each quote's text is left-justified. The attribution is on its own line, right-justified, in the speed color, with no leading dash. The column stays centered. `habits.css` and `quotes.js` on that page are `?v=2.44`.

v2.45: `/tweets` is a chat. Each exchange is `ts` plus `messages` (`author`, optional `text`, optional `photo`). The time stays centered. Jay is on the right, with the photo first and a small `jay` label above the text. Everyone else is on the left, with their name above the text. A vault reply is an indented `name:` line under Jay's message, and more indented lines stay with that reply. `quotes.js` guards a missing author with `(e.author || '')`. `tweets.css` and `tweets.js` are `?v=2.45`. `quotes.js` is `?v=2.45`.

v2.46: an indented `name:` line is a reply only when the name is known. The list is `tess` for now. `ps:` and links stay in the tweet text. Jay's label stays the speed color. Other names are muted. Reply text is kept as written. `tweets.css` is `?v=2.46`.

v2.47: each text block on `/tweets` sits in a frosted-glass bubble. The name stays above the bubble. Photos stay outside it, with rounded corners. The corner on the speaker's side is tighter. A browser without backdrop-filter gets a more opaque fill. `tweets.css` and `tweets.js` are `?v=2.47`.

v2.48: the `/tweets` bubble has no fill, in either theme, including when backdrop-filter is missing. The glass is a stronger blur with a little saturate, a light 1px border, and an inset highlight along the top. The words stay readable. `tweets.css` is `?v=2.48`.

v2.49: in light mode the `/tweets` bubble outline is a faint dark line (`rgba(0,0,0,.12)`) with a faint top highlight, so the glass shows on white. Dark mode stays a clear bubble with a slightly softer light edge. `tweets.css` is `?v=2.49`.

v2.50: a `/tweets` bubble has no fill and no backdrop blur. Rain glyphs inside the text read the same as the glyphs outside it. The glass is a 1.5px gradient ring and a soft outer shadow. Light mode keeps a faint dark edge so the ring shows on white. Words stay readable from the text color and text shadow. Rain behind content is one 25% floor on `/`, `/snaps`, `/tweets`, `/quotes`, and `/confirmed`. That covers the column, the snaps gallery, and the footer. On a phone the floor is the whole screen. `rain.css`, `rain.js`, `tweets.css`, `tweets.js`, `habits.js`, `quotes.js`, and `snaps.js` are `?v=2.50`.

v2.51: every name on `/tweets` is the speed color, including Tess and any later author. The glass ring is unchanged. `/snaps` rain is back to the earlier targets: the nav column and the month headings sit at 25%, and the photo grid stays full strength. A phone does not spread that floor across the snaps screen. Home, tweets, quotes, and confirmed stay at 25%. `tweets.css`, `rain.css`, `rain.js`, and `snaps.js` are `?v=2.51`.

v2.52: `/snaps` rain is full strength, with no floor. Home, tweets, quotes, and confirmed are 50% behind content. On a phone that 50% covers the whole screen. Names on `/tweets` stay the speed color. `rain.css`, `rain.js`, `snaps.js`, `tweets.js`, `habits.js`, and `quotes.js` are `?v=2.52`.

v2.53: `/tweets` adds the 2:42 pm exchange from 2026-10-13. Jay asks about the Yeti e-bike golden sticker. Tess's reply says the bike is yeti turquoise (Turq carbon, obviously).

v2.54: the 2:42 pm exchange includes its photo, `2026-10-13-1442.webp`, EXIF-free.

v2.55: rain behind content is 25% on home, snaps, tweets, quotes, and confirmed. On a phone that floor is the whole screen. `rain.css`, `rain.js`, `snaps.js`, `tweets.js`, `habits.js`, and `quotes.js` are `?v=2.55`.

v2.56: `/tweets` adds the 4:16 pm exchange. Jay's photo is `2026-10-13-1616.webp`, EXIF-free. Tess answers the slim jim and jump-line note.

v2.57: `/tweets` adds the 5:27 pm exchange. Jay's photo is `2026-10-13-1727.webp`, EXIF-free. Tess reads the boarded-off ramp as a closed feature.

v2.58: `/tweets` adds the 5:28 pm exchange. Jay's photo is `2026-10-13-1728.webp`, EXIF-free. Tess keeps the 6:16 pm deadline.

v2.59: `/tweets` is down. The nav is `home // snaps // quotes` on `/`, `/snaps`, and `/quotes`. `/tweets` redirects to `/`. The public page, `tweets.json`, and the published photos are gone. The journal grid is unchanged. `habits.css` is `?v=2.59`.

v2.60: one line under the homepage email field reads `ball knowers, lemme know when you got it`. It uses the placeholder's family, weight, visual size, and colour. `habits.css` is `?v=2.60` on `/`.

v2.61: that line sits under the konami row. The gap above it matches the gap between the email field and the konami row. `habits.css` is `?v=2.61` on `/`.

v2.62: the line under the konami row is gone. The homepage email placeholder is `enter email for liftoff, or cheat code below`. The field's accessible name stays `email`. `habits.css` is `?v=2.62` on `/`.

v2.63: the header line is `planned obsolescence`, plain text in the normal text colour, italic, the same size and place as the old nav. `/snaps` and `/quotes` redirect to `/`. `/confirmed/` stays. `habits.css` is `?v=2.63` on `/`.

v2.64: threads and strava are gone from the social row. The remaining icons stay evenly spaced. `foot.js` is `?v=2.64`.

v2.65: Apple exercise minutes are 303 on 2026-10-13 and 76 on 2026-10-14. The exercise map runs through 2026-10-14. October 14 has no workout and no ride.

v2.66: 2026-10-14 is one 76-minute bike ride (`ride_min` 76). Exercise minutes stay 76. The code grid adds 8 ride points (76 minutes, half up per 10).

data 2026-10-18: Apple Health export from 2026-10-18 merged. Sleep scores for 2026-10-15 to 2026-10-18 (64, 96, 20, 70). Exercise minutes are 79 on 2026-10-14 (the full-day number; 76 was a 6:42 pm screenshot), 10, 116 and 113 on 2026-10-15 to 2026-10-17, and 1 on 2026-10-18 so far. Workouts are unchanged: the export has no workouts after 2026-10-13, the 2026-10-13 Strava rides keep their manual moving times, and 2026-10-14 stays one 76-minute ride. cursor.json is refreshed from GitHub through 2026-10-18.
data 2026-10-20: Apple Health export from 2026-10-20 (08:05 CT) merged. Sleep scores for 2026-10-19 and 2026-10-20 (91, 50); earlier nights are unchanged. Exercise minutes are 136 on 2026-10-18 (was 1 at the last export), 107 on 2026-10-19 and 1 on 2026-10-20 so far. Strava synced three rides into Health, now on the grid: 2026-10-16 (118 min, 11.4 mi), 2026-10-17 (131 min, 12.3 mi) and 2026-10-18 (136 min, 10.9 mi), Strava elapsed times. 2026-10-19 has Watch cycling samples but no workout, so no ride was added. cursor.json is refreshed from GitHub through 2026-10-20.
data 2026-10-20 (ride): the 2026-10-19 Afternoon Ride is added by hand from Jay's Strava screenshot (5:03 pm CT, Dallas TX, 11.47 mi, 103 min moving time, avg HR 152, 936 ft). Strava shows only moving time, like the 2026-10-13 manual rides. Exercise minutes for 2026-10-19 stay Apple's 107. A later export or Strava sync of the same ride is deduped by date and start time and dropped.

v2.72 (2026-10-19): `/` is the snaps page and the grids moved to `/habits/`. `/snaps/` redirects to `/`. The ninja links to `/habits/` from `/` and home from every other page. `scripts/habits.py` checks and stamps `site/habits/index.html`. The homepage share image is `og-snaps.jpg`.

v2.74: the GitHub account is `jayroddi` (renamed from `jaythaninja`). `trackers.json` and `cursor.json` use the `jayroddi` login and `jayroddi/...` repo names, and the social row links to https://github.com/jayroddi. The Buttondown form still posts to `embed-subscribe/jaythaninja` (that is the Buttondown account, not GitHub). The domain is still jaytha.ninja.
v2.75 / css 2.68 (2026-10-20): the top line is plain text, "by jay, a millennial living out loud", in --fg (white dark, black light). Below it the nav is back as `snaps // quotes // habits` (/, /quotes/, /habits/) in the speed colour --c with --fg separators; the current page is underlined (1px, .2em). The ninja links are unchanged.
v2.77 (2026-10-20): the grids page is /me/ (site/me/index.html). /habits/ is a redirect to /me/ that keeps ?query and #hash; data files and scripts/habits.py keep their habits names. The nav reads snaps // quotes // me, the wolf on / links to /me/, and /me/ has the line "want to know more about me? just ask." under the header.
