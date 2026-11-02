# brain graph

A mock of a full-viewport 3D graph. It is not the live site. Nothing here is linked from `site/`, and `brain` is not in the pill. GitHub Pages only uploads `site/`, so this folder does not deploy.

The graph is synthetic. `generate_graph.py` writes `graph.json`. Nodes are anonymous integer ids. There are no note titles, paths, or body text. This file is not an export of a vault.

From the repo root:

```
python3 -m http.server 8766
```

Open http://127.0.0.1:8766/mocks/brain-graph/

Drag to orbit. Scroll or pinch to zoom. Right-drag, shift-drag, or a horizontal trackpad swipe pans. Two fingers on a touch screen zoom and pan. The page does not scroll. The pill and the social pill stay clickable. They go to the live site. This page is not one of those links.

The ground is black. Dark is locked. There is no subhead under the pill.

## data

`graph.json` for this mock:

| | |
|---|---|
| nodes | 2200 |
| links | 3989 |
| groups | 860, 640, 420, 280 |
| cross-group links | 107 |
| degree | min 1, median 3, max 52, mean 3.63 |

Schema, and the only keys the page will draw:

```json
{"v":1,"nodes":[{"id":0,"g":0}],"links":[{"s":0,"t":1}]}
```

`v` is 1. `id`, `g`, `s`, and `t` are integers. `g` is a coarse group, 0–3, and it may be omitted. Group numbers are not folder names. Colors are applied in `brain.js`: teal `#1AADB3`, orange `#FF4D1A`, and two muted neutrals. Node size follows degree. The page lays the graph out. The file has no coordinates.

The page refuses a file that contains a string or any other key, so a title or a path cannot render. `python3 mocks/brain-graph/generate_graph.py` rewrites the synthetic file.

## swapping in the vault

Replace `graph.json` with an anonymized export from the Mac Obsidian vault.

- Edges are wikilinks only.
- Strip paths and titles before the file is written. Ship integer ids, an optional group integer, and the edge list.
- Do not put folder names, note titles, or path fragments in keys or values. A folder can still tint a node: hash it on the machine that builds the file, down to an integer 0–3, and ship only that integer.
- Renumber ids so each node has one integer. About 5.7k notes are expected. This mock is smaller, on purpose.
- The export does not need coordinates. `layout.js` places the nodes.

## plugging into the shell

When this leaves the mock folder, copy it to `site/brain/index.html` and point the script at the same kind of JSON. Load the live `shell.css` and `shell.js` the way `/` does. Do not add `brain` to the pages array in `shell.js` until the page should be in the pill. Hide the square field on this page so the graph is the viewport. Keep overflow hidden. Do not add a subhead under the pill.

The pill in this mock is static, and the links are absolute, so they work when the server is the repo root. On the live site, `shell.js` would paint the pill instead.
