#!/usr/bin/env python3
"""Rebuild site/tweets/tweets.json from the vault log.

Tess writes one file per day, inputs/tweets/YYYY-MM-DD.md. An exchange
starts with a header. The indented lines under it are Jay's message.
A reply is an indented line whose name is in KNOWN_AUTHORS (tess, for now).
Anything else, including links and "ps:", stays in the tweet text. More
indented lines stay with that reply, and the reply text is kept as written:

- 9:32 am —
  the tweet
  another line
  📷 2026-10-13-0932.jpg
  tess: a reply
  that continues

The header loses the leading "- " and the trailing " —". Jay's body is
dedented. Only the first camera line on a message is its photo. Later
camera lines are dropped, so they do not become text. The photo file sits
in that same folder and is not committed. The published copy is an
EXIF-free webp. Only exchanges at or after 2026-10-13 09:30
America/Chicago are published.
"""

from __future__ import annotations

import json
import re
import sys
import textwrap
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
HEADER = re.compile(
    r"^(?P<h>\d{1,2}):(?P<m>\d{2})\s*(?P<ap>am|pm)\b\s*$",
    re.IGNORECASE,
)
PHOTO_LINE = re.compile(r"^📷\ufe0f?[ \t]+(\S+)\s*$")
AUTHOR_LINE = re.compile(r"^(?P<name>[A-Za-z][A-Za-z0-9_-]{0,32}):[ \t]*(?P<rest>.*)$")
KNOWN_AUTHORS = ["tess"]


@dataclass
class Message:
    author: str
    lines: list[str] = field(default_factory=list)
    photo: str = ""
    text: str = ""
    indent: str = ""


@dataclass
class Exchange:
    when: datetime
    messages: list[Message] = field(default_factory=list)


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


def header_when(line: str, year: int, month: int, day: int) -> datetime | None:
    if line.startswith((" ", "\t")) or not line.startswith("- "):
        return None
    body = line[2:].strip()
    body = re.sub(r"\s*[-—–]\s*$", "", body)
    timed = HEADER.match(body)
    if not timed:
        return None
    parsed = clock(int(timed.group("h")), int(timed.group("m")), timed.group("ap"))
    if parsed is None:
        return None
    hour, minute = parsed
    return datetime(year, month, day, hour, minute, tzinfo=CHICAGO)


def photo_name(line: str) -> str | None:
    """A camera line, or None when the line is ordinary text.

    The first camera line in a tweet is the photo. Any later one is still
    a camera line, so the file name does not fall through into the text.
    """
    stripped = line.strip()
    if not stripped.startswith("📷"):
        return None
    match = PHOTO_LINE.match(stripped)
    return match.group(1) if match else ""


def leading_space(line: str) -> str:
    index = 0
    while index < len(line) and line[index] in " \t":
        index += 1
    return line[:index]


def reply_author(line: str) -> tuple[str, str] | None:
    """A known reply, or None when the line stays in the current text.

    Only an indented name from KNOWN_AUTHORS starts a reply. A line such as
    "ps:" or a link stays tweet text.
    """
    if not line or line[0] not in " \t":
        return None
    match = AUTHOR_LINE.match(line.strip())
    if not match:
        return None
    wanted = match.group("name").lower()
    for name in KNOWN_AUTHORS:
        if name.lower() == wanted:
            return name, match.group("rest")
    return None


def finish(exchange: Exchange) -> Exchange:
    kept: list[Message] = []
    for message in exchange.messages:
        message.text = textwrap.dedent("\n".join(message.lines)).strip()
        if message.text or message.photo:
            kept.append(message)
    exchange.messages = kept
    return exchange


def parse_day(path: Path) -> list[Exchange]:
    match = DAY_FILE.match(path.name)
    if not match:
        return []
    year, month, day = (int(part) for part in match.group(1).split("-"))
    exchanges: list[Exchange] = []
    current: Exchange | None = None
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.rstrip("\r")
        named = photo_name(line)
        if named is not None:
            if current is not None and current.messages and named and not current.messages[-1].photo:
                current.messages[-1].photo = named
            continue
        when = header_when(line, year, month, day)
        if when is not None:
            if current is not None:
                exchanges.append(finish(current))
            current = Exchange(when=when, messages=[Message(author="jay")])
            continue
        if current is None or not (not line or line[0] in " \t"):
            continue
        reply = reply_author(line)
        if reply:
            name, rest = reply
            message = Message(author=name, indent=leading_space(line))
            if rest:
                message.lines.append(rest)
            current.messages.append(message)
            continue
        message = current.messages[-1]
        if message.author == "jay":
            message.lines.append(line)
            continue
        if not line.strip():
            message.lines.append("")
        elif message.indent and line.startswith(message.indent):
            message.lines.append(line[len(message.indent):])
        else:
            message.lines.append(line.strip())
    if current is not None:
        exchanges.append(finish(current))
    return [exchange for exchange in exchanges if exchange.messages]


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
        # A fresh image drops EXIF, GPS, and any other source metadata.
        clean = Image.new(im.mode, im.size)
        clean.putdata(im.getdata())
        im = clean
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


def message_row(message: Message, folder: Path, when: datetime) -> dict | None:
    item: dict = {"author": message.author}
    if message.text:
        item["text"] = message.text
    if message.photo:
        src = find_photo(folder, message.photo)
        if src is None:
            print(f"build_tweets: missing photo {message.photo}", file=sys.stderr)
        else:
            name = published_name(when, src.name)
            width, height = save_photo(src, PHOTOS / name)
            item["photo"] = name
            item["w"] = width
            item["h"] = height
    if "text" not in item and "photo" not in item:
        return None
    return item


def build(log_dir: Path = LOG) -> list[dict]:
    rows: list[dict] = []
    if not log_dir.is_dir():
        return rows
    for path in sorted(log_dir.glob("*.md")):
        for exchange in parse_day(path):
            if exchange.when < CUTOFF:
                continue
            messages = []
            for message in exchange.messages:
                item = message_row(message, path.parent, exchange.when)
                if item is not None:
                    messages.append(item)
            if messages:
                rows.append({"ts": exchange.when.isoformat(timespec="seconds"), "messages": messages})
    rows.sort(key=lambda row: row["ts"], reverse=True)
    return rows


def photo_names(rows: list[dict]) -> set[str]:
    names: set[str] = set()
    for row in rows:
        messages = row.get("messages")
        if not isinstance(messages, list):
            photo = row.get("photo")
            if isinstance(photo, str) and photo:
                names.add(photo)
            continue
        for message in messages:
            if isinstance(message, dict):
                photo = message.get("photo")
                if isinstance(photo, str) and photo:
                    names.add(photo)
    return names


def write(rows: list[dict]) -> None:
    FEED.parent.mkdir(parents=True, exist_ok=True)
    PHOTOS.mkdir(parents=True, exist_ok=True)
    keep = photo_names(rows)
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
