#!/usr/bin/env python3
"""Encode one phrase for site/snaps/puzzles.json.

The page does not store the day's answer as plain text. Each phrase is ASCII
bytes XOR 0xA5, then base64. The category stays readable.

  python3 scripts/puzzle_bank.py "WOOL BLAZER" "What Are You Wearing?"

Append the printed object to the puzzles array. Do not reorder or insert
earlier ones. Index 0 is the epoch in that file (America/Chicago). Each next
Chicago day uses the next object. After the last one, the list wraps.

Decoding is in site/snaps/puzzle.js (JayPuzzle.decode). This is light
obfuscation for a personal site, not a secret.
"""

from __future__ import annotations

import base64
import json
import sys

MASK = 0xA5


def encode(phrase: str) -> str:
    raw = phrase.encode("ascii")
    masked = bytes(b ^ MASK for b in raw)
    return base64.b64encode(masked).decode("ascii")


def main(argv: list[str]) -> int:
    if len(argv) != 3 or not argv[1].strip() or not argv[2].strip():
        print("usage: puzzle_bank.py \"PHRASE\" \"Category\"", file=sys.stderr)
        return 2
    phrase = " ".join(argv[1].upper().split())
    if not phrase or any(ch != " " and not ("A" <= ch <= "Z") for ch in phrase):
        print("phrase must be A-Z and spaces", file=sys.stderr)
        return 2
    print(json.dumps({"category": argv[2].strip(), "phrase": encode(phrase)}, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
