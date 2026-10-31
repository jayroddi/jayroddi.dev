#!/usr/bin/env python3
"""Stage mid-frost JPEGs for the snaps grid without dropping sharp URLs.

The Pages workflow runs `--bake` then `--apply` on every deploy. `--bake`
fills frost-cache/ (outside site/, so it is not committed). `--apply` copies
whatever frost JPEGs are ready into site/snaps/f/ for that upload.

Sharp Lightroom ids stay in snaps.json and the month files. A locked browser
asks for the frost JPEG on the newest months and falls back to the sharp URL
under a CSS blur if a frost file is missing. Solving the day's puzzle loads
the sharp URL directly. This script does not commit.

  python3 scripts/publish_snaps.py                 print how many frost files are missing
  python3 scripts/publish_snaps.py --apply         copy frost JPEGs into site/snaps/f/
  python3 scripts/publish_snaps.py --bake          frost missing files into frost-cache/
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
    if dest.is_dir():
        for path in dest.glob("*.jpg"):
            if path.name not in keep:
                path.unlink()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="copy baked frost JPEGs into site/snaps/f/ and keep sharp urls")
    parser.add_argument("--bake", action="store_true", help="frost missing files into frost-cache/ and do not publish them")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--now", default=os.environ.get("SNAP_NOW", ""))
    args = parser.parse_args(argv)
    root = args.root.resolve()
    snaps = root / "site" / "snaps"
    now = parse_now(args.now)
    stamp = now.astimezone(CT).isoformat(timespec="seconds")

    from frost import bake, missing_files
    from sync_snaps import KEY, bytes_of

    index, months = load_album(snaps)
    photos = photos_of(months)
    base = index.get("base") or ""
    key = index.get("key") or KEY
    cache_dir = root / "frost-cache"
    if args.bake and base and key and any(photo.get("t") and photo.get("v") for photo in photos):
        left = bake(photos, cache_dir, root / "scripts" / "snaps_frost.json", bytes_of, base, key)
        print(f"frost files still missing from cache: {left}")
    if args.bake and not args.apply:
        print(f"frost cache warmed ({stamp}); sharp renditions stay on the site")
        return 0
    if not args.apply:
        missing = missing_files(cache_dir, photos)
        print(f"frost cache missing {missing} ({stamp}); sharp renditions stay in the JSON")
        return 0
    stage_frost(cache_dir, snaps / "f", photos)
    missing = missing_files(snaps / "f", photos)
    print(f"frost staged ({stamp}); {missing} still missing; sharp renditions stay in the JSON")
    return 0


if __name__ == "__main__":
    sys.exit(main())
