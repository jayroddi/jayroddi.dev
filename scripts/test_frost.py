#!/usr/bin/env python3
"""Checks for the mid frost and the Nov 1 gate. No network."""

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


def test_gate_instant() -> None:
    assert publish_snaps.GATE.utcoffset() == timedelta(hours=-5)
    assert publish_snaps.gate_open(publish_snaps.GATE)
    before = datetime(2026, 10, 31, 23, 59, 59, tzinfo=publish_snaps.CT)
    assert not publish_snaps.gate_open(before)
    assert publish_snaps.gate_open(datetime(2026, 11, 1, 0, 0, 1, tzinfo=publish_snaps.CT))
    naive = datetime(2026, 10, 31, 12, 0)
    assert not publish_snaps.gate_open(naive)
    assert frost.FROST_FROM == "2026-11-01"
    old = _photo()
    assert not frost.dated_for_frost(old)
    new = _photo()
    new["d"] = "2026-11-01"
    new["i"] = "a" * 32
    assert frost.dated_for_frost(new)
    assert not frost.dated_for_frost({"d": "2026-10-31"})
    assert not frost.dated_for_frost({})


def _album(root: Path, photos: list[dict], month: str = "2026-10") -> None:
    snaps = root / "site" / "snaps" / "m"
    snaps.mkdir(parents=True, exist_ok=True)
    (root / "scripts").mkdir(exist_ok=True)
    (snaps / f"{month}.json").write_text(json.dumps(photos) + "\n", encoding="utf-8")
    index_path = root / "site" / "snaps" / "snaps.json"
    if index_path.is_file():
        index = json.loads(index_path.read_text(encoding="utf-8"))
        months = [row for row in index.get("months") or [] if row.get("m") != month]
    else:
        index = {
            "base": "https://photos.adobe.io/v2/spaces/abc/",
            "key": "LightroomMobileWeb1",
        }
        months = []
    months.append({"m": month, "n": len(photos)})
    index["months"] = months
    index_path.write_text(json.dumps(index) + "\n", encoding="utf-8")
    html = root / "site" / "index.html"
    html.parent.mkdir(parents=True, exist_ok=True)
    if not html.is_file():
        html.write_text(
            '<link rel="preconnect" href="https://photos.adobe.io">\n'
            '<p class="subhead">you can see everythi</p>\n',
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


def test_publish_holds_then_strips() -> None:
    import sync_snaps

    old = _photo()
    new = _photo()
    new["i"] = "ab" * 16
    new["d"] = "2026-11-01"
    new["a"] = "2026-11-01T00:05:18-05:00"
    waiting = _photo()
    waiting["i"] = "cd" * 16
    waiting["d"] = "2026-11-02"
    waiting["a"] = "2026-11-02T08:00:00-06:00"
    original = sync_snaps.bytes_of
    sync_snaps.bytes_of = lambda _url: (_ for _ in ()).throw(OSError("offline"))
    try:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _album(root, [old])
            _album(root, [new, waiting], "2026-11")
            before = (root / "site" / "snaps" / "snaps.json").read_text(encoding="utf-8")
            code = publish_snaps.main(["--root", str(root), "--now", "2026-10-31T23:59:00-05:00", "--apply"])
            assert code == 0
            assert (root / "site" / "snaps" / "snaps.json").read_text(encoding="utf-8") == before
            assert publish_snaps.PRECONNECT in (root / "site" / "index.html").read_text(encoding="utf-8")

            cache = root / "frost-cache"
            cache.mkdir()
            for name in frost.filenames(old):
                (cache / name).write_bytes(b"x" * 900)
            for name in frost.filenames(new):
                (cache / name).write_bytes(b"y" * 900)
            frost_dir = root / "site" / "snaps" / "f"
            frost_dir.mkdir()
            (frost_dir / f"{old['i']}.jpg").write_bytes(b"z" * 900)
            code = publish_snaps.main(["--root", str(root), "--now", "2026-11-01T00:05:00-06:00", "--apply"])
            assert code == 0
            index_path = root / "site" / "snaps" / "snaps.json"
            public = json.loads(index_path.read_text(encoding="utf-8"))
            assert "frost" not in public
            assert public["base"].startswith("https://photos.adobe.io")
            assert public["key"] == "LightroomMobileWeb1"
            october = json.loads((root / "site" / "snaps" / "m" / "2026-10.json").read_text(encoding="utf-8"))
            assert october[0]["t"] == old["t"] and october[0]["v"] == old["v"]
            assert "f" not in october[0]
            november = json.loads((root / "site" / "snaps" / "m" / "2026-11.json").read_text(encoding="utf-8"))
            glass = november[0]
            assert glass["i"] == new["i"] and glass["f"] == 1
            assert "t" not in glass and "v" not in glass and "s" not in glass and "l" not in glass
            held = november[1]
            assert held["i"] == waiting["i"] and held["t"] == waiting["t"] and "f" not in held
            assert (frost_dir / f"{new['i']}.jpg").is_file()
            assert (frost_dir / f"{new['i']}-l.jpg").is_file()
            assert not (frost_dir / f"{old['i']}.jpg").exists()
            assert not (frost_dir / f"{waiting['i']}.jpg").exists()
            assert not (cache / f"{old['i']}.jpg").exists()
            assert publish_snaps.PRECONNECT in (root / "site" / "index.html").read_text(encoding="utf-8")
    finally:
        sync_snaps.bytes_of = original


def test_page_copy() -> None:
    html = (ROOT / "site" / "snaps" / "index.html").read_text(encoding="utf-8")
    home = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
    habits = (ROOT / "site" / "habits" / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "site" / "snaps" / "snaps.css").read_text(encoding="utf-8")
    js = (ROOT / "site" / "snaps" / "snaps.js").read_text(encoding="utf-8")
    assert 'id="gallery"' in home and 'class="trackers"' not in home and 'id="kronos"' not in home
    assert 'class="site-menu"' in home and "menu.js" in home
    assert "you can see everythi" in home
    assert 'location.replace("/"' in html
    assert 'id="guess"' not in home and 'id="guess"' not in html
    assert 'type="password"' not in home and 'type="password"' not in html
    assert "if you know me well enough" not in home
    assert "GUESS_URL" not in js and "armGuess" not in js and "snap-guess" not in js
    assert "nope" not in js and "getElementById('guess')" not in js
    assert "body.snaps .guess" not in css and "guess-note" not in css
    assert "useFrost" in js and "photo.f" in js
    assert "index.frost" not in js
    assert publish_snaps.GATE == datetime(2026, 11, 1, 0, 0, tzinfo=publish_snaps.CT)
    assert publish_snaps.PRECONNECT.strip() in home
    assert 'class="trackers"' in habits and 'id="kronos"' in habits
    assert 'class="day-quote"' not in habits and "today.js" not in habits
    assert "only life goal: be better than i was yesterday" in habits
    assert 'id="gallery"' not in habits
    order = ["/", "/music/", "/books/", "/quotes/", "/habits/"]
    for page in (
        home,
        habits,
        (ROOT / "site" / "music" / "index.html").read_text(encoding="utf-8"),
        (ROOT / "site" / "books" / "index.html").read_text(encoding="utf-8"),
        (ROOT / "site" / "quotes" / "index.html").read_text(encoding="utf-8"),
        (ROOT / "site" / "daily" / "index.html").read_text(encoding="utf-8"),
    ):
        assert 'class="site-menu"' in page and "menu.js" in page
        assert 'href="/daily/"' not in page
        spots = [page.index(f'href="{href}"') for href in order]
        assert spots == sorted(spots)
        assert page.index("https://x.com/jayroddi") > page.index('href="/habits/"')
    music = (ROOT / "site" / "music" / "index.html").read_text(encoding="utf-8")
    books = (ROOT / "site" / "books" / "index.html").read_text(encoding="utf-8")
    quotes = (ROOT / "site" / "quotes" / "index.html").read_text(encoding="utf-8")
    assert "shuffle around and find out" in music
    assert "garbage in, garbage out" in books
    assert "influence over influencers" in quotes
    assert not (ROOT / "workers" / "snap-guesses").exists()
    node = shutil.which("node")
    assert node
    subprocess.run([node, "--check", str(ROOT / "site" / "snaps" / "snaps.js")], check=True)
    subprocess.run([node, "--check", str(ROOT / "site" / "assets" / "menu.js")], check=True)


def main() -> None:
    test_mid_hides_a_checkerboard()
    test_gate_instant()
    test_bake_caches_and_keeps_stripped_files()
    test_publish_holds_then_strips()
    test_page_copy()
    print("ok")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.stderr.write("frost tests failed\n")
        raise
