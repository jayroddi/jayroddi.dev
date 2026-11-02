#!/usr/bin/env python3
"""Durable clear pins: asset ids that stay sharp across syncs.

`scripts/snaps_clear.json` is a committed allowlist. Publish and the album
sync skip frost for those ids, so a later sync does not put `f` back on
them. Every other snap whose Chicago capture date is on or after
2026-11-01 still gets the soft frost (`frost.SOFT`, `photo.f`). This list
does not change that recipe.

Month-end policy, for a later job. Do not schedule it from Actions here.
On the 1st in America/Chicago, the prior calendar month's snaps should all
go clear. The current month stays frosted except the pins in this file.
`clear_month_due(now)` returns that prior YYYY-MM on the 1st and None on
every other day. Pass it to:

  python3 scripts/publish_snaps.py --clear-month YYYY-MM

That appends the month's asset ids to the allowlist. Commit the file
afterward. The Pages deploy only reads the file; it does not run the flag.
"""

from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

CT = ZoneInfo("America/Chicago")
MONTH = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")
_ID = re.compile(r"^[0-9a-f]{16,64}$")
NOTE = (
    "Asset ids that stay sharp (no f) across syncs. "
    "On the 1st America/Chicago, run publish_snaps.py --clear-month YYYY-MM "
    "for the prior month, then commit. The current month stays frosted except these pins."
)


def clear_path(root: Path) -> Path:
    return root / "scripts" / "snaps_clear.json"


def load_clear_ids(root: Path) -> set[str]:
    """Asset ids publish must not frost. Missing or unreadable file means none."""
    path = clear_path(root)
    if not path.is_file():
        return set()
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return set()
    raw = data.get("ids") if isinstance(data, dict) else data
    if not isinstance(raw, list):
        return set()
    found: set[str] = set()
    for item in raw:
        if not isinstance(item, str):
            continue
        asset = item.strip().lower()
        if _ID.fullmatch(asset):
            found.add(asset)
    return found


def save_clear_ids(root: Path, ids: set[str]) -> None:
    path = clear_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"note": NOTE, "ids": sorted(ids)}
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def should_frost(photo: dict, clear_ids: set[str]) -> bool:
    """Date gate, then the allowlist. A pin stays sharp across later syncs."""
    from frost import dated_for_frost

    asset = photo.get("i")
    if isinstance(asset, str) and asset.strip().lower() in clear_ids:
        return False
    return dated_for_frost(photo)


def clear_month_due(now: datetime) -> str | None:
    """Prior YYYY-MM when `now` is the 1st in America/Chicago, else None.

    A later automation can pass this to `--clear-month`. The Pages deploy
    does not call it, and nothing here schedules that run.
    """
    if now.tzinfo is None:
        now = now.replace(tzinfo=CT)
    local = now.astimezone(CT)
    if local.day != 1:
        return None
    year, month = local.year, local.month
    if month == 1:
        year -= 1
        month = 12
    else:
        month -= 1
    return f"{year:04d}-{month:02d}"


def month_asset_ids(root: Path, month: str) -> list[str]:
    if not isinstance(month, str) or not MONTH.fullmatch(month):
        raise ValueError(f"clear month must be YYYY-MM, got {month!r}")
    path = root / "site" / "snaps" / "m" / f"{month}.json"
    if not path.is_file():
        raise FileNotFoundError(f"no snaps month {month}")
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list):
        raise ValueError(f"{month} snaps are not a list")
    ids: list[str] = []
    seen: set[str] = set()
    for row in rows:
        asset = row.get("i") if isinstance(row, dict) else None
        if not isinstance(asset, str):
            continue
        asset = asset.strip().lower()
        if _ID.fullmatch(asset) and asset not in seen:
            seen.add(asset)
            ids.append(asset)
    return ids


def add_clear_month(root: Path, month: str) -> tuple[list[str], int]:
    """Append a month's asset ids to the allowlist. Returns (added, total)."""
    incoming = month_asset_ids(root, month)
    have = load_clear_ids(root)
    added = [asset for asset in incoming if asset not in have]
    merged = have | set(incoming)
    save_clear_ids(root, merged)
    return added, len(merged)
