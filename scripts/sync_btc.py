#!/usr/bin/env python3
"""Refresh site/brain/btc.json with daily BTC closes through yesterday.

CoinMetrics Community API, PriceUSD, one UTC day. No key. A row dated
today is left out because that day has not closed. The homepage chart
reads this file, then replaces the last close with the live spot.
"""

from __future__ import annotations

import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "site" / "brain" / "btc.json"
URL = (
    "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics"
    "?assets=btc&metrics=PriceUSD&frequency=1d&page_size=10000&start_time=2010-07-18"
)


def fetch(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "jaytha-btc", "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as res:
        return json.loads(res.read().decode("utf-8"))


def main() -> None:
    today = datetime.now(timezone.utc).date().isoformat()
    page = URL
    rows = []
    while page:
        body = fetch(page)
        rows.extend(body.get("data") or [])
        page = body.get("next_page_url") or ""
    closes = []
    for row in rows:
        stamp = str(row.get("time") or "")
        day = stamp[:10]
        price = row.get("PriceUSD")
        try:
            value = float(price)
        except (TypeError, ValueError):
            continue
        if len(day) != 10 or not value > 0 or day >= today:
            continue
        closes.append((day, value))
    closes.sort()
    if len(closes) < 1000:
        raise SystemExit(f"bitcoin history too short: {len(closes)}")
    prior = {}
    if OUT.is_file():
        prior = json.loads(OUT.read_text(encoding="utf-8"))
    book = {
        "source": "CoinMetrics Community API, asset metric PriceUSD, frequency 1d",
        "url": "https://community-api.coinmetrics.io/v4/timeseries/asset-metrics?assets=btc&metrics=PriceUSD&frequency=1d",
        "t0": closes[0][0],
        "px": [price for _, price in closes],
    }
    if isinstance(prior.get("law"), dict):
        book["law"] = prior["law"]
    OUT.write_text(json.dumps(book, separators=(",", ":"), ensure_ascii=True) + "\n", encoding="utf-8")
    print(f"{len(closes)} closes, {closes[0][0]} .. {closes[-1][0]}, last {closes[-1][1]:.2f}")


if __name__ == "__main__":
    main()
