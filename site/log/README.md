# /log

Media log. `/music/` and `/books/` forward here.

`media.json` and `covers/` are the 2026-11-02 export with the two untitled book twins removed, the swapped Ryan Holiday note for Right Thing, Right Now removed, and Fighting for Your Marriage While Separated by Linda Rooks removed. 462 notes. A cover is only an embedded `![[…]]` image. A note with no embed has `img: null` and the tile shows the title, not a nearby file. Snaps stay photos on `/snaps`. Moments that are not media notes are not in this file.

## What the page reads

`filters` paints the chips, in order. `all` is the word `all` (lowercase), with no count. The rest are emoji and a count:

| c | chip | n in this export |
|---|---|---|
| all | all | 462 |
| movies | 🍿 | 171 |
| shows | 📺 | 26 (tv + documentaries + comedy, already one bucket) |
| books | 📚 | 110 |
| albums | 💿 | 148 |
| games | 🎮 | 7 |

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

The same title and author render once. Punctuation and spacing fold together (`Right Thing, Right Now` and `Right Thing Right Now`). On books, a subtitle after a colon folds into that short title, and a note that swaps the title and the author folds into the real entry. The fuller title stays. A rating, glow, or cover on the dropped note is kept when the one that stays is missing it. Chip counts follow the folded list. Sequels, editions, remasters, and both 101 Dalmatians stay, because the leftover words are not just punctuation. Fighting for Your Marriage While Separated by Linda Rooks stays out, including a swapped title and author or a subtitle after a colon.

Chips, year headings, cover rows, and a note with no cover are centered. A short year sits in the middle of the row. Three columns under 900px, six from 900px.

## Replacing the export

Replace `site/log/media.json` and `site/log/covers/` with the next vault export of the same shape. The page does not read the Goodreads shelf or the Spotify playlist.

## Redirects

`/books/` and `/music/` forward to `/log/` with a script and a refresh meta at the top of each `index.html`. Delete those two lines to restore the shelf or the playlist. `books.js`, `books.css`, `books.json`, `covers/`, `music.js`, `music.css`, and `playlist.json` are unchanged.
