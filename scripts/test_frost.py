#!/usr/bin/env python3
"""Every snap stays sharp, and every photo still carries its capture stamp."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import publish_snaps

ESPRESSO = "d997f7830d2044719fe89f8414379f8c"
CLARITY = "050b13dc38d0477f925d4c27c9762b11"
PLATE = "8aa4523c0bf34362b657b73f9a767805"
LIGHTS = "6cfd37d8cf864f3184711d49065c2f4c"


def test_publish_does_not_frost() -> None:
    before = (ROOT / "site" / "snaps" / "m" / "2026-11.json").read_text(encoding="utf-8")
    code = publish_snaps.main(["--root", str(ROOT), "--apply", "--bake"])
    assert code == 0
    after = (ROOT / "site" / "snaps" / "m" / "2026-11.json").read_text(encoding="utf-8")
    assert after == before
    try:
        publish_snaps.main(["--clear-month", "2026-11"])
    except SystemExit as err:
        assert err.code != 0
    else:
        raise AssertionError("--clear-month is still accepted")


def test_frost_helpers_are_gone() -> None:
    assert not (SCRIPTS / "snaps_clear.json").exists()
    assert not (SCRIPTS / "snaps_clear.py").exists()
    assert not (SCRIPTS / "frost.py").exists()
    sync = (SCRIPTS / "sync_snaps.py").read_text(encoding="utf-8")
    assert "should_frost" not in sync
    assert "from frost" not in sync
    assert "bake(" not in sync
    pages = (ROOT / ".github/workflows/pages.yml").read_text(encoding="utf-8")
    snaps = (ROOT / ".github/workflows/snaps.yml").read_text(encoding="utf-8")
    assert "publish_snaps.py" not in pages
    assert "--clear-month" not in pages
    assert "frost-cache" not in pages
    assert "--clear-month" not in snaps
    assert "frost-cache" not in snaps
    assert "clear_month_due" not in (SCRIPTS / "publish_snaps.py").read_text(encoding="utf-8")


def test_month_files_keep_renditions_and_times() -> None:
    months = sorted((ROOT / "site" / "snaps" / "m").glob("*.json"))
    assert months
    found: dict[str, dict] = {}
    for path in months:
        rows = json.loads(path.read_text(encoding="utf-8"))
        assert isinstance(rows, list) and rows
        for row in rows:
            assert isinstance(row, dict)
            assert "f" not in row
            assert isinstance(row.get("i"), str) and row["i"]
            assert isinstance(row.get("v"), str) and row["v"]
            assert isinstance(row.get("t"), str) and row["t"]
            assert isinstance(row.get("d"), str) and row["d"]
            captured = row.get("a")
            if captured is not None:
                assert isinstance(captured, str) and "T" in captured
            if row["i"] in (ESPRESSO, CLARITY, PLATE, LIGHTS):
                found[row["i"]] = row
    for asset in (ESPRESSO, CLARITY, PLATE, LIGHTS):
        assert asset in found, asset
        assert found[asset]["a"]
    assert found[ESPRESSO]["a"].startswith("2026-11-05T20:45:03")
    assert found[CLARITY]["d"] == "2026-11-14"


def test_stamp_ui_is_on_every_snap() -> None:
    js = (ROOT / "site/snaps/snaps.js").read_text(encoding="utf-8")
    css = (ROOT / "site/snaps/snaps.css").read_text(encoding="utf-8")
    html = (ROOT / "site/snaps/index.html").read_text(encoding="utf-8")
    assert "function stamp(" in js
    assert "function caption(" in js
    assert "cap.className = 'stamp'" in js
    assert "capEl.textContent = line" in js
    assert "useFrost" not in js
    assert "photo.f" not in js
    assert "frostSrc" not in js
    assert ".shot .stamp" in css
    assert ".light .cap" in css
    assert "snaps.js?v=2.66" in html
    assert "photo.k" in js
    assert "line + ' // ' + cam" in js


def main() -> int:
    test_publish_does_not_frost()
    test_frost_helpers_are_gone()
    test_month_files_keep_renditions_and_times()
    test_stamp_ui_is_on_every_snap()
    print("snaps clear tests passed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        sys.stderr.write("snaps clear tests failed\n")
        raise
