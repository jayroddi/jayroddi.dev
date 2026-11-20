#!/usr/bin/env python3
"""Short camera names, and the caption only adds a camera when one exists."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import sync_snaps


def test_short_names() -> None:
    assert sync_snaps.short_camera("Apple", "iPhone Air") == "air"
    assert sync_snaps.short_camera("Apple", "iPhone 17 Pro") == "17 pro"
    assert sync_snaps.short_camera("Apple", "iPhone Duo") == "duo"
    assert sync_snaps.short_camera("", "iphone duo") == "duo"
    assert sync_snaps.short_camera("Apple", "iPhone 17 Duo") == "duo"
    assert sync_snaps.short_camera("Sony", "DSC-RX100M7") == "rx100 vii"
    assert sync_snaps.short_camera("SONY", "DSC-RX100 M7") == "rx100 vii"
    assert sync_snaps.short_camera("Apple", "iPhone 16") == "16"
    assert sync_snaps.short_camera("Apple", "iPhone 16 Pro") == "16 pro"
    assert sync_snaps.short_camera("Apple", "iPhone 17 Pro Max") == "17 pro max"
    assert sync_snaps.short_camera("", "") is None
    assert sync_snaps.short_camera("Apple", "") is None
    assert sync_snaps.short_camera("Sony", "") is None


def test_capture_wall_clock() -> None:
    # RX100 still tagged -05:00 after Jay's -1h edit. Show 7:48, not 6:48.
    rx = {"payload": {"captureDate": "2026-11-20T07:48:52.000-05:00"}}
    dt, day = sync_snaps.when(rx)
    assert (dt.hour, dt.minute, dt.second) == (7, 48, 52)
    assert day == "2026-11-20"
    assert sync_snaps.iso_at(dt) == "2026-11-20T07:48:52-06:00"
    # No offset is already the wall clock.
    bare = {"payload": {"captureDate": "2026-11-20T07:43:10"}}
    dt, _ = sync_snaps.when(bare)
    assert (dt.hour, dt.minute, dt.second) == (7, 43, 10)
    # iPhone clocks are already Chicago. The hour stays.
    phone = {"payload": {"captureDate": "2026-11-20T08:49:23.138-06:00"}}
    dt, _ = sync_snaps.when(phone)
    assert (dt.hour, dt.minute, dt.second) == (8, 49, 23)
    assert sync_snaps.iso_at(dt) == "2026-11-20T08:49:23-06:00"
    # A Z capture instant is UTC, not a camera clock.
    utc = {"payload": {"captureDate": "2026-11-20T14:49:23Z"}}
    dt, _ = sync_snaps.when(utc)
    assert (dt.hour, dt.minute, dt.second) == (8, 49, 23)


def test_camera_of_reads_xmp() -> None:
    asset = {"payload": {"xmp": {"tiff": {"Make": "Apple", "Model": "iPhone 16"}}}}
    make, model, short = sync_snaps.camera_of(asset)
    assert (make, model, short) == ("Apple", "iPhone 16", "16")
    bare = {"payload": {"xmp": {"tiff": {"Orientation": "top left"}}}}
    assert sync_snaps.camera_of(bare) == ("", "", None)
    exif = {"payload": {"xmp": {"exif": {"Make": "Sony", "Model": "DSC-RX100M7"}}}}
    assert sync_snaps.camera_of(exif)[2] == "rx100 vii"


def test_caption_appends_camera() -> None:
    script = r"""
const fs = require('fs');
const src = fs.readFileSync('site/snaps/snaps.js', 'utf8');
const start = src.indexOf('function stamp(');
const end = src.indexOf('function render(');
const fn = src.slice(start, end);
const caption = new Function(fn + 'return caption;')();
const photo = {d: '2026-11-19', a: '2026-11-19T12:46:58-06:00', k: '17 pro'};
const plain = {d: '2026-11-19', a: '2026-11-19T12:46:58-06:00'};
const blank = {d: '2026-11-19', a: '2026-11-19T12:46:58-06:00', k: '   '};
if (caption(photo) !== '2026.11.19 // 12:46pm // 17 pro') process.exit(1);
if (caption(plain) !== '2026.11.19 // 12:46pm') process.exit(2);
if (caption(blank) !== '2026.11.19 // 12:46pm') process.exit(3);
if (caption(plain).endsWith('//')) process.exit(4);
"""
    subprocess.run(["node", "-e", script], cwd=ROOT, check=True)


def main() -> int:
    test_short_names()
    test_capture_wall_clock()
    test_camera_of_reads_xmp()
    test_caption_appends_camera()
    print("snap camera tests passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        sys.stderr.write("snap camera tests failed\n")
        raise
