#!/usr/bin/env python3
"""Append one tweet to site/tweets/tweets.json.

  python3 scripts/add_tweet.py "the words"
  python3 scripts/add_tweet.py "the words" --photo shot.jpg
  python3 scripts/add_tweet.py --text "line one
line two" --ts 2026-10-13T09:18 --photo shot.jpg

ts with no offset is America/Chicago. The photo is optional. Pillow resizes
its long edge to 1600px, strips metadata, and writes
site/tweets/photos/YYYY-MM-DD-HHMM.webp. That name is the tweet's
America/Chicago time on a 24-hour clock (9:18am CT is 0918). Newest tweets
stay at the top. The feed ships empty. A tweet with the same ts and text is
left as it is.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
FEED = ROOT / "site" / "tweets" / "tweets.json"
PHOTOS = ROOT / "site" / "tweets" / "photos"
CHICAGO = ZoneInfo("America/Chicago")
LONG_EDGE = 1600
MAX_BYTES = 300_000


def parse_ts(raw: str | None) -> datetime:
    if not raw:
        return datetime.now(CHICAGO).replace(microsecond=0)
    text = raw.strip()
    if len(text) == 16:
        text += ":00"
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError as exc:
        raise SystemExit(f"add_tweet: ts must be ISO, got {raw!r}") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=CHICAGO)
    else:
        parsed = parsed.astimezone(CHICAGO)
    return parsed.replace(microsecond=0)


def load() -> list:
    if not FEED.is_file():
        return []
    data = json.loads(FEED.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise SystemExit("add_tweet: tweets.json must be an array")
    return data


def save(rows: list) -> None:
    FEED.parent.mkdir(parents=True, exist_ok=True)
    FEED.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def photo_name(when: datetime, ext: str = ".webp") -> str:
    """YYYY-MM-DD-HHMM.<ext> from America/Chicago, 24-hour."""
    if not ext.startswith("."):
        ext = "." + ext
    return when.strftime("%Y-%m-%d-%H%M") + ext.lower()


def save_photo(src: Path, dest: Path) -> tuple[int, int]:
    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise SystemExit("add_tweet: --photo needs Pillow (pip install pillow)") from exc
    with Image.open(src) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        long_edge = max(im.size)
        if long_edge > LONG_EDGE:
            scale = LONG_EDGE / long_edge
            im = im.resize(
                (max(1, round(im.width * scale)), max(1, round(im.height * scale))),
                Image.Resampling.LANCZOS,
            )
        dest.parent.mkdir(parents=True, exist_ok=True)
        quality = 82
        while True:
            im.save(dest, "WEBP", quality=quality, method=6)
            if dest.stat().st_size <= MAX_BYTES or quality <= 50:
                break
            quality -= 8
        return im.size


def main() -> None:
    parser = argparse.ArgumentParser(description="Append one tweet to site/tweets/tweets.json")
    parser.add_argument("words", nargs="?", help="tweet text")
    parser.add_argument("--text", help="tweet text (use this when it has more than one line)")
    parser.add_argument("--photo", type=Path, help="one image to place above the text")
    parser.add_argument("--ts", help="ISO timestamp; no offset means America/Chicago")
    args = parser.parse_args()
    if args.words and args.text:
        raise SystemExit("add_tweet: pass the text once, either as the argument or as --text")
    text = (args.text if args.text is not None else args.words or "").strip()
    if not text:
        raise SystemExit("add_tweet: the tweet needs text")
    if args.photo and not args.photo.is_file():
        raise SystemExit(f"add_tweet: photo not found: {args.photo}")

    when = parse_ts(args.ts)
    stamp = when.isoformat(timespec="seconds")
    rows = load()
    for row in rows:
        if isinstance(row, dict) and row.get("ts") == stamp and str(row.get("text", "")).strip() == text:
            print(f"add_tweet: already there ({stamp})")
            return

    entry = {"ts": stamp, "text": text}
    if args.photo:
        name = photo_name(when, ".webp")
        used = any(isinstance(row, dict) and row.get("photo") == name for row in rows)
        if used or (PHOTOS / name).exists():
            raise SystemExit(f"add_tweet: {name} is already used")
        width, height = save_photo(args.photo, PHOTOS / name)
        entry["photo"] = name
        entry["w"] = width
        entry["h"] = height

    rows.append(entry)

    def instant(row: dict) -> datetime:
        try:
            return parse_ts(str(row.get("ts")))
        except SystemExit:
            return datetime.min.replace(tzinfo=CHICAGO)

    rows.sort(key=instant, reverse=True)
    save(rows)
    print(f"add_tweet: {stamp}" + (f" photo {entry['photo']}" if entry.get("photo") else ""))


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(0)
