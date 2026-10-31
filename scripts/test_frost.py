#!/usr/bin/env python3
"""Checks for the mid frost and the snaps publish step. No network."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta
from pathlib import Path

from PIL import Image

import frost
import publish_snaps

ROOT = Path(__file__).resolve().parents[1]
HINT = "letter or the phrase"


def rough(data: list, width: int) -> float:
    total = 0
    count = 0
    for index in range(len(data) - 1):
        if index % width == width - 1:
            continue
        total += abs(data[index][0] - data[index + 1][0])
        count += 1
    return total / count


def test_mid_hides_a_checkerboard() -> None:
    im = Image.new("RGB", (240, 160))
    pixels = im.load()
    for y in range(160):
        for x in range(240):
            pixels[x, y] = (255, 255, 255) if (x // 4 + y // 4) % 2 == 0 else (0, 0, 0)
    out = frost.frost_mid(im)
    assert out.size == im.size
    assert out.mode == "RGB"
    source = list(im.get_flattened_data())
    baked = list(out.get_flattened_data())
    assert baked != source
    assert rough(source, 240) > 50
    # a 4px checker is gone: those two pixels were full-scale apart
    assert abs(baked[0][0] - baked[4][0]) < 40
    assert sum(pixel[0] for pixel in baked) / len(baked) > 140
    assert frost.frost_mid(im).tobytes() == out.tobytes()


def test_clock_is_chicago() -> None:
    assert publish_snaps.CT.key == "America/Chicago"
    stamp = publish_snaps.parse_now("2026-10-31T23:30:00-05:00")
    assert stamp.astimezone(publish_snaps.CT).hour == 23


def _album(root: Path, photos: list[dict]) -> None:
    snaps = root / "site" / "snaps" / "m"
    snaps.mkdir(parents=True)
    (root / "scripts").mkdir()
    month = snaps / "2026-10.json"
    month.write_text(json.dumps(photos) + "\n", encoding="utf-8")
    index = {
        "base": "https://photos.adobe.io/v2/spaces/abc/",
        "key": "LightroomMobileWeb1",
        "months": [{"m": "2026-10", "n": len(photos)}],
    }
    (root / "site" / "snaps" / "snaps.json").write_text(json.dumps(index) + "\n", encoding="utf-8")
    html = root / "site" / "snaps" / "index.html"
    html.write_text(
        '<link rel="preconnect" href="https://photos.adobe.io">\n'
        '<form class="guess" id="guess" hidden></form>\n',
        encoding="utf-8",
    )


def _photo() -> dict:
    return {
        "i": "70bb662298824b43aa9c81c690c1e5a5",
        "v": "b805c4b82866a0bf8961fd1ae70d9034",
        "d": "2026-10-29",
        "a": "2026-10-29T16:05:18-05:00",
        "w": 80,
        "h": 48,
        "t": "ca8fa7cf5dfb5b3f5aba9c9d4d87cc1b",
        "s": "22711f6f9ee32370a50094d0167b3605",
        "l": "773e3be89ba64a3460a2e55f4c29223d",
        "c": "5c5652",
    }


def _jpeg(color: tuple[int, int, int]) -> bytes:
    im = Image.new("RGB", (80, 48), color)
    return frost.jpeg_bytes(im)


def test_bake_caches_and_keeps_stripped_files() -> None:
    photo = _photo()
    calls = {"n": 0}

    def fetch(url: str) -> bytes:
        calls["n"] += 1
        assert "photos.adobe.io" in url
        assert photo["t"] in url or photo["s"] in url
        assert "api_key=" in url
        return _jpeg((20, 40, 60) if photo["t"] in url else (180, 40, 40))

    with tempfile.TemporaryDirectory() as tmp:
        dest = Path(tmp) / "f"
        cache = Path(tmp) / "snaps_frost.json"
        missing = frost.bake([photo], dest, cache, fetch, "https://photos.adobe.io/v2/spaces/abc/", "LightroomMobileWeb1")
        assert missing == 0
        assert calls["n"] == 2
        tile = (dest / f"{photo['i']}.jpg").read_bytes()
        large = (dest / f"{photo['i']}-l.jpg").read_bytes()
        assert tile != large
        assert len(tile) > 800 and len(large) > 800
        frost.bake([photo], dest, cache, fetch, "https://photos.adobe.io/v2/spaces/abc/", "LightroomMobileWeb1")
        assert calls["n"] == 2
        stripped = {key: photo[key] for key in ("i", "d", "a", "w", "h", "c")}
        frost.bake([stripped], dest, cache, fetch, "https://photos.adobe.io/v2/spaces/abc/", "LightroomMobileWeb1")
        assert calls["n"] == 2
        assert (dest / f"{photo['i']}.jpg").is_file()
        assert (dest / f"{photo['i']}-l.jpg").is_file()


def test_publish_keeps_sharp_urls() -> None:
    photo = _photo()
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _album(root, [photo])
        before = (root / "site" / "snaps" / "snaps.json").read_text(encoding="utf-8")
        month_before = (root / "site" / "snaps" / "m" / "2026-10.json").read_text(encoding="utf-8")
        code = publish_snaps.main(["--root", str(root), "--now", "2026-10-31T12:00:00-05:00", "--apply"])
        assert code == 0
        assert (root / "site" / "snaps" / "snaps.json").read_text(encoding="utf-8") == before
        assert (root / "site" / "snaps" / "m" / "2026-10.json").read_text(encoding="utf-8") == month_before
        assert "photos.adobe.io" in (root / "site" / "snaps" / "index.html").read_text(encoding="utf-8")

        cache = root / "frost-cache"
        cache.mkdir()
        for name in frost.filenames(photo):
            (cache / name).write_bytes(b"x" * 900)
        code = publish_snaps.main(["--root", str(root), "--now", "2026-10-31T12:05:00-05:00", "--apply"])
        assert code == 0
        public = json.loads((root / "site" / "snaps" / "snaps.json").read_text(encoding="utf-8"))
        assert public["base"].startswith("https://photos.adobe.io/")
        assert public["key"] == "LightroomMobileWeb1"
        assert "frost" not in public
        month = json.loads((root / "site" / "snaps" / "m" / "2026-10.json").read_text(encoding="utf-8"))
        assert month[0]["t"] == photo["t"] and month[0]["l"] == photo["l"] and month[0]["v"] == photo["v"]
        for name in frost.filenames(photo):
            staged = root / "site" / "snaps" / "f" / name
            assert staged.is_file() and staged.stat().st_size == 900
        assert "photos.adobe.io" in (root / "site" / "snaps" / "index.html").read_text(encoding="utf-8")


def test_page_copy() -> None:
    html = (ROOT / "site" / "snaps" / "index.html").read_text(encoding="utf-8")
    home = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
    habits = (ROOT / "site" / "habits" / "index.html").read_text(encoding="utf-8")
    assert 'id="gallery"' in home and 'id="final"' in home and 'class="trackers"' not in home
    assert 'id="gallery"' in html and 'id="final"' in html
    assert 'class="trackers"' in habits and 'id="gallery"' not in habits
    assert 'id="guess"' not in home and 'id="guess"' not in html
    assert f'placeholder="{HINT}"' in html and f'placeholder="{HINT}"' in home
    assert "Wheel of Fortune" not in html and "Wheel of Fortune" not in home
    assert 'href="/daily/"' not in home
    js = (ROOT / "site" / "snaps" / "snaps.js").read_text(encoding="utf-8")
    assert "GUESS_URL" not in js
    assert "nope" not in js
    assert '<link rel="preconnect" href="https://photos.adobe.io">' in html
    node = shutil.which("node")
    assert node
    subprocess.run([node, "--check", str(ROOT / "site" / "snaps" / "snaps.js")], check=True)
    subprocess.run([node, "--check", str(ROOT / "site" / "snaps" / "puzzle.js")], check=True)
    subprocess.run([node, "--check", str(ROOT / "site" / "assets" / "accent.js")], check=True)
    subprocess.run([node, "--check", str(ROOT / "workers" / "snap-guesses" / "worker.js")], check=True)


def main() -> None:
    test_mid_hides_a_checkerboard()
    test_clock_is_chicago()
    test_bake_caches_and_keeps_stripped_files()
    test_publish_keeps_sharp_urls()
    test_page_copy()
    print("ok")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.stderr.write("frost tests failed\n")
        raise
