# /log

Draft media log. It is not on the live site until this branch is merged. Do not deploy it ahead of that.

`media.json` and `covers/` are the 2026-11-02 export of the Obsidian vault `media/` folder (`type: media-item`). 412 notes. Snaps stay photos on `/snaps`. Moments that are not media notes are not in this file.

## What the page reads

`filters` paints the bubbles, in order, emoji and count only:

| c | emoji | n in this export |
|---|---|---|
| movies | 🍿 | 173 |
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
| `img` | filename under `covers/` |
| `src` | vault folder label. Kept for the next export. Not shown. `shows` already folds tv, documentaries, and comedy |

Nothing selected shows every cover. Tapping the selected bubble clears back to all. `#movies`, `#shows`, `#books`, `#albums`, and `#games` open that filter.

## Replacing the export

Replace `site/log/media.json` and `site/log/covers/` with the next vault export of the same shape. The page does not read the Goodreads shelf or the Spotify playlist.

## Redirects

`/books/` and `/music/` forward to `/log/` with a script and a refresh meta at the top of each `index.html`. Delete those two lines to restore the shelf or the playlist. `books.js`, `books.css`, `books.json`, `covers/`, `music.js`, `music.css`, and `playlist.json` are unchanged.
