# habit grid mockups

These pages are not the site. Nothing here is linked from `site/`, and GitHub Pages does not upload this folder. `/habits/` stays the five grids until Jay picks one.

Open them from a server rooted at the repo (the pages load `site/habits/` and `site/assets/` by relative path):

```
python3 -m http.server 8766
```

Then:

- http://127.0.0.1:8766/mocks/habits/a-streak-on-title.html
- http://127.0.0.1:8766/mocks/habits/b-today-strip.html
- http://127.0.0.1:8766/mocks/habits/c-mobile-stats.html

A. Current streak moves onto each grid’s title. Longest streak and current streak leave the stat row, which keeps year, most active month, and most active day. Squares, gap, and column stay as they are. On a phone the title sits left and the streak sits right.

B. A today row under the subhead shows the five metrics for the current America/Chicago day. The grids below are unchanged.

C. Desktop is the current stat row. On a phone the current streak leads that grid’s stats at 18px, and the other four stats stack under it. The squares do not change.
