#!/usr/bin/env python3
"""Checks for the mid frost and the Nov 1 gate. No network."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

from PIL import Image

import frost
import publish_snaps
import snaps_clear

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
    assert frost.RECIPE == "soft-v1"
    assert frost.SOFT[0] < frost.MID[0] and frost.SOFT[3] < frost.MID[3] and frost.SOFT[4] < frost.MID[4]
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
    html = root / "site" / "snaps" / "index.html"
    html.parent.mkdir(parents=True, exist_ok=True)
    if not html.is_file():
        html.write_text(
            '<link rel="preconnect" href="https://photos.adobe.io">\n',
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
            assert publish_snaps.PRECONNECT in (root / "site" / "snaps" / "index.html").read_text(encoding="utf-8")

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
            assert publish_snaps.PRECONNECT in (root / "site" / "snaps" / "index.html").read_text(encoding="utf-8")
    finally:
        sync_snaps.bytes_of = original


def test_clear_pin_stays_sharp() -> None:
    import sync_snaps

    old = _photo()
    pinned = _photo()
    pinned["i"] = "ab" * 16
    pinned["d"] = "2026-11-02"
    pinned["a"] = "2026-11-02T08:45:21-06:00"
    other = _photo()
    other["i"] = "cd" * 16
    other["d"] = "2026-11-02"
    other["a"] = "2026-11-02T08:47:51-06:00"
    original = sync_snaps.bytes_of
    sync_snaps.bytes_of = lambda _url: (_ for _ in ()).throw(OSError("offline"))
    try:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            _album(root, [old])
            _album(root, [pinned, other], "2026-11")
            (root / "scripts" / "snaps_clear.json").write_text(
                json.dumps({"ids": [pinned["i"]]}) + "\n",
                encoding="utf-8",
            )
            cache = root / "frost-cache"
            cache.mkdir()
            for photo in (pinned, other):
                for name in frost.filenames(photo):
                    (cache / name).write_bytes(b"y" * 900)
            code = publish_snaps.main(["--root", str(root), "--now", "2026-11-02T12:00:00-06:00", "--apply"])
            assert code == 0
            november = json.loads((root / "site" / "snaps" / "m" / "2026-11.json").read_text(encoding="utf-8"))
            by_id = {row["i"]: row for row in november}
            kept = by_id[pinned["i"]]
            assert kept["t"] == pinned["t"] and kept["v"] == pinned["v"]
            assert kept["s"] == pinned["s"] and kept["l"] == pinned["l"]
            assert "f" not in kept
            glass = by_id[other["i"]]
            assert glass["f"] == 1
            assert "t" not in glass and "v" not in glass and "s" not in glass and "l" not in glass
            frost_dir = root / "site" / "snaps" / "f"
            assert (frost_dir / f"{other['i']}.jpg").is_file()
            assert (frost_dir / f"{other['i']}-l.jpg").is_file()
            assert not (frost_dir / f"{pinned['i']}.jpg").exists()
            assert not (frost_dir / f"{pinned['i']}-l.jpg").exists()
            october = json.loads((root / "site" / "snaps" / "m" / "2026-10.json").read_text(encoding="utf-8"))
            assert october[0]["t"] == old["t"] and "f" not in october[0]
            assert frost.dated_for_frost(pinned)
            assert frost.SOFT == (0.04, 0.85, 1.05, 0.16, 8)
            assert frost.RECIPE == "soft-v1"
            assert not snaps_clear.should_frost(pinned, {pinned["i"]})
            assert snaps_clear.should_frost(other, {pinned["i"]})
    finally:
        sync_snaps.bytes_of = original


def test_clear_month_flag_and_policy() -> None:
    ct = publish_snaps.CT
    assert snaps_clear.clear_month_due(datetime(2026, 12, 1, 0, 0, tzinfo=ct)) == "2026-11"
    assert snaps_clear.clear_month_due(datetime(2026, 11, 1, 0, 0, tzinfo=ct)) == "2026-10"
    assert snaps_clear.clear_month_due(datetime(2027, 1, 1, 8, 0, tzinfo=ct)) == "2026-12"
    assert snaps_clear.clear_month_due(datetime(2026, 11, 2, 9, 45, tzinfo=ct)) is None
    assert snaps_clear.clear_month_due(datetime(2026, 12, 1, 0, 30)) == "2026-11"
    assert snaps_clear.clear_month_due(datetime(2026, 12, 1, 5, 30, tzinfo=timezone.utc)) is None
    assert snaps_clear.clear_month_due(datetime(2026, 12, 1, 6, 0, tzinfo=timezone.utc)) == "2026-11"

    pinned = _photo()
    pinned["i"] = "ab" * 16
    pinned["d"] = "2026-11-02"
    other = _photo()
    other["i"] = "cd" * 16
    other["d"] = "2026-11-02"
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _album(root, [pinned, other], "2026-11")
        code = publish_snaps.main(["--root", str(root), "--now", "2026-11-02T12:00:00-06:00", "--clear-month", "2026-11"])
        assert code == 0
        ids = snaps_clear.load_clear_ids(root)
        assert ids == {pinned["i"], other["i"]}
        again = publish_snaps.main(["--root", str(root), "--now", "2026-11-02T12:00:00-06:00", "--clear-month", "2026-11"])
        assert again == 0
        assert snaps_clear.load_clear_ids(root) == ids
        assert publish_snaps.main(["--root", str(root), "--clear-month", "2026-13"]) == 1
        assert publish_snaps.main(["--root", str(root), "--clear-month", "2024-01"]) == 1
        assert snaps_clear.load_clear_ids(root) == ids
        # a closed gate still records the month, and does not publish
        before = (root / "site" / "snaps" / "m" / "2026-11.json").read_text(encoding="utf-8")
        held = publish_snaps.main(["--root", str(root), "--now", "2026-10-31T12:00:00-05:00", "--clear-month", "2026-11", "--apply"])
        assert held == 0
        assert (root / "site" / "snaps" / "m" / "2026-11.json").read_text(encoding="utf-8") == before


def test_committed_clear_list_matches_album() -> None:
    sign = "633b89294c7240c8b586b7c24614f250"
    woodford = "26c32239173e446fbe0a5739d9d6199d"
    parking = "4f3f4896ed13440ea9f5b9b99f46a1c4"
    yeti = "2908d99635db460ba2d7d3e8069b782f"
    hotdog = "0dee4b68d6554ae0bc2e7a5f87005d6c"
    older = [
        "d997f7830d2044719fe89f8414379f8c",
        "8812192cdd784ccc8a0967b30f3a1ea7",
        "2ba7f5b5c6274684a0ddcb569675dad0",
        "264de4928a8448d1898de48617fd2d03",
        "7e9f8be40b3c46898d550d1ef2c2d0bc",
        "925fd7fec8e040f5adcaab7ec847e21c",
        "f535b7a5b2494dd0a69f5a2f207b12c6",
    ]
    ids = snaps_clear.load_clear_ids(ROOT)
    assert ids == set(older) | {sign, woodford, yeti}
    assert parking not in ids
    assert hotdog not in ids
    found = {}
    november = json.loads((ROOT / "site" / "snaps" / "m" / "2026-11.json").read_text(encoding="utf-8"))
    for path in (ROOT / "site" / "snaps" / "m").glob("*.json"):
        for row in json.loads(path.read_text(encoding="utf-8")):
            if row.get("i") in ids or row.get("i") == hotdog:
                found[row["i"]] = row
    def pins_ok(rows: dict) -> None:
        assert set(older) <= set(rows)
        assert hotdog in rows
        assert set(rows) <= set(older) | {hotdog, sign, woodford, yeti}
        if sign in rows:
            real = rows[sign]
            assert frost.dated_for_frost(real)
            assert not snaps_clear.should_frost(real, ids)
    pins_ok(found)
    imported = dict(found)
    imported[sign] = {"i": sign, "d": "2026-11-06", "a": "2026-11-06T18:34:47-06:00"}
    pins_ok(imported)
    pin = found["925fd7fec8e040f5adcaab7ec847e21c"]
    assert pin["d"] == "2026-11-02"
    assert pin["a"] == "2026-11-02T08:45:21-06:00"
    assert pin["w"] == 5472 and pin["h"] == 3648
    court = found["f535b7a5b2494dd0a69f5a2f207b12c6"]
    assert court["d"] == "2026-11-01"
    assert court["a"] == "2026-11-01T11:47:51-06:00"
    assert court["w"] == 4032 and court["h"] == 2688
    for row in (pin, court):
        assert frost.dated_for_frost(row)
        assert not snaps_clear.should_frost(row, ids)
    dog = found[hotdog]
    assert dog["d"] == "2026-11-06"
    assert dog["a"] == "2026-11-06T17:35:59-06:00"
    assert frost.dated_for_frost(dog)
    assert snaps_clear.should_frost(dog, ids)
    taproom = {"i": sign, "d": "2026-11-06", "a": "2026-11-06T18:34:47-06:00"}
    assert frost.dated_for_frost(taproom)
    assert not snaps_clear.should_frost(taproom, ids)
    for row in november:
        if row["i"] not in ids:
            assert snaps_clear.should_frost(row, ids)
    saved = json.loads((ROOT / "scripts" / "snaps_clear.json").read_text(encoding="utf-8"))
    bottle = found[woodford]
    assert bottle["d"] == "2026-11-07"
    assert bottle["a"] == "2026-11-07T14:38:38-06:00"
    assert bottle["w"] == 3073 and bottle["h"] == 4609
    assert frost.dated_for_frost(bottle)
    assert not snaps_clear.should_frost(bottle, ids)
    lot = next(row for row in november if row["i"] == parking)
    assert lot["d"] == "2026-11-09"
    assert lot["a"] == "2026-11-09T09:21:06-06:00"
    assert lot["w"] == 8064 and lot["h"] == 5376
    assert frost.dated_for_frost(lot)
    assert snaps_clear.should_frost(lot, ids)
    bike = found[yeti]
    assert bike["d"] == "2026-11-09"
    assert bike["a"] == "2026-11-09T11:42:51-06:00"
    assert bike["w"] == 5376 and bike["h"] == 8064
    assert frost.dated_for_frost(bike)
    assert not snaps_clear.should_frost(bike, ids)
    assert saved["ids"] == [yeti, woodford, sign, *older]
    assert saved["note"] == snaps_clear.NOTE


def test_page_copy() -> None:
    html = (ROOT / "site" / "snaps" / "index.html").read_text(encoding="utf-8")
    home = (ROOT / "site" / "index.html").read_text(encoding="utf-8")
    grind = (ROOT / "site" / "grind" / "index.html").read_text(encoding="utf-8")
    habits = (ROOT / "site" / "habits" / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "site" / "snaps" / "snaps.css").read_text(encoding="utf-8")
    js = (ROOT / "site" / "snaps" / "snaps.js").read_text(encoding="utf-8")
    assert 'class="trackers"' in home and 'location.replace' not in home and 'id="gallery"' not in home
    assert 'id="gallery"' in html and 'class="site-menu"' in html and "menu.js" in html
    assert 'id="guess"' not in html and 'type="password"' not in html
    assert "if you know me well enough" not in html
    assert "GUESS_URL" not in js and "armGuess" not in js and "snap-guess" not in js
    assert "nope" not in js and "getElementById('guess')" not in js
    assert "body.snaps .guess" not in css and "guess-note" not in css
    assert "useFrost" in js and "photo.f" in js
    assert "index.frost" not in js
    assert publish_snaps.GATE == datetime(2026, 11, 1, 0, 0, tzinfo=publish_snaps.CT)
    assert publish_snaps.PRECONNECT.strip() in html
    assert 'id="kronos"' not in home and "hud.js" not in home and "hud.css" not in home
    assert 'class="day-quote"' not in home and "today.js" not in home
    assert 'location.replace("/" + location.search + location.hash)' in grind and 'class="trackers"' not in grind
    assert 'location.replace("/" + location.search + location.hash)' in habits and 'class="trackers"' not in habits
    order = ["/grind/", "/snaps/", "/music/", "/books/", "/quotes/", "/social/"]
    social = (ROOT / "site" / "social" / "index.html").read_text(encoding="utf-8")
    for page in (
        html,
        grind,
        social,
        (ROOT / "site" / "music" / "index.html").read_text(encoding="utf-8"),
        (ROOT / "site" / "books" / "index.html").read_text(encoding="utf-8"),
        (ROOT / "site" / "quotes" / "index.html").read_text(encoding="utf-8"),
        (ROOT / "site" / "daily" / "index.html").read_text(encoding="utf-8"),
    ):
        assert 'class="site-menu"' in page and "menu.js" in page
        assert 'href="/daily/"' not in page and 'href="/habits/"' not in page
        assert ">@jayroddi</a>" not in page
        spots = [page.index(f'href="{href}"') for href in order]
        assert spots == sorted(spots)
        assert page.index('href="/social/"') > page.index('href="/quotes/"')
    music = (ROOT / "site" / "music" / "index.html").read_text(encoding="utf-8")
    books = (ROOT / "site" / "books" / "index.html").read_text(encoding="utf-8")
    quotes = (ROOT / "site" / "quotes" / "index.html").read_text(encoding="utf-8")
    assert "shuffle around and find out" in music
    assert "garbage in, garbage out" in books
    assert "influence over influencers" in quotes
    assert "one day, this page will be empty" in social
    assert 'class="day-quote"' not in social and "today.js" not in social
    assert 'href="https://x.com/jayroddi"' in social
    assert 'href="https://github.com/jayroddi"' in social
    assert 'href="https://www.instagram.com/jayroddi"' in social
    assert 'href="https://www.threads.com/@jayroddi"' in social
    assert 'href="https://open.spotify.com/user/1238911903"' in social
    assert "open.spotify.com/playlist" not in social
    assert "linkedin, the worst of all" not in social and "say hi via email!" not in social and " // " not in social
    assert ">𝕏 💭</a>" in social
    assert ">github 👨‍💻</a>" in social
    assert ">instagram 📷</a>" in social
    assert ">threads 🙃</a>" in social
    assert ">spotify 🎧</a>" in social
    assert ">linkedin 🤮</a>" in social
    assert 'href="https://www.linkedin.com/in/jayroddi"' in social
    assert ">email 💌</a>" in social
    assert 'href="mailto:hi@jayroddi.lol"' in social
    assert 'id="rain"' in social and "rain.js" in social and "social.js" in social and 'class="board"' in social
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
    test_clear_pin_stays_sharp()
    test_clear_month_flag_and_policy()
    test_committed_clear_list_matches_album()
    test_page_copy()
    print("ok")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        sys.stderr.write("frost tests failed\n")
        raise
