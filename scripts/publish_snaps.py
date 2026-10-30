#!/usr/bin/env python3
"""Flip the public snaps grid to mid frost at 2026-11-01 00:00 America/Chicago.

The Pages workflow runs `--bake` on every deploy. That fills frost-cache/
(outside site/, so it is not uploaded). `--apply` changes the uploaded site
only at and after the gate: it copies the frost JPEGs into site/snaps/f/
and rewrites the checkout copies of snaps.json, the month files, and the
Adobe preconnect. This script does not commit.

The repo on GitHub still has rendition ids after the flip. The sync needs
them to frost the next batch. What visitors get from jayroddi.dev does not.

  python3 scripts/publish_snaps.py                 print the gate
  python3 scripts/publish_snaps.py --apply         the deploy
  python3 scripts/publish_snaps.py --bake          frost files only, no strip
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

ROOT = Path(__file__).resolve().parents[1]
CT = ZoneInfo("America/Chicago")
GATE = datetime(2026, 11, 1, 0, 0, tzinfo=CT)
DROP = ("v", "t", "s", "l")
PRECONNECT = '<link rel="preconnect" href="https://photos.adobe.io">\n'


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


def public_photo(photo: dict) -> dict:
    return {key: value for key, value in photo.items() if key not in DROP}


def write_json(path: Path, data) -> None:
    path.write_text(json.dumps(data, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")


def strip_public(root: Path, index: dict, months: list[tuple[Path, list]]) -> None:
    """Drop everything a browser could use to rebuild a sharp Lightroom URL."""
    snaps = root / "site" / "snaps"
    write_json(snaps / "snaps.json", {"frost": True, "months": index.get("months") or []})
    for path, rows in months:
        write_json(path, [public_photo(row) for row in rows])
    html_path = root / "site" / "index.html"
    if html_path.is_file():
        html = html_path.read_text(encoding="utf-8")
        if PRECONNECT in html:
            html_path.write_text(html.replace(PRECONNECT, "", 1), encoding="utf-8")


def stage_frost(cache_dir: Path, dest: Path, photos: list[dict]) -> None:
    """Copy baked JPEGs into the directory Pages will upload."""
    from frost import filenames

    keep: set[str] = set()
    for photo in photos:
        for name in filenames(photo):
            keep.add(name)
            src = cache_dir / name
            if not src.is_file() or src.stat().st_size <= 800:
                continue
            dest.mkdir(parents=True, exist_ok=True)
            target = dest / name
            if not target.is_file() or target.stat().st_size != src.stat().st_size:
                shutil.copyfile(src, target)
    for path in dest.glob("*.jpg"):
        if path.name not in keep:
            path.unlink()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="once the gate is open, publish frost and strip sharp urls")
    parser.add_argument("--bake", action="store_true", help="frost missing files into frost-cache/ and do not publish them")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--now", default=os.environ.get("SNAP_NOW", ""))
    args = parser.parse_args(argv)
    root = args.root.resolve()
    snaps = root / "site" / "snaps"
    now = parse_now(args.now)
    stamp = now.astimezone(CT).isoformat(timespec="seconds")
    open_gate = gate_open(now)
    if not open_gate and not args.bake:
        print(f"snaps gate closed until 2026-11-01 00:00 America/Chicago (now {stamp})")
        return 0

    from frost import bake, missing_files
    from sync_snaps import KEY, bytes_of

    index, months = load_album(snaps)
    photos = photos_of(months)
    base = index.get("base") or ""
    key = index.get("key") or KEY
    cache_dir = root / "frost-cache"
    should_bake = args.bake or (args.apply and open_gate)
    if should_bake and base and key and any(photo.get("t") and photo.get("v") for photo in photos):
        left = bake(photos, cache_dir, root / "scripts" / "snaps_frost.json", bytes_of, base, key)
        print(f"frost files still missing: {left}")
    if not open_gate:
        print(f"snaps gate closed ({stamp}); frost cache warmed, sharp renditions stay on the site")
        return 0
    if not args.apply:
        missing = missing_files(cache_dir, photos)
        print(f"snaps gate open ({stamp}); frost cache missing {missing}. re-run with --apply to publish")
        return 0
    stage_frost(cache_dir, snaps / "f", photos)
    missing = missing_files(snaps / "f", photos)
    if missing:
        print(f"snaps gate open ({stamp}), but {missing} frost files are missing; sharp renditions stay for this deploy")
        return 0
    strip_public(root, index, months)
    print(f"snaps gate open ({stamp}); this deploy serves frost only")
    return 0


if __name__ == "__main__":
    sys.exit(main())
