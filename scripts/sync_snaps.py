#!/usr/bin/env python3
"""Sync Jay's public Lightroom album into site/snaps/.

The share page cannot be framed. The listing is:

  GET https://photos.adobe.io/v2/spaces/70e5cd134b2e42feae9e82952152c5e8/resources
  header x-api-key: LightroomMobileWeb1

Each body is JSON after a `while (1) {}` line. The album link
`/rels/space_album_images_videos` pages with `links.next`. This script
follows that, then writes:

  site/snaps/snaps.json          index, newest month first
  site/snaps/m/YYYY-MM.json      that month, newest first

A photo keeps its id, revision, capture date, capture time, oriented
width and height, the 640 / 1280 / 2048 rendition ids, a dominant
color sampled from the 640 JPEG, and a short camera name. No GPS,
filename, or other EXIF. The camera name comes from the asset XMP
(tiff Make/Model, with exif Make/Model as a fallback). The public
share only includes those fields when Show metadata is on. The time is the capture wall clock, tagged America/Chicago so the
page can stamp it. An offset on that clock is the camera's zone and
is not reprojected: after the fall time change an RX100 still tagged
-05:00 would otherwise lose an hour. A captureDate with no offset is
already that wall clock. Import times, when there is no capture date,
are converted to Chicago. The color cache is scripts/snaps_colors.json so a later run does
not download a rendition that has not changed.

Every photo stays the sharp Lightroom rendition. This script does not frost
and does not drop capture times or rendition ids.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image

SPACE = "70e5cd134b2e42feae9e82952152c5e8"
KEY = "LightroomMobileWeb1"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site" / "snaps"
MONTHS = OUT / "m"
CACHE = ROOT / "scripts" / "snaps_colors.json"
CHICAGO = ZoneInfo("America/Chicago")
PAGE = 100


def fetch(url: str) -> dict:
    last = None
    for attempt in range(4):
        req = urllib.request.Request(
            url,
            headers={"x-api-key": KEY, "Accept": "application/json", "User-Agent": "jaytha-snaps"},
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                text = res.read().decode("utf-8")
            break
        except (urllib.error.URLError, TimeoutError) as err:
            last = err
            time.sleep(1.5 * (attempt + 1))
    else:
        raise SystemExit(f"lightroom fetch failed: {url} ({last})")
    if text.startswith("while (1)"):
        text = text.split("\n", 1)[1]
    return json.loads(text)


def bytes_of(url: str) -> bytes:
    last = None
    for attempt in range(4):
        req = urllib.request.Request(url, headers={"User-Agent": "jaytha-snaps"})
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.read()
        except (urllib.error.URLError, TimeoutError) as err:
            last = err
            time.sleep(1.5 * (attempt + 1))
    raise OSError(last)


def when(asset: dict):
    """Capture wall clock. Import time falls back to America/Chicago.

    captureDate is the camera clock. Keep those digits, offset or not.
    Reprojecting a -05:00 RX100 stamp into November Chicago (UTC-6)
    moves the hour. A trailing Z is a real UTC instant, not that clock,
    so only that form is converted.
    """
    payload = asset.get("payload") or {}
    capture = payload.get("captureDate")
    if isinstance(capture, str) and len(capture) >= 10:
        dt = datetime.fromisoformat(capture.replace("Z", "+00:00"))
        if capture.endswith(("Z", "z")):
            dt = dt.astimezone(CHICAGO)
        return dt.replace(tzinfo=None), dt.replace(tzinfo=None).date().isoformat()
    source = payload.get("importSource") or {}
    stamp = source.get("importTimestamp") or payload.get("userCreated") or asset.get("created")
    if not isinstance(stamp, str) or len(stamp) < 10:
        return None
    dt = datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    local = dt.astimezone(CHICAGO).replace(tzinfo=None)
    return local, local.date().isoformat()


def size(payload: dict):
    develop = payload.get("develop") or {}
    width, height = develop.get("croppedWidth"), develop.get("croppedHeight")
    if isinstance(width, (int, float)) and isinstance(height, (int, float)) and width > 0 and height > 0:
        return int(width), int(height)
    source = payload.get("importSource") or {}
    width, height = source.get("originalWidth"), source.get("originalHeight")
    if not (isinstance(width, (int, float)) and isinstance(height, (int, float)) and width > 0 and height > 0):
        return None
    width, height = int(width), int(height)
    try:
        orient = int(develop.get("userOrientation") or 1)
    except (TypeError, ValueError):
        orient = 1
    if orient in (5, 6, 7, 8):
        width, height = height, width
    return width, height


def rendition_ids(asset: dict):
    found = {}
    revision = None
    for rel, link in (asset.get("links") or {}).items():
        href = link.get("href") if isinstance(link, dict) else link
        if not isinstance(rel, str) or not isinstance(href, str):
            continue
        mark = "/rels/rendition_type/"
        if mark not in rel:
            continue
        kind = rel.split(mark, 1)[1]
        parts = href.split("?")[0].strip("/").split("/")
        try:
            rev_at = parts.index("revisions")
            rend_at = parts.index("renditions")
        except ValueError:
            continue
        found[kind] = parts[rend_at + 1]
        if kind == "640":
            revision = parts[rev_at + 1]
        elif revision is None:
            revision = parts[rev_at + 1]
    return found, revision


def naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(CHICAGO).replace(tzinfo=None)


def iso_at(dt: datetime) -> str:
    """Capture wall clock tagged America/Chicago.

    when() already returns that clock with no zone. Tagging it does not
    shift the hour.
    """
    local = naive(dt).replace(microsecond=0)
    return local.replace(tzinfo=CHICAGO).isoformat(timespec="seconds")


def _words(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip()).lower()


def short_camera(make: str, model: str) -> str | None:
    """Short lowercase camera name, or None when the asset has no model.

    iPhone Air, iPhone 17 Pro, and iPhone 16 all drop the leading
    "iphone ". The dual-lens source previously labeled "iphone duo"
    is "duo". Sony DSC-RX100M7 is "rx100 vii". Any other model is
    the model string, lowercased, with a leading "iphone " removed.
    """
    make_n = _words(make)
    model_n = _words(model)
    if make_n.startswith("apple "):
        make_n = make_n[6:].strip()
    if model_n.startswith("apple "):
        model_n = model_n[6:].strip()
    if not make_n and not model_n:
        return None
    joined = " ".join(part for part in (make_n, model_n) if part)
    compact = re.sub(r"[^a-z0-9]", "", joined)
    if "dscrx100m7" in compact or compact.endswith("rx100m7"):
        return "rx100 vii"
    if re.search(r"\bduo\b", model_n) or (re.search(r"\bduo\b", joined) and "iphone" in joined):
        return "duo"
    source = model_n or ""
    if source.startswith("iphone "):
        source = source[len("iphone "):].strip()
    elif not source:
        return None
    return source or None


def camera_of(asset: dict) -> tuple[str, str, str | None]:
    """Raw make, raw model, and the short name from asset XMP."""
    xmp = ((asset.get("payload") or {}).get("xmp") or {})
    if not isinstance(xmp, dict):
        xmp = {}
    tiff = xmp.get("tiff") if isinstance(xmp.get("tiff"), dict) else {}
    exif = xmp.get("exif") if isinstance(xmp.get("exif"), dict) else {}
    make = tiff.get("Make") if isinstance(tiff.get("Make"), str) else ""
    model = tiff.get("Model") if isinstance(tiff.get("Model"), str) else ""
    if not make and isinstance(exif.get("Make"), str):
        make = exif["Make"]
    if not model and isinstance(exif.get("Model"), str):
        model = exif["Model"]
    make, model = make.strip(), model.strip()
    return make, model, short_camera(make, model)


def color_of(blob: bytes) -> str:
    with Image.open(BytesIO(blob)) as im:
        rgb = im.convert("RGB").resize((1, 1), Image.Resampling.BOX)
        red, green, blue = rgb.getpixel((0, 0))
    return f"{red:02x}{green:02x}{blue:02x}"


def list_assets() -> tuple[str, list[dict]]:
    root = fetch(f"https://photos.adobe.io/v2/spaces/{SPACE}/resources")
    base = root.get("base") or f"https://photos.adobe.io/v2/spaces/{SPACE}/"
    if not base.endswith("/"):
        base += "/"
    albums = root.get("resources") or []
    if not albums:
        raise SystemExit("lightroom share has no album")
    href = (albums[0].get("links") or {}).get("/rels/space_album_images_videos", {}).get("href")
    if not href:
        raise SystemExit("lightroom album has no asset link")
    join = "&" if "?" in href else "?"
    url = base + href + join + "limit=" + str(PAGE)
    assets = []
    seen = set()
    while url:
        page = fetch(url)
        base = page.get("base") or base
        for item in page.get("resources") or []:
            asset = item.get("asset") or item
            if asset.get("subtype") != "image":
                continue
            ident = asset.get("id")
            if not ident or ident in seen:
                continue
            seen.add(ident)
            assets.append(asset)
        nxt = (page.get("links") or {}).get("next") or {}
        href = nxt.get("href") if isinstance(nxt, dict) else None
        url = (base + href) if href else None
        print(f"listed {len(assets)}", file=sys.stderr)
    return base, assets


def sample_colors(base: str, rows: list[dict], cache: dict) -> None:
    pending = []
    for row in rows:
        if row.get("c"):
            continue
        url = base + f"assets/{row['i']}/revisions/{row['v']}/renditions/{row['t']}?api_key={urllib.parse.quote(KEY)}"
        pending.append((row, url))
    if not pending:
        return
    print(f"sampling {len(pending)} colors", file=sys.stderr)

    def one(item):
        row, url = item
        try:
            return row, color_of(bytes_of(url))
        except (OSError, Image.UnidentifiedImageError) as err:
            print(f"color {row['i']}: {err}", file=sys.stderr)
            return row, "1a1a1a"

    done = 0
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = [pool.submit(one, item) for item in pending]
        for fut in as_completed(futures):
            row, color = fut.result()
            row["c"] = color
            cache[row["t"]] = color
            done += 1
            if done % 25 == 0 or done == len(pending):
                print(f"colors {done}/{len(pending)}", file=sys.stderr)
                CACHE.write_text(json.dumps(cache, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")


def main() -> None:
    cache = {}
    if CACHE.is_file():
        cache = json.loads(CACHE.read_text(encoding="utf-8"))
    base, assets = list_assets()
    rows = []
    for asset in assets:
        moment = when(asset)
        dims = size(asset.get("payload") or {})
        rends, revision = rendition_ids(asset)
        if not moment or not dims or not revision or "640" not in rends:
            print(f"skip {asset.get('id')}", file=sys.stderr)
            continue
        thumb = rends["640"]
        row = {
            "i": asset["id"],
            "v": revision,
            "d": moment[1],
            "w": dims[0],
            "h": dims[1],
            "t": thumb,
            "_at": moment[0],
        }
        if "1280" in rends:
            row["s"] = rends["1280"]
        if "2048" in rends:
            row["l"] = rends["2048"]
        if thumb in cache:
            row["c"] = cache[thumb]
        make, model, short = camera_of(asset)
        if short:
            row["k"] = short
        row["_make"] = make
        row["_model"] = model
        rows.append(row)
    sample_colors(base, rows, cache)
    used = {row["t"] for row in rows}
    cache = {key: cache[key] for key in sorted(used) if key in cache}
    grouped: dict[str, list] = {}
    for row in rows:
        grouped.setdefault(row["d"][:7], []).append(row)
    MONTHS.mkdir(parents=True, exist_ok=True)
    keep = set()
    for month in grouped:
        items = sorted(grouped[month], key=lambda row: (naive(row["_at"]), row["i"]), reverse=True)
        out = []
        for row in items:
            item = {
                "i": row["i"],
                "v": row["v"],
                "d": row["d"],
                "a": iso_at(row["_at"]),
                "w": row["w"],
                "h": row["h"],
                "t": row["t"],
            }
            if "s" in row:
                item["s"] = row["s"]
            if "l" in row:
                item["l"] = row["l"]
            item["c"] = row.get("c") or "1a1a1a"
            if row.get("k"):
                item["k"] = row["k"]
            out.append(item)
        path = MONTHS / f"{month}.json"
        path.write_text(json.dumps(out, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")
        keep.add(path.name)
    for path in MONTHS.glob("*.json"):
        if path.name not in keep:
            path.unlink()
    index = {
        "base": base,
        "key": KEY,
        "months": [{"m": month, "n": len(grouped[month])} for month in sorted(grouped, reverse=True)],
    }
    (OUT / "snaps.json").write_text(json.dumps(index, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")
    CACHE.write_text(json.dumps(cache, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")
    counts: dict[str, int] = {}
    raw_counts: dict[str, int] = {}
    missing = 0
    for row in rows:
        short = row.get("k")
        if not short:
            missing += 1
            continue
        counts[short] = counts.get(short, 0) + 1
        raw = " ".join(part for part in (row.get("_make") or "", row.get("_model") or "") if part) or "(model only)"
        raw_counts[raw] = raw_counts.get(raw, 0) + 1
    print(f"{len(rows)} photos, {len(grouped)} months, {min(grouped)} .. {max(grouped)}")
    if counts:
        listed = ", ".join(f"{name} {counts[name]}" for name in sorted(counts))
        print(f"cameras: {listed}")
    else:
        print("cameras: none")
    print(f"no camera data: {missing}")
    if raw_counts:
        for raw in sorted(raw_counts):
            print(f"raw {raw_counts[raw]}: {raw}")


if __name__ == "__main__":
    main()
