#!/usr/bin/env python3
"""Mid frosted glass for a snap rendition.

Jay picked the mid column: a Pillow two-pass Gaussian blur at 0.06 of the
long edge, saturation 0.75, brightness 1.08, a 0.28 white haze, and mono
grain with sigma 12 (numpy seed 1). The blur runs on the rendition itself,
so a 640 and a 1280 come out at the same strength.

`bake` writes site/snaps/f/{asset}.jpg from the 640 and {asset}-l.jpg from
the 1280 (else the 2048, else the 640). The cache is keyed by filename so a
new rendition id replaces the file and an unchanged one is not downloaded
again. Callers pass only photos dated on or after FROST_FROM. Older snaps
stay the sharp Lightroom rendition.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

# radius as a fraction of the long edge, saturation, brightness, haze, grain sigma.
# This is the mid column Jay picked. There is no heavier recipe in the repo.
MID = (0.06, 0.75, 1.08, 0.28, 12)
RECIPE = "mid-v1"
# Chicago capture date. Callers frost only photos on this day or later.
FROST_FROM = "2026-11-01"
_ID = re.compile(r"^[0-9a-f]{16,64}$")
MIN_BYTES = 800


def dated_for_frost(photo: dict) -> bool:
    """True when the snap's Chicago capture date is on or after the frost cutoff."""
    day = photo.get("d")
    if not isinstance(day, str) or len(day) < 10:
        return False
    return day[:10] >= FROST_FROM


def _tag(rendition: str) -> str:
    return RECIPE + ":" + rendition


def frost_mid(im: Image.Image) -> Image.Image:
    radius, sat, bright, haze, noise = MID
    im = ImageOps.exif_transpose(im).convert("RGB")
    width, height = im.size
    rad = radius * max(width, height)
    small = im.resize((max(1, width // 4), max(1, height // 4)), Image.Resampling.LANCZOS)
    small = small.filter(ImageFilter.GaussianBlur(rad / 4))
    out = small.resize((width, height), Image.Resampling.BICUBIC)
    out = out.filter(ImageFilter.GaussianBlur(rad / 8))
    out = ImageEnhance.Color(out).enhance(sat)
    out = ImageEnhance.Brightness(out).enhance(bright)
    out = Image.blend(out, Image.new("RGB", (width, height), (255, 255, 255)), haze)
    grain = np.random.default_rng(1).normal(0, noise, (height, width, 1))
    arr = np.asarray(out).astype(float) + grain
    return Image.fromarray(arr.clip(0, 255).astype("uint8"))


def jpeg_bytes(im: Image.Image) -> bytes:
    buf = BytesIO()
    im.save(buf, format="JPEG", quality=88)
    return buf.getvalue()


def filenames(photo: dict) -> list[str]:
    asset = photo.get("i")
    if not isinstance(asset, str) or not _ID.fullmatch(asset):
        return []
    return [f"{asset}.jpg", f"{asset}-l.jpg"]


def rendition_url(base: str, key: str, asset: str, revision: str, rendition: str) -> str:
    if not base.endswith("/"):
        base += "/"
    return (
        f"{base}assets/{asset}/revisions/{revision}/renditions/{rendition}"
        f"?api_key={urllib.parse.quote(key, safe='')}"
    )


def _sources(photo: dict) -> list[tuple[str, str]]:
    """(rendition id, filename). Empty once the public JSON has been stripped."""
    names = filenames(photo)
    revision = photo.get("v")
    thumb = photo.get("t")
    if len(names) != 2 or not isinstance(revision, str) or not revision:
        return []
    if not isinstance(thumb, str) or not thumb:
        return []
    big = photo.get("s") or photo.get("l") or thumb
    if not isinstance(big, str) or not big:
        big = thumb
    return [(thumb, names[0]), (big, names[1])]


def _cache(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def _ready(path: Path) -> bool:
    try:
        return path.is_file() and path.stat().st_size > MIN_BYTES
    except OSError:
        return False


def missing_files(dest: Path, photos: list[dict]) -> int:
    missing = 0
    for photo in photos:
        for name in filenames(photo):
            if not _ready(dest / name):
                missing += 1
    return missing


def bake(photos: list[dict], dest: Path, cache_path: Path, fetch, base: str, key: str) -> int:
    """Frost whatever is missing. Returns how many frost files are still absent.

    Pass only photos that should be frosted. An empty list clears dest, so a
    caller that filters to the cutoff does not leave older glass behind.
    A photo with no rendition ids (the stripped public JSON) is left alone.
    Files for assets not in this list are removed. One bad download does not
    delete a file that is already there.
    """
    dest.mkdir(parents=True, exist_ok=True)
    for part in dest.glob("*.part"):
        part.unlink()
    cache = _cache(cache_path)
    keep: set[str] = set()
    groups: dict[str, dict] = {}
    for photo in photos:
        asset = photo.get("i")
        revision = photo.get("v")
        for name in filenames(photo):
            keep.add(name)
        if not isinstance(asset, str) or not isinstance(revision, str):
            continue
        for rendition, name in _sources(photo):
            target = dest / name
            if cache.get(name) == _tag(rendition) and _ready(target):
                continue
            slot = groups.get(rendition)
            if slot is None:
                groups[rendition] = {
                    "url": rendition_url(base, key, asset, revision, rendition),
                    "names": [name],
                }
            elif name not in slot["names"]:
                slot["names"].append(name)

    def one(item: tuple[str, dict]) -> tuple[str, list[str], bytes]:
        rendition, info = item
        blob = fetch(info["url"])
        with Image.open(BytesIO(blob)) as im:
            data = jpeg_bytes(frost_mid(im))
        if len(data) <= MIN_BYTES:
            raise OSError(f"{rendition} frost was {len(data)} bytes")
        return rendition, info["names"], data

    total = len(groups)
    if total:
        print(f"frosting {total} renditions", file=sys.stderr)
    done = 0
    if groups:
        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = [pool.submit(one, item) for item in groups.items()]
            for fut in as_completed(futures):
                try:
                    rendition, names, data = fut.result()
                except Exception as err:  # noqa: BLE001 - one bad rendition should not abort the album
                    print(f"frost failed: {err}", file=sys.stderr)
                    continue
                for name in names:
                    tmp = dest / f"{name}.part"
                    tmp.write_bytes(data)
                    tmp.replace(dest / name)
                    cache[name] = _tag(rendition)
                done += 1
                if done % 25 == 0 or done == total:
                    print(f"frost {done}/{total}", file=sys.stderr)
                    _write_cache(cache_path, cache, keep)

    for path in dest.glob("*.jpg"):
        if path.name not in keep:
            path.unlink()
    _write_cache(cache_path, cache, keep)
    return missing_files(dest, photos)


def _write_cache(path: Path, cache: dict, keep: set[str]) -> None:
    kept = {name: cache[name] for name in sorted(keep) if name in cache}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(kept, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")
