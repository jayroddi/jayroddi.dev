#!/usr/bin/env python3
"""Rebuild site/tweets/tweets.json from the vault log.

Tess writes one file per day, inputs/tweets/YYYY-MM-DD.md. A tweet starts
with a timestamped line. A photo, when there is one, is the next line:

  📷 YYYY-MM-DD-HHMM.jpg

The photo file sits in that same folder. Only tweets at or after
2026-10-13 09:30 America/Chicago are published. The feed is rewritten from
the log, newest first. Each stored ts has an explicit offset. A photo is
resized to a 1600px long edge, saved as webp, and recorded with w and h.
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / "inputs" / "tweets"
FEED = ROOT / "site" / "tweets" / "tweets.json"
PHOTOS = ROOT / "site" / "tweets" / "photos"
CHICAGO = ZoneInfo("America/Chicago")
CUTOFF = datetime(2026, 10, 13, 9, 30, tzinfo=CHICAGO)
LONG_EDGE = 1600
MAX_BYTES = 300_000
DAY_FILE = re.compile(r"^(\d{4}-\d{2}-\d{2})\.md$")
TIME_LINE = re.compile(
    r"^(?P<h>\d{1,2}):(?P<m>\d{2})\s*(?P<ap>am|pm)?\b[ \t]*(?P<text>.*)$",
    re.IGNORECASE,
)
PHOTO_LINE = re.compile(r"^[\t ]*📷\ufe0f?[ \t]+(\S+)\s*$")


@dataclass
class Tweet:
    when: datetime
    text: str
    photo: str = ""
    lines: list[str] = field(default_factory=list)


def clock(hour: int, minute: int, ap: str | None) -> tuple[int, int] | None:
    if minute > 59 or hour > 23:
        return None
    if ap:
        ap = ap.lower()
        if hour < 1 or hour > 12:
            return None
        if hour == 12:
            hour = 0 if ap == "am" else 12
        elif ap == "pm":
            hour += 12
    return hour, minute


def parse_day(path: Path) -> list[Tweet]:
    match = DAY_FILE.match(path.name)
    if not match:
        return []
    year, month, day = (int(part) for part in match.group(1).split("-"))
    tweets: list[Tweet] = []
    current: Tweet | None = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip("\r")
        photo = PHOTO_LINE.match(line)
        if photo and current is not None and not current.photo:
            current.photo = photo.group(1)
            continue
        timed = TIME_LINE.match(line.strip())
        if timed:
            parsed = clock(int(timed.group("h")), int(timed.group("m")), timed.group("ap"))
            if parsed is None:
                if current is not None:
                    current.lines.append(line)
                continue
            if current is not None:
                tweets.append(current)
            hour, minute = parsed
            when = datetime(year, month, day, hour, minute, tzinfo=CHICAGO)
            current = Tweet(when=when, text=timed.group("text"))
            continue
        if current is not None:
            current.lines.append(line)
    if current is not None:
        tweets.append(current)
    for tweet in tweets:
        extra = "\n".join(tweet.lines).strip("\n")
        text = tweet.text.strip()
        tweet.text = text + (("\n" + extra) if extra else "")
        tweet.text = tweet.text.strip()
    return [tweet for tweet in tweets if tweet.text]


def find_photo(folder: Path, name: str) -> Path | None:
    direct = folder / name
    if direct.is_file():
        return direct
    wanted = name.lower()
    for child in folder.iterdir():
        if child.is_file() and child.name.lower() == wanted:
            return child
    return None


def save_photo(src: Path, dest: Path) -> tuple[int, int]:
    try:
        from PIL import Image, ImageOps
    except ImportError as exc:
        raise SystemExit("build_tweets: a photo needs Pillow (pip install pillow)") from exc
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


def published_name(when: datetime, source_name: str) -> str:
    stem = Path(source_name).stem
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}-\d{4}", stem):
        return stem + ".webp"
    return when.strftime("%Y-%m-%d-%H%M") + ".webp"


def build(log_dir: Path = LOG) -> list[dict]:
    rows: list[dict] = []
    if not log_dir.is_dir():
        return rows
    for path in sorted(log_dir.glob("*.md")):
        for tweet in parse_day(path):
            if tweet.when < CUTOFF:
                continue
            entry = {"ts": tweet.when.isoformat(timespec="seconds"), "text": tweet.text}
            if tweet.photo:
                src = find_photo(path.parent, tweet.photo)
                if src is None:
                    print(f"build_tweets: missing photo {tweet.photo}", file=sys.stderr)
                else:
                    name = published_name(tweet.when, src.name)
                    width, height = save_photo(src, PHOTOS / name)
                    entry["photo"] = name
                    entry["w"] = width
                    entry["h"] = height
            rows.append(entry)
    rows.sort(key=lambda row: row["ts"], reverse=True)
    return rows


def write(rows: list[dict]) -> None:
    FEED.parent.mkdir(parents=True, exist_ok=True)
    PHOTOS.mkdir(parents=True, exist_ok=True)
    keep = {row.get("photo") for row in rows if row.get("photo")}
    for child in PHOTOS.iterdir():
        if child.name == ".gitkeep" or not child.is_file():
            continue
        if child.name not in keep:
            child.unlink()
    FEED.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> None:
    rows = build()
    write(rows)
    print(f"build_tweets: {len(rows)}")


if __name__ == "__main__":
    try:
        main()
    except BrokenPipeError:
        sys.exit(0)
