#!/usr/bin/env python3
"""Snaps stay the sharp Lightroom rendition.

Frosting is retired. This command does not rewrite month files, does not
set `f`, and does not drop rendition ids. `--apply` and `--bake` are
accepted so an old caller exits 0 without changing the site. There is no
`--clear-month` helper and no month-end clear.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="accepted; does not frost or rewrite snaps")
    parser.add_argument("--bake", action="store_true", help="accepted; does not frost")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.parse_args(argv)
    print("frost retired; every snap stays the sharp Lightroom rendition")
    return 0


if __name__ == "__main__":
    sys.exit(main())
