# motion study

A mock of a jayroddi.dev homepage. It is not the live site. Nothing here is linked from `site/`. GitHub Pages only uploads `site/`, so this folder does not deploy.

From the repo root:

```
python3 -m http.server 8766
```

Open http://127.0.0.1:8766/mocks/motion-portfolio/

JetBrains Mono and the scroll library load from a CDN, so the browser needs a network.

## what this borrows

Layout and motion only, from a study of thakursameershetty.com. The coral, the pixel display face, the lego scene, the floppy disks, and the copy stay there.

- A floating pill stays pinned. The section in view turns cream.
- The hero is full bleed. Scroll and the field drifts, then dissolves to black.
- A manifesto starts grey. Words turn warm white one after another.
- Cream keycaps have a light top and a dark bottom edge. Pressing one sinks it.
- A pixel skyline wipes into a full-bleed teal footer. The teal is `#1AADB3`.
- Prose sits in a column about 640px wide. The hero and the footer are the color blocks, with long black gaps between them.

## the object

Habit squares, in a case. Grind is the homepage, and the squares are already how that year is drawn, so the work toy is a tray of five of them: grind, snaps, music, books, quotes. Grind and snaps are marked. Hover lifts them out of the case. Click sets one down in the well and marks its card. Click the case, or press Escape, and they go back.

Snaps is the frosted square. Frost panes, a cassette, and the candle tape are not a second toy.

## sound

Off until the small pill says otherwise. The pill starts as `sound off`. Turning it on plays a short quiet tick on the squares and the keycaps. Nothing plays on load.

## type

One family. JetBrains Mono italic is the display. Upright JetBrains Mono, tracked, is the labels. Upright JetBrains Mono at 16px is the body.

If the browser asks for less motion, the words are already white, the squares still move into place without a tween, and the footer skyline is already teal.
