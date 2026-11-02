#!/usr/bin/env python3
"""Publish mid frost for snaps dated 2026-11-01 or later, America/Chicago.

The Pages workflow runs `--bake` on every deploy. That fills frost-cache/
(outside site/, so it is not uploaded) for photos whose Chicago capture
date is on or after the cutoff. Older photos are not baked. Asset ids in
scripts/snaps_clear.json are not baked either: they stay the sharp
Lightroom rendition across later syncs. The soft recipe itself does not
change.

`--apply` changes the uploaded site only at and after 2026-11-01 00:00
America/Chicago, and only for newer photos that are not clear-listed: it
copies their frost JPEGs into site/snaps/f/ and drops `v`, `t`, `s`, and
`l` from those rows, setting `f` so the grid loads the glass. Photos
captured before the cutoff, and clear-listed ids, keep their sharp
Lightroom ids. `base` and `key` stay while any sharp row remains, and so
does the Adobe preconnect. This script does not commit.

The repo on GitHub still has rendition ids after the flip. The sync needs
them to frost the next batch. A new photo whose frost file is missing keeps
its sharp URL for that deploy instead of shipping a broken tile.

Month-end policy (not scheduled): on the 1st in America/Chicago, the prior
calendar month should all go clear and the current month stays frosted
except clear-list pins. `--clear-month YYYY-MM` appends that month's asset
ids to scripts/snaps_clear.json. Commit the file afterward.
`snaps_clear.clear_month_due` names the month to pass on the 1st.

  python3 scripts/publish_snaps.py                      print the gate
  python3 scripts/publish_snaps.py --apply              the deploy
  python3 scripts/publish_snaps.py --bake               frost files only, no strip
  python3 scripts/publish_snaps.py --clear-month YYYY-MM
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from snaps_clear import add_clear_month, load_clear_ids, should_frost

ROOT = Path(__file__).resolve().parents[1]
CT = ZoneInfo("America/Chicago")
GATE = datetime(2026, 11, 1, 0, 0, tzinfo=CT)
DROP = ("v", "t", "s", "l")
PRECONNECT = '<link rel="preconnect" href="https://photos.adobe.io">\n'
HTML_NAMES = (
    Path("site") / "snaps" / "index.html",
)


def gate_open(now: datetime) -> bool:
    if now.tzinfo is None:
        now = now.replace(tzinfo=CT)
    return now.astimezone(CT) >= GATE


def parse_now(raw: str) -> datetime:
    if not raw:
        return datetime.now(CT)
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=CT)
    return dt


def load_album(snaps: Path) -> tuple[dict, list[tuple[Path, list]]]:
    index = json.loads((snaps / "snaps.json").read_text(encoding="utf-8"))
    months: list[tuple[Path, list]] = []
    for meta in index.get("months") or []:
        path = snaps / "m" / f"{meta['m']}.json"
        months.append((path, json.loads(path.read_text(encoding="utf-8"))))
    return index, months


def photos_of(months: list[tuple[Path, list]]) -> list[dict]:
    rows: list[dict] = []
    for _path, month in months:
        rows.extend(month)
    return rows


def public_photo(photo: dict, frosted: bool) -> dict:
    if not frosted:
        return dict(photo)
    kept = {key: value for key, value in photo.items() if key not in DROP}
    kept["f"] = 1
    return kept


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")


def _ready(path: Path) -> bool:
    try:
        return path.is_file() and path.stat().st_size > 800
    except OSError:
        return False


def ready_ids(cache_dir: Path, photos: list[dict]) -> set[str]:
    """Asset ids whose 640 and large frost JPEGs are both in the cache."""
    from frost import filenames

    ready: set[str] = set()
    for photo in photos:
        names = filenames(photo)
        asset = photo.get("i")
        if len(names) != 2 or not isinstance(asset, str):
            continue
        if all(_ready(cache_dir / name) for name in names):
            ready.add(asset)
    return ready


def write_public(root: Path, index: dict, months: list[tuple[Path, list]], ready: set[str], clear_ids: set[str]) -> int:
    """Strip sharp ids only on photos whose frost files are ready. Returns how many."""
    snaps = root / "site" / "snaps"
    frosted = 0
    sharp = 0
    for path, rows in months:
        public: list[dict] = []
        for row in rows:
            glass = should_frost(row, clear_ids) and row.get("i") in ready
            if glass:
                frosted += 1
            elif row.get("t") and row.get("v"):
                sharp += 1
            public.append(public_photo(row, glass))
        write_json(path, public)
    payload = {"months": index.get("months") or []}
    if sharp:
        if index.get("base"):
            payload["base"] = index["base"]
        if index.get("key"):
            payload["key"] = index["key"]
    # base and key lead the file, matching the repo index, when any sharp row remains.
    ordered = {}
    for key in ("base", "key"):
        if key in payload:
            ordered[key] = payload[key]
    ordered["months"] = payload["months"]
    write_json(snaps / "snaps.json", ordered)
    if not sharp:
        for rel in HTML_NAMES:
            html_path = root / rel
            if not html_path.is_file():
                continue
            html = html_path.read_text(encoding="utf-8")
            if PRECONNECT in html:
                html_path.write_text(html.replace(PRECONNECT, "", 1), encoding="utf-8")
    return frosted


def stage_frost(cache_dir: Path, dest: Path, photos: list[dict]) -> None:
    """Copy baked JPEGs for these photos into the directory Pages will upload."""
    from frost import filenames

    keep: set[str] = set()
    for photo in photos:
        for name in filenames(photo):
            keep.add(name)
            src = cache_dir / name
            if not _ready(src):
                continue
            dest.mkdir(parents=True, exist_ok=True)
            target = dest / name
            if not target.is_file() or target.stat().st_size != src.stat().st_size:
                shutil.copyfile(src, target)
    if dest.is_dir():
        for path in dest.glob("*.jpg"):
            if path.name not in keep:
                path.unlink()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="once the gate is open, publish frost for photos dated on or after the cutoff, skipping the clear list")
    parser.add_argument("--bake", action="store_true", help="frost missing cutoff photos into frost-cache/ and do not publish them")
    parser.add_argument("--clear-month", metavar="YYYY-MM", help="append that month's asset ids to scripts/snaps_clear.json so they stay sharp")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--now", default=os.environ.get("SNAP_NOW", ""))
    args = parser.parse_args(argv)
    root = args.root.resolve()
    snaps = root / "site" / "snaps"
    now = parse_now(args.now)
    stamp = now.astimezone(CT).isoformat(timespec="seconds")
    open_gate = gate_open(now)
    if args.clear_month:
        try:
            added, total = add_clear_month(root, args.clear_month)
        except (OSError, ValueError, json.JSONDecodeError) as err:
            print(f"clear month failed: {err}", file=sys.stderr)
            return 1
        print(f"clear-list {args.clear_month}: added {len(added)}, {total} ids in scripts/snaps_clear.json")
    if not open_gate and not args.bake:
        print(f"snaps gate closed until 2026-11-01 00:00 America/Chicago (now {stamp})")
        return 0

    from frost import bake, dated_for_frost
    from sync_snaps import KEY, bytes_of

    index, months = load_album(snaps)
    photos = photos_of(months)
    clear_ids = load_clear_ids(root)
    newer = [photo for photo in photos if should_frost(photo, clear_ids)]
    pins = sum(
        1
        for photo in photos
        if isinstance(photo.get("i"), str) and photo["i"].strip().lower() in clear_ids and dated_for_frost(photo)
    )
    if pins == 1:
        pin_note = " 1 clear-listed id stays sharp."
    elif pins:
        pin_note = f" {pins} clear-listed ids stay sharp."
    else:
        pin_note = ""
    base = index.get("base") or ""
    key = index.get("key") or KEY
    cache_dir = root / "frost-cache"
    should_bake = args.bake or (args.apply and open_gate)
    if should_bake and base and key:
        left = bake(newer, cache_dir, root / "scripts" / "snaps_frost.json", bytes_of, base, key)
        print(f"frost files still missing: {left} of {len(newer)} photos to frost")
    if not open_gate:
        print(f"snaps gate closed ({stamp}); frost cache warmed for new photos, sharp renditions stay on the site")
        return 0
    if not args.apply:
        ready = ready_ids(cache_dir, newer)
        print(f"snaps gate open ({stamp}); {len(ready)} of {len(newer)} new photos have frost files.{pin_note} re-run with --apply to publish")
        return 0
    ready = ready_ids(cache_dir, newer)
    stage_frost(cache_dir, snaps / "f", [photo for photo in newer if photo.get("i") in ready])
    frosted = write_public(root, index, months, ready, clear_ids)
    waiting = len(newer) - len(ready)
    sharp = len(photos) - len(newer)
    if waiting:
        print(f"snaps gate open ({stamp}); {frosted} photos frosted, {sharp} stay sharp, {waiting} new photos still waiting on frost files.{pin_note}")
    else:
        print(f"snaps gate open ({stamp}); {frosted} photos frosted, {sharp} stay sharp.{pin_note}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
