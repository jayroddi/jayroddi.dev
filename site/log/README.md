# /log

Media log. `/music/` and `/books/` forward here.

`media.json` and `covers/` are the 2026-11-02 export with the two untitled book twins removed, the swapped Ryan Holiday note for Right Thing, Right Now removed, and Fighting for Your Marriage While Separated by Linda Rooks removed, plus the 2026-11-04 midnight vault sync (In Rainbows by Radiohead, and six older vault notes the first export missed: Avatar, both early Pirates of the Caribbean films, Spider-Man: Into the Spider-Verse, Jo Koy: Live in Seattle, and The Legend of Zelda: Link’s Awakening). This sync added Godzilla Minus Zero (2026-11-05), Backstreet Boys (2026-11-04), and Mirror's Edge OST by Solar Fields (2026-11-03). The 2026-11-06 note is The Boy Who Was Raised as a Dog by Bruce D. Perry & Maia Szalavitz. The 2026-11-08 note is AMERICAN MOTOR SPORTS (420CC EDITION) by Bilmuri. The 2026-07-26 note is The Odyssey. Gold is on that film, You Can See Everything, and the Bilmuri album. 479 notes (was 478). A cover is only an embedded `![[…]]` image. A note with no embed has `img: null` and the tile shows the title, not a nearby file. Snaps stay photos on `/snaps`. Moments that are not media notes are not in this file.

## What the page reads

`filters` paints the chips, in order. `all` is the word `all` (lowercase), with no count. The rest are emoji and a count:

| c | chip | n in this export |
|---|---|---|
| all | all | 479 |
| movies | 🍿 | 178 |
| shows | 📺 | 27 (tv + documentaries + comedy, already one bucket) |
| books | 📚 | 111 |
| albums | 💿 | 155 |
| games | 🎮 | 8 |

`groupBy` is `year`. `months` is newest first (`m` is a year such as `2026`, or the undated key `2015-2020`; `n` is how many notes). Sections are built from each note: a full date uses `d.slice(0, 4)`, and any other `d` (the undated books) stays as that literal key. `months` only orders keys it still lists. A year heading is the year (`2026`). `bucketLabel` maps `2015-2020` to the heading `2015 - 2020`. Notes inside a year stay newest first.

Each item:

| field | meaning |
|---|---|
| `i` | id |
| `d` | date `YYYY-MM-DD` |
| `c` | `movies`, `shows`, `books`, `albums`, or `games` |
| `t` | title |
| `a` | artist or author, or null |
| `r` | rating (`★★★★☆`) or null. Drawn quiet on the tile when set |
| `img` | filename under `covers/`, or null when the note has no embedded cover |
| `glow` | optional. `gold` pulses gold. `orange`, `teal`, or `favorite` pulse orange. Omitted means no glow |
| `src` | vault folder label. Kept for the next export. Not shown. `shows` already folds tv, documentaries, and comedy |

`all` is selected on load and shows every note. Tapping the selected category chip returns to `all`. Tapping `all` while it is selected stays on `all`. `#movies`, `#shows`, `#books`, `#albums`, and `#games` open that filter. An empty hash is `all`.

Search is hidden and takes no space. A downward pull at the top of the page, the same gesture as a refresh pull, reveals one pill under the chips. It is centered, the same height, border, background, and type as a chip, and as wide as the chip row including the gaps. A magnifying glass sits inside the right edge. The placeholder is `search`. It matches titles and authors as you type, ignoring case, and keeps the selected chip and the year groups. Clearing it shows that chip again. No match says `nothing here`. The pull does not focus the field. Tab reaches it, and Escape clears it, then closes it.

The same title and author render once. Punctuation and spacing fold together (`Right Thing, Right Now` and `Right Thing Right Now`). On books, a subtitle after a colon folds into that short title, and a note that swaps the title and the author folds into the real entry. The fuller title stays. A rating, glow, or cover on the dropped note is kept when the one that stays is missing it. Chip counts follow the folded list. Sequels, editions, remasters, and both 101 Dalmatians stay, because the leftover words are not just punctuation. Fighting for Your Marriage While Separated by Linda Rooks stays out, including a swapped title and author or a subtitle after a colon.

Chips, year headings, cover rows, and a note with no cover are centered. A short year sits in the middle of the row. Three columns under 900px, six from 900px.

## Replacing the export

Replace `site/log/media.json` and `site/log/covers/` with the next vault export of the same shape. The page does not read the Goodreads shelf or the Spotify playlist.

## Redirects

`/books/` and `/music/` forward to `/log/` with a script and a refresh meta at the top of each `index.html`. Delete those two lines to restore the shelf or the playlist. `books.js`, `books.css`, `books.json`, `covers/`, `music.js`, `music.css`, and `playlist.json` are unchanged.
