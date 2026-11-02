# /log

Draft media log. It is not on the live site until this branch is merged. Do not deploy it ahead of that.

`media.json` and `covers/` are the 2026-11-02 export of the Obsidian vault `media/` folder (`type: media-item`). 414 notes. A cover is only an embedded `![[…]]` image. A note with no embed has `img: null` and the tile shows the title, not a nearby file. Snaps stay photos on `/snaps`. Moments that are not media notes are not in this file.

## What the page reads

`filters` paints the chips, in order. `all` is the word `all` (lowercase) plus its count. The rest are emoji and count only:

| c | chip | n in this export |
|---|---|---|
| all | all | 414 |
| movies | 🍿 | 175 |
| shows | 📺 | 27 (tv + documentaries + comedy, already one bucket) |
| books | 📚 | 56 |
| albums | 💿 | 148 |
| games | 🎮 | 8 |

`months` is newest first (`m` is `YYYY-MM`, `n` is how many notes). The grid follows that order. A month heading is lowercase (`march 2026`).

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
| `src` | vault folder label. Kept for the next export. Not shown. `shows` already folds tv, documentaries, and comedy |

`all` is selected on load and shows every note. Tapping the selected category chip returns to `all`. Tapping `all` while it is selected stays on `all`. `#movies`, `#shows`, `#books`, `#albums`, and `#games` open that filter. An empty hash is `all`.

Chips, month headings, cover rows, and a note with no cover are centered. A short month sits in the middle of the row. Three columns under 900px, six from 900px.

## Replacing the export

Replace `site/log/media.json` and `site/log/covers/` with the next vault export of the same shape. The page does not read the Goodreads shelf or the Spotify playlist.

## Redirects

`/books/` and `/music/` forward to `/log/` with a script and a refresh meta at the top of each `index.html`. Delete those two lines to restore the shelf or the playlist. `books.js`, `books.css`, `books.json`, `covers/`, `music.js`, `music.css`, and `playlist.json` are unchanged.
