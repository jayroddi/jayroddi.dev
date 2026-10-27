#!/usr/bin/env python3
"""Rebuild the cursor habit graph. Day pages stay redirects to /.

  python3 scripts/habits.py all      # fetch github, merge cursor-lines.json. day urls stay redirects
  python3 scripts/habits.py fetch    # cursor.json only
  python3 scripts/habits.py pages    # refresh ride counts and keep the redirects
  python3 scripts/habits.py check    # schema only, no network
  python3 scripts/habits.py exercise <health_export_all.json>   # fitness colours from Apple exercise minutes

Dates are America/Chicago. A day total is commits + pull requests opened + pull
requests merged + ai line edits + bike rides + journal thinking + non-cycling
workouts. GitHub's own calendar counts a pull request once and drops some commits;
this file keeps the breakdown instead. A cycling workout on or after 2026-01-01
counts one per 10 ride minutes (each ride rounded half up, at least 1), kept in `rides`. A day from 2026-03-01 through
2026-06-30 with at least one journal note counts as one, kept in `thinking`.
A non-cycling workout on or after 2026-06-01 counts as one, kept in `workouts`.
Cycling is not counted again.

Private repos (mideeyah) need HABITS_GITHUB_TOKEN with repo scope. The Actions
token only sees this public repo. A repo the token cannot see is listed in
cursor.json as a repos_skipped count (names stay in the run log only). Counts are never invented.

cursor-lines.json maps a date to a number (or {"ai_lines": N}). Empty means no
AI edits. workouts.json is a placeholder and this script does not write it.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
HABITS = ROOT / "site" / "habits"
TRACKERS = HABITS / "trackers.json"
CURSOR = HABITS / "cursor.json"
WORKOUTS = HABITS / "workouts.json"
JOURNAL = HABITS / "journal.json"
JARVIS = HABITS / "journal-jarvis.json"
SLEEP = HABITS / "sleep.json"
STEPS = HABITS / "steps.json"
STEPS_CUTS = [2500, 5000, 7500, 10000]
# the grids live on / (site/index.html). /me/ forwards home. /habits/ still forwards to /me/.
INDEX = HABITS.parent / "index.html"
TZ = ZoneInfo("America/Chicago")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RIDE_FROM = "2026-01-01"
THINKING_FROM = "2026-03-01"
THINKING_THROUGH = "2026-06-30"
WORKOUT_CODE_FROM = "2026-06-01"
# public workouts.json says "cycling". A raw Health/Strava row may still say the source type.
RIDE_TYPES = {
    "cycling",
    "ride",
    "hkworkoutactivitytypecycling",
    "strava:ride",
}


def day_pages_enabled() -> bool:
    """Public day pages. Off unless HABITS_DAY_PAGES is 1, true, or yes."""
    return os.environ.get("HABITS_DAY_PAGES", "").strip().lower() in {"1", "true", "yes"}


def chicago_today() -> date:
    return datetime.now(TZ).date()


def ct_day(iso: str) -> str:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.astimezone(TZ).date().isoformat()


def window(today: date) -> tuple[date, date, date]:
    """Return (stats start, grid sunday, grid saturday)."""
    start = today - timedelta(days=364)
    back = (start.weekday() + 1) % 7  # days since Sunday
    grid_start = start - timedelta(days=back)
    forward = (6 - ((today.weekday() + 1) % 7)) % 7
    grid_end = today + timedelta(days=forward)
    return start, grid_start, grid_end


def token() -> str:
    for key in ("HABITS_GITHUB_TOKEN", "GH_TOKEN", "GITHUB_TOKEN"):
        value = os.environ.get(key, "").strip()
        if value:
            return value
    try:
        out = subprocess.check_output(["gh", "auth", "token"], text=True, stderr=subprocess.DEVNULL).strip()
    except (OSError, subprocess.CalledProcessError):
        return ""
    return out


def api(url: str, tok: str):
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": "jaytha-ninja-habits",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if tok:
        headers["Authorization"] = f"Bearer {tok}"
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=45) as res:
            return json.load(res), None
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", "replace")[:300]
        return None, f"HTTP {err.code} {body}"
    except urllib.error.URLError as err:
        return None, str(err.reason)


def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def dump_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_manual(path: Path) -> dict[str, int]:
    if not path.exists():
        return {}
    raw = load_json(path).get("days") or {}
    out: dict[str, int] = {}
    for key, value in raw.items():
        if not DATE_RE.fullmatch(str(key)):
            continue
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)):
            count = int(value)
        elif isinstance(value, dict):
            count = int(value.get("ai_lines") or 0)
        else:
            continue
        if count > 0:
            out[str(key)] = count
    return out


def blank_day() -> dict:
    return {"commits": 0, "prs_opened": 0, "prs_merged": 0, "items": []}


def is_cycling(item: dict) -> bool:
    raw = str(item.get("type") or "").strip().lower()
    compact = raw.replace("_", "").replace(" ", "")
    return raw in RIDE_TYPES or compact in RIDE_TYPES or compact.endswith("cycling")


RIDE_MINUTES_PER_POINT = 10


def ride_points(minutes: float) -> int:
    """One contribution per 10 ride minutes, rounded half up (85 min -> 9, 84.9 -> 8), never under 1."""
    return max(1, int(float(minutes) / RIDE_MINUTES_PER_POINT + 0.5))


def ride_counts(workouts: dict | None = None) -> dict[str, int]:
    """Code contributions from cycling on or after 2026-01-01: each ride is ride_points(its minutes).

    Per-ride minutes come from day items, else the day's ride_min list. A day with neither
    splits its minutes evenly when every workout that day is a ride, else counts 1 per ride."""
    if workouts is None:
        if not WORKOUTS.exists():
            return {}
        workouts = load_json(WORKOUTS)
    counts: dict[str, int] = {}
    for day_key, day in (workouts.get("days") or {}).items():
        if not DATE_RE.fullmatch(str(day_key)) or day_key < RIDE_FROM or not isinstance(day, dict):
            continue
        if "items" in day:
            mins = [float(item.get("duration_min") or item.get("minutes") or 0)
                    for item in (day.get("items") or []) if isinstance(item, dict) and is_cycling(item)]
        elif isinstance(day.get("ride_min"), list):
            mins = [float(m or 0) for m in day["ride_min"]]
        else:
            rides = int(day.get("rides") or 0)
            if rides and rides == int(day.get("total") or 0):
                mins = [float(day.get("minutes") or 0) / rides] * rides
            else:
                mins = [0.0] * rides
        n = sum(ride_points(m) for m in mins)
        if n:
            counts[str(day_key)] = n
    return counts


def thinking_counts(journal: dict | None = None) -> dict[str, int]:
    """One coding session on a day from 2026-03-01 through 2026-06-30 with at least one journal note."""
    if journal is None:
        if not JOURNAL.exists():
            return {}
        journal = load_json(JOURNAL)
    src = journal.get("days") if isinstance(journal.get("days"), dict) else journal
    if not isinstance(src, dict):
        return {}
    counts: dict[str, int] = {}
    for key, value in src.items():
        text = str(key)
        if not DATE_RE.fullmatch(text) or text < THINKING_FROM or text > THINKING_THROUGH:
            continue
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        if int(value) >= 1:
            counts[text] = 1
    return counts


def workout_code_counts(workouts: dict | None = None) -> dict[str, int]:
    """One coding session per non-cycling workout on or after 2026-06-01. Cycling stays in rides."""
    if workouts is None:
        if not WORKOUTS.exists():
            return {}
        workouts = load_json(WORKOUTS)
    counts: dict[str, int] = {}
    for day_key, day in (workouts.get("days") or {}).items():
        if not DATE_RE.fullmatch(str(day_key)) or str(day_key) < WORKOUT_CODE_FROM or not isinstance(day, dict):
            continue
        if "items" in day:
            n = sum(1 for item in (day.get("items") or []) if isinstance(item, dict) and not is_cycling(item))
        else:
            n = int(day.get("total") or 0) - int(day.get("rides") or 0)
        if n > 0:
            counts[str(day_key)] = n
    return counts


def compose_day(day: dict, rides: int, thinking: int = 0, workout_sessions: int = 0) -> dict:
    commits = int(day.get("commits") or 0)
    opened = int(day.get("prs_opened") or 0)
    merged = int(day.get("prs_merged") or 0)
    ai = int(day.get("ai_lines") or 0)
    out = {
        "total": commits + opened + merged + ai + rides + thinking + workout_sessions,
        "commits": commits,
        "prs_opened": opened,
        "prs_merged": merged,
    }
    if ai > 0:
        out["ai_lines"] = ai
    if rides > 0:
        out["rides"] = rides
    if thinking > 0:
        out["thinking"] = thinking
    if workout_sessions > 0:
        out["workouts"] = workout_sessions
    if day_pages_enabled():
        out["items"] = day.get("items") or []
    return out


def counting_text() -> str:
    return (
        "total = commits + prs opened + prs merged + ai line edits + bike rides + journal thinking + non-cycling workouts. "
        "Commit dates are author dates in America/Chicago. Merge commits are skipped. "
        "A pull request counts on the day it was opened and, if merged, again on the day it merged. "
        "GitHub's contribution calendar counts a pull request once and omits some commits; this file keeps the breakdown. "
        "AI line edits come only from cursor-lines.json. "
        "A cycling workout on or after 2026-01-01 counts one contribution per 10 minutes of ride time "
        "(each ride rounded half up, at least 1), kept in rides. The ride still counts on the workouts graph. "
        "A day from 2026-03-01 through 2026-06-30 with at least one journal note counts as one thinking session. "
        "A non-cycling workout on or after 2026-06-01 counts as one coding session, kept in workouts. "
        "Cycling is not counted again. The site shows the day's total only."
    )


def apply_rides(cursor: dict, workouts: dict | None = None, journal: dict | None = None) -> dict:
    """Fold ride, journal, and non-cycling workout sessions into code days. Each field stays separate."""
    rides = ride_counts(workouts)
    thinking = thinking_counts(journal)
    sessions = workout_code_counts(workouts)
    days = cursor.get("days") or {}
    merged = {}
    for key in sorted(set(days) | set(rides) | set(thinking) | set(sessions)):
        if not DATE_RE.fullmatch(key):
            continue
        final = compose_day(
            days.get(key) or {},
            rides.get(key, 0),
            thinking.get(key, 0),
            sessions.get(key, 0),
        )
        if final["total"] > 0:
            merged[key] = final
    cursor["days"] = merged
    cursor["counting"] = counting_text()
    return cursor


def refresh_rides() -> None:
    if not CURSOR.exists():
        print("habits: no cursor.json yet; rides wait for the next fetch", file=sys.stderr)
        return
    cursor = apply_rides(load_json(CURSOR))
    dump_json(CURSOR, cursor)
    days = cursor["days"].values()
    ride_n = sum(int(day.get("rides") or 0) for day in days)
    ride_days = sum(1 for day in days if day.get("rides"))
    think_n = sum(int(day.get("thinking") or 0) for day in days)
    work_n = sum(int(day.get("workouts") or 0) for day in days)
    print(
        f"habits: sessions folded into cursor.json "
        f"({ride_n} ride points on {ride_days} days, {think_n} thinking, {work_n} non-cycling workouts)"
    )


def finalize_day(day: dict) -> dict:
    ai = int(day.pop("_ai", 0) or 0)
    items = sorted(day["items"], key=lambda item: (item.get("at") or "", item.get("role") or "", item.get("sha") or ""))
    return compose_day(
        {
            "commits": day["commits"],
            "prs_opened": day["prs_opened"],
            "prs_merged": day["prs_merged"],
            "_ai": ai,
            "ai_lines": ai,
            "items": items,
        },
        0,
    )


def fetch_repo(repo: str, tok: str, since_iso: str, login: str, cutoff: str) -> tuple[list, list, str | None]:
    commits: list = []
    page = 1
    while page <= 30:
        qs = urllib.parse.urlencode({
            "author": login,
            "since": since_iso,
            "per_page": 100,
            "page": page,
        })
        batch, err = api(f"https://api.github.com/repos/{repo}/commits?{qs}", tok)
        if err:
            return [], [], err
        if not batch:
            break
        commits.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    pulls: list = []
    page = 1
    while page <= 30:
        qs = urllib.parse.urlencode({
            "state": "all",
            "per_page": 100,
            "sort": "updated",
            "direction": "desc",
            "page": page,
        })
        batch, err = api(f"https://api.github.com/repos/{repo}/pulls?{qs}", tok)
        if err:   # a contents-only token can read commits but not pulls on private repos: keep the commits
            print(f"habits: pull requests unreadable on a repo, commits still counted: {err[:60]}", file=sys.stderr)
            return commits, [], None
        if not batch:
            break
        pulls.extend(batch)
        if all(ct_day(item["updated_at"]) < cutoff for item in batch):
            break
        if len(batch) < 100:
            break
        page += 1
    return commits, pulls, None


def list_repos(cfg: dict, tok: str) -> list[str]:
    """Every repo the token can see that Jay owns (public and private). Never published: only counts leave this script.
    trackers.json "repos": "all" (default) or an explicit list; "exclude_forks" defaults to true."""
    want = cfg.get("repos", "all")
    if isinstance(want, list):
        return want
    out, page = [], 1
    while page <= 10:
        qs = urllib.parse.urlencode({"affiliation": "owner,collaborator,organization_member", "per_page": 100, "page": page})
        batch, err = api(f"https://api.github.com/user/repos?{qs}", tok)
        if err or not batch:
            if err:
                print(f"habits: repo listing failed: {err}", file=sys.stderr)
            break
        out += [r["full_name"] for r in batch if not (cfg.get("exclude_forks", True) and r.get("fork"))]
        if len(batch) < 100:
            break
        page += 1
    return sorted(set(out))


def write_cursor(cfg: dict, today: date) -> dict:
    data = build_cursor_once(cfg, today)
    if not data["days"] and not CURSOR.exists():
        raise SystemExit("habits: github returned no days and cursor.json does not exist")
    if not data["days"] and CURSOR.exists():
        print("habits: fetch produced no days; leaving cursor.json as it is", file=sys.stderr)
        return load_json(CURSOR)
    dump_json(CURSOR, data)
    active = len(data["days"])
    total = sum(day["total"] for day in data["days"].values())
    print(f"habits: wrote {CURSOR.relative_to(ROOT)} ({active} active days, total {total})")
    print(f"habits: repos counted {data['repos_counted']}, skipped {data['repos_skipped']}")
    return data


def build_cursor_once(cfg: dict, today: date) -> dict:
    """Same as build_cursor but finalize each day a single time."""
    login = cfg["login"]
    _start, grid_start, _grid_end = window(today)
    since = datetime(grid_start.year, grid_start.month, grid_start.day, tzinfo=TZ).astimezone(timezone.utc)
    since_iso = since.strftime("%Y-%m-%dT%H:%M:%SZ")
    tok = token()
    days: dict[str, dict] = {}
    skipped = []

    def bucket(day_key: str) -> dict:
        if day_key not in days:
            days[day_key] = blank_day()
        return days[day_key]

    repos = list_repos(cfg, tok)
    for repo in repos:
        commits, pulls, err = fetch_repo(repo, tok, since_iso, login, grid_start.isoformat())
        if err:
            skipped.append({
                "repo": repo,
                "reason": err + " Private repos need a HABITS_GITHUB_TOKEN secret with repo scope.",
            })
            print(f"habits: skipped a repo: {err}", file=sys.stderr)   # name stays in the log only
            continue
        for commit in commits:
            if len(commit.get("parents") or []) > 1:
                continue
            author = (commit.get("commit") or {}).get("author") or {}
            if not author.get("date"):
                continue
            day_key = ct_day(author["date"])
            if day_key < grid_start.isoformat() or day_key > today.isoformat():
                continue
            subject = ((commit.get("commit") or {}).get("message") or "").split("\n", 1)[0].strip()
            row = bucket(day_key)
            row["commits"] += 1
            row["items"].append({
                "kind": "commit",
                "repo": repo,
                "sha": commit.get("sha") or "",
                "title": (subject or "(no message)")[:180],
                "url": commit.get("html_url") or "",
                "at": author["date"],
            })
        for pull in pulls:
            if (pull.get("user") or {}).get("login") != login:
                continue
            title = (pull.get("title") or "(pull request)")[:180]
            url = pull.get("html_url") or ""
            number = pull.get("number")
            state = "merged" if pull.get("merged_at") else (pull.get("state") or "open")
            created = pull.get("created_at")
            if created:
                day_key = ct_day(created)
                if grid_start.isoformat() <= day_key <= today.isoformat():
                    row = bucket(day_key)
                    row["prs_opened"] += 1
                    row["items"].append({
                        "kind": "pr",
                        "role": "opened",
                        "repo": repo,
                        "number": number,
                        "title": title,
                        "url": url,
                        "state": state,
                        "at": created,
                    })
            merged_at = pull.get("merged_at")
            if merged_at:
                day_key = ct_day(merged_at)
                if grid_start.isoformat() <= day_key <= today.isoformat():
                    row = bucket(day_key)
                    row["prs_merged"] += 1
                    row["items"].append({
                        "kind": "pr",
                        "role": "merged",
                        "repo": repo,
                        "number": number,
                        "title": title,
                        "url": url,
                        "state": "merged",
                        "at": merged_at,
                    })

    manual_name = "cursor-lines.json"
    for tracker in cfg["trackers"]:
        if tracker["id"] == "cursor" and tracker.get("manual"):
            manual_name = tracker["manual"]
    for day_key, count in load_manual(HABITS / manual_name).items():
        if day_key > today.isoformat():
            continue
        bucket(day_key)["_ai"] = count

    cleaned = {}
    for key in sorted(days):
        final = finalize_day(days[key])
        if final["total"] > 0:
            cleaned[key] = final

    data = {
        "id": "cursor",
        "label": next((t["label"] for t in cfg["trackers"] if t["id"] == "cursor"), "cursor"),
        "timezone": "America/Chicago",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "through": today.isoformat(),
        "login": login,
        "repos_counted": len(repos) - len(skipped),   # counts only: no repo names, messages, shas or urls are published
        "repos_skipped": len(skipped),
        "manual": manual_name,
        "counting": counting_text(),
        "days": cleaned,
    }
    return apply_rides(data)


def check_index(cfg: dict) -> None:
    html = INDEX.read_text(encoding="utf-8")
    for tracker in cfg["trackers"]:
        if tracker.get("enabled", True) and f'data-id="{tracker["id"]}"' not in html:
            raise SystemExit(f"habits: site/index.html has no section for {tracker['id']}")


def date_keys(data: dict) -> list[date]:
    """YYYY-MM-DD keys on a tracker file. Journal is a flat map; the others use days."""
    if not isinstance(data, dict):
        return []
    found: list[date] = []
    seen: set[str] = set()

    def take(bucket) -> None:
        if not isinstance(bucket, dict):
            return
        for key in bucket:
            text = str(key)
            if text in seen or not DATE_RE.fullmatch(text):
                continue
            seen.add(text)
            found.append(date.fromisoformat(text))

    take(data.get("days"))
    take(data)
    return found


def habit_files() -> list[Path]:
    cfg = load_json(TRACKERS)
    paths: list[Path] = []
    for tracker in cfg.get("trackers") or []:
        rel = str(tracker.get("data") or "")
        if rel.startswith("/"):
            paths.append(ROOT / "site" / rel.lstrip("/"))
        elif rel:
            paths.append(HABITS / rel)
        manual = tracker.get("manual")
        if manual:
            paths.append(HABITS / str(manual))
    return paths


def habit_dates() -> list[date]:
    found: list[date] = []
    for path in habit_files():
        if path.exists():
            found.extend(date_keys(load_json(path)))
    return found


def coverage_end(today: date) -> date:
    """Last day a cell can name. Today, or a later day already stored in a habit file."""
    dates = habit_dates()
    latest = max(dates) if dates else today
    return max(today, latest)


def stamp_coverage(end: date) -> None:
    """The grid reads this and will not link a day past the last page written."""
    html = INDEX.read_text(encoding="utf-8")
    marker = f'data-pages-through="{end.isoformat()}"'
    if 'data-pages-through="' in html:
        html = re.sub(r'data-pages-through="\d{4}-\d{2}-\d{2}"', marker, html, count=1)
    else:
        html = html.replace('<body class="board">', f'<body class="board" {marker}>', 1)
    INDEX.write_text(html, encoding="utf-8")


def clear_coverage() -> None:
    html = INDEX.read_text(encoding="utf-8")
    html = re.sub(r'\s*data-pages-through="\d{4}-\d{2}-\d{2}"', "", html, count=1)
    INDEX.write_text(html, encoding="utf-8")


REDIRECT_STUB = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>jay tha ninja</title>
<!-- v2.16: every page except / forwards home. location.replace keeps ?query and #hash, and the stub never sits in the back history. -->
<script>location.replace("/" + location.search + location.hash)</script>
<meta http-equiv="refresh" content="0; url=/">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#000000">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="https://jayroddi.lol/">
<meta property="og:type" content="website">
<meta property="og:site_name" content="jayroddi.lol">
<meta property="og:url" content="https://jayroddi.lol/">
<meta property="og:title" content="let your success be what shakes the ground">
<meta property="og:description" content="a year of habits // sleep, fitness, code, and journal">
<meta property="og:image" content="https://jayroddi.lol/og-card.png?v=3.3">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="by jay, a millennial living out loud">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@jayroddi">
<meta name="twitter:url" content="https://jayroddi.lol/">
<meta name="twitter:title" content="let your success be what shakes the ground">
<meta name="twitter:description" content="a year of habits // sleep, fitness, code, and journal">
<meta name="twitter:image" content="https://jayroddi.lol/og-card.png?v=3.3">
<meta name="twitter:image:alt" content="by jay, a millennial living out loud">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"jayroddi.lol","url":"https://jayroddi.lol/"}</script>
<style>html,body{margin:0;background:#000;color:#f6efe9}body{font:16px/1.5 "JetBrains Mono",ui-monospace,monospace;padding:24px}a{color:#FF4D1A;text-decoration:none}</style>
</head>
<body>
<p><a href="/">jayroddi.lol</a></p>
</body>
</html>
"""


def assert_pages(today: date) -> tuple[date, date]:
    _start, grid_start, _grid_end = window(today)
    end = coverage_end(today)
    if end < grid_start:
        end = grid_start
    missing = []
    day = grid_start
    while day <= end:
        if not (HABITS / day.isoformat() / "index.html").is_file():
            missing.append(day.isoformat())
        day += timedelta(days=1)
    if missing:
        raise SystemExit(
            "habits: grid can link a day with no page: " + ", ".join(missing[:12])
        )
    html = INDEX.read_text(encoding="utf-8")
    marker = f'data-pages-through="{end.isoformat()}"'
    if marker not in html:
        raise SystemExit(f"habits: site/index.html is missing {marker}")
    return grid_start, end


def write_redirects() -> int:
    """Replace each published day page with a forward to /. New dates are not added."""
    n = 0
    for child in sorted(HABITS.iterdir()):
        if not child.is_dir() or not DATE_RE.fullmatch(child.name):
            continue
        (child / "index.html").write_text(REDIRECT_STUB, encoding="utf-8")
        n += 1
    clear_coverage()
    print(f"habits: day pages off; {n} old dates redirect to /")
    return n


def assert_redirects() -> int:
    html = INDEX.read_text(encoding="utf-8")
    if 'data-pages-through="' in html:
        raise SystemExit("habits: data-pages-through is set while day pages are off")
    marker = 'location.replace("/" + location.search + location.hash)'
    refresh = 'content="0; url=/"'
    n = 0
    for child in HABITS.iterdir():
        if not child.is_dir() or not DATE_RE.fullmatch(child.name):
            continue
        page = child / "index.html"
        if not page.is_file():
            raise SystemExit(f"habits: {child.name} has no redirect")
        text = page.read_text(encoding="utf-8")
        if marker not in text or refresh not in text or "day.js" in text:
            raise SystemExit(f"habits: {child.name} is not a redirect to /")
        n += 1
    if n == 0:
        raise SystemExit("habits: no day-page redirects under site/habits")
    # grids live on /. /me/ forwards home. /habits/ still forwards to /me/, which forwards home.
    if 'class="trackers"' not in html or marker in html:
        raise SystemExit("habits: site/index.html is not the grids page")
    me = (HABITS.parent / "me" / "index.html").read_text(encoding="utf-8")
    if marker not in me or refresh not in me:
        raise SystemExit("habits: site/me/index.html is not a redirect to /")
    stub = (HABITS / "index.html").read_text(encoding="utf-8") if (HABITS / "index.html").is_file() else ""
    if 'location.replace("/me/"' not in stub:
        raise SystemExit("habits: site/habits/index.html is not a redirect to /me/")
    return n


def publish_counts() -> None:
    """Drop day-page detail from the public files. Grids keep the day's counts."""
    if day_pages_enabled() or not WORKOUTS.exists():
        return
    workouts = load_json(WORKOUTS)
    for day in (workouts.get("days") or {}).values():
        if not isinstance(day, dict):
            continue
        if "items" in day:
            ride_items = [item for item in (day.get("items") or []) if isinstance(item, dict) and is_cycling(item)]
            rides = len(ride_items)
            if rides:
                day["ride_min"] = [_round1(item.get("duration_min") or 0) for item in ride_items]
            day.pop("items", None)
        else:
            rides = int(day.get("rides") or 0)
        if rides:
            day["rides"] = rides
        else:
            day.pop("rides", None)
            day.pop("ride_min", None)
    dump_json(WORKOUTS, workouts)


def _num(value):
    if value is None or value is False or value is True:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _round1(value) -> float:
    return round(float(value) + 0.0, 1)


def slim_workout(raw: dict) -> dict:
    """Fields the day page draws. Nothing else (no device names, timezones, HR series)."""
    start = (raw.get("start") or "")[:5]
    end = (raw.get("end") or "")[:5]
    item = {
        "type": raw.get("type") or "workout",
        "start": start,
        "end": end,
        "duration_min": _round1(raw.get("duration_min") or 0),
    }
    name = ((raw.get("strava") or {}) if isinstance(raw.get("strava"), dict) else {}).get("name")
    if name:
        item["name"] = str(name)
    dist = _num(raw.get("distance_mi"))
    if dist and dist > 0:
        item["distance_mi"] = _round1(dist)
    kcal = _num(raw.get("active_kcal"))
    if kcal and kcal > 0:
        item["kcal"] = int(round(kcal))
    elev = _num(((raw.get("strava") or {}) if isinstance(raw.get("strava"), dict) else {}).get("elev_gain_ft"))
    if elev and elev > 0:
        item["elevation_ft"] = int(round(elev))
    avg = _num(raw.get("avg_hr"))
    mx = _num(raw.get("max_hr"))
    if avg:
        item["avg_hr"] = int(round(avg))
    if mx:
        item["max_hr"] = int(round(mx))
    zones = ((raw.get("hr") or {}) if isinstance(raw.get("hr"), dict) else {}).get("zones") or []
    mins = []
    for zone in zones:
        mins.append(_round1((zone or {}).get("minutes") or 0))
    if any(m > 0 for m in mins):
        while len(mins) < 5:
            mins.append(0.0)
        item["zones"] = mins[:5]
    url = ((raw.get("strava") or {}) if isinstance(raw.get("strava"), dict) else {}).get("url")
    if url:
        item["strava"] = url
    return item


EXERCISE_FROM = "2025-10-05"  # first day the habit graphs cover
# fitness cell levels from Apple's daily exercise minutes (activity summary appleExerciseTime).
# a cut is the top of its level: 1-14, 15-29, 30-59 (ring closed, goal 30), 60-89, 90+.
# set from the full Apple Health history 2015-06-20..2026-10-13 (3974 days): median 14, p60 28, p80 53, p95 91.
EXERCISE_CUTS = [14, 29, 59, 89]
EXERCISE_LEGEND = ("A cell is the day's Apple exercise minutes (activity summary appleExerciseTime). "
                   "1 is 1 to 14, 2 is 15 to 29, 3 is 30 to 59 (ring goal closed), 4 is 60 to 89, 5 is 90 or more. "
                   "No record or 0 is empty.")


def exercise_from_export(src: Path, through: str) -> dict[str, int]:
    """{date: minutes} from activity summaries, EXERCISE_FROM..through, zero days left out."""
    raw = load_json(src)
    rows = raw.get("activity_summary") if isinstance(raw, dict) else raw
    out = {}
    for row in rows or []:
        key = str(row.get("dateComponents") or "")
        if not DATE_RE.fullmatch(key) or key < EXERCISE_FROM or key > through:
            continue
        try:
            mins = int(round(float(row.get("appleExerciseTime") or 0)))
        except (TypeError, ValueError):
            continue
        if mins > 0:
            out[key] = mins
    return dict(sorted(out.items()))


def write_exercise(src: Path) -> None:
    data = load_json(WORKOUTS)
    data["exercise"] = exercise_from_export(src, data.get("through") or chicago_today().isoformat())
    data["intensity"] = {"metric": "exercise_min", "edges": EXERCISE_CUTS, "legend": EXERCISE_LEGEND}
    dump_json(WORKOUTS, data)
    print(f"habits: fitness colours from exercise minutes on {len(data['exercise'])} days")


def write_workouts(src: Path) -> dict:
    """Build the public workouts.json from a merged Health + Strava export.

    The exercise map and its intensity (write_exercise) are kept from the current file.

    Intensity is the day's active minutes (duration_min summed), not the workout
    count. Edges are fixed: under 45, 45–89, 90–149, 150+. Records with
    exclude:true are dropped. Several workouts on one date add up.
    """
    raw = load_json(src)
    grouped: dict[str, list] = {}
    skipped = 0
    for workout in raw.get("workouts") or []:
        if workout.get("exclude"):
            skipped += 1
            continue
        day_key = workout.get("date") or ""
        if not DATE_RE.fullmatch(day_key):
            raise SystemExit(f"habits: workout missing a date: {workout.get('id')}")
        grouped.setdefault(day_key, []).append(workout)
    days = {}
    for day_key in sorted(grouped):
        rows = sorted(grouped[day_key], key=lambda row: row.get("start") or "")
        items = [slim_workout(row) for row in rows]
        minutes = int(round(sum(float(row.get("duration_min") or 0) for row in rows)))
        rides = sum(1 for item in items if is_cycling(item))
        entry = {"total": len(items), "minutes": minutes}
        if rides:
            entry["rides"] = rides
            entry["ride_min"] = [round(float(row.get("duration_min") or 0), 1) for row in rows if is_cycling(row)]
        if day_pages_enabled():
            entry["items"] = items
        days[day_key] = entry
    edges = [45, 90, 150]
    counts = [0, 0, 0, 0]
    for day in days.values():
        mins = day["minutes"]
        if mins < edges[0]:
            counts[0] += 1
        elif mins < edges[1]:
            counts[1] += 1
        elif mins < edges[2]:
            counts[2] += 1
        else:
            counts[3] += 1
    data = {
        "id": "workouts",
        "label": "workouts",
        "timezone": "America/Chicago",
        "generated": raw.get("generated"),
        "through": chicago_today().isoformat(),
        "source": "Apple Health and Strava. exclude:true records are omitted. Empty months are real gaps.",
        "intensity": {
            "metric": "minutes",
            "edges": edges,
            "legend": "A cell is the day's active minutes (duration_min, summed). 1 is under 45, 2 is 45 to 89, 3 is 90 to 149, 4 is 150 or more.",
        },
        "days": days,
    }
    old = load_json(WORKOUTS) if WORKOUTS.exists() else {}
    if isinstance(old.get("exercise"), dict):
        data["intensity"] = old.get("intensity") or data["intensity"]
        data["exercise"] = old["exercise"]
    dump_json(WORKOUTS, data)
    refresh_rides()
    longest = run = 0
    if days:
        first = date.fromisoformat(min(days))
        last = date.fromisoformat(max(days))
        probe = first
        while probe <= last:
            if days.get(probe.isoformat(), {}).get("total"):
                run += 1
                longest = max(longest, run)
            else:
                run = 0
            probe += timedelta(days=1)
    print(
        f"habits: wrote {WORKOUTS.relative_to(ROOT)} "
        f"({sum(day['total'] for day in days.values())} workouts, {len(days)} days, "
        f"skipped {skipped}, longest streak {longest})"
    )
    print(f"habits: minute buckets under45={counts[0]} 45-89={counts[1]} 90-149={counts[2]} 150+={counts[3]}")
    return data


def check_jarvis() -> None:
    """journal-jarvis.json is a flat date-to-count map. Counts only, never text."""
    if not JARVIS.exists():
        raise SystemExit("habits: journal-jarvis.json is missing")
    data = load_json(JARVIS)
    if not isinstance(data, dict):
        raise SystemExit("habits: journal-jarvis.json must be a flat object")

    def no_strings(value: object, path: str) -> None:
        if isinstance(value, str):
            raise SystemExit(f"habits: journal-jarvis.json has a string at {path or 'root'}")
        if isinstance(value, dict):
            for key, item in value.items():
                no_strings(item, f"{path}.{key}" if path else str(key))
        elif isinstance(value, list):
            for i, item in enumerate(value):
                no_strings(item, f"{path}[{i}]")

    no_strings(data, "")
    for key, n in data.items():
        if not DATE_RE.fullmatch(key):
            raise SystemExit(f"habits: bad jarvis date {key}")
        if isinstance(n, bool) or not isinstance(n, int) or n < 1:
            raise SystemExit(f"habits: {key} jarvis count {n!r} is not an int >= 1")


def check_sleep() -> None:
    data = load_json(SLEEP)
    days = data.get("days") or {}
    if not isinstance(days, dict):
        raise SystemExit("habits: sleep.json days must be an object")
    for key, day in days.items():
        if not DATE_RE.fullmatch(key):
            raise SystemExit(f"habits: bad sleep date {key}")
        if not isinstance(day, dict) or set(day) != {"score", "asleep_min"}:
            raise SystemExit(f"habits: {key} sleep day must be score and asleep_min only")
        score = day["score"]
        mins = day["asleep_min"]
        if isinstance(score, bool) or not isinstance(score, int) or not 0 <= score <= 100:
            raise SystemExit(f"habits: {key} sleep score {score} is outside 0-100")
        if isinstance(mins, bool) or not isinstance(mins, int) or mins < 0:
            raise SystemExit(f"habits: {key} asleep_min {mins} is not a minute count")


def check_steps() -> None:
    data = load_json(STEPS)
    days = data.get("days") or {}
    if not isinstance(days, dict):
        raise SystemExit("habits: steps.json days must be an object")
    edges = (data.get("intensity") or {}).get("edges")
    if edges != STEPS_CUTS:
        raise SystemExit(f"habits: steps.json edges {edges} != {STEPS_CUTS}")
    if data.get("start") != "2025-10-05" or data.get("through") != "2026-10-25":
        raise SystemExit("habits: steps.json window must be 2025-10-05 through 2026-10-25")
    for key, day in days.items():
        if not DATE_RE.fullmatch(key) or key < "2025-10-05" or key > "2026-10-25":
            raise SystemExit(f"habits: bad steps date {key}")
        if not isinstance(day, dict) or set(day) != {"steps"}:
            raise SystemExit(f"habits: {key} steps day must be steps only")
        steps = day["steps"]
        if isinstance(steps, bool) or not isinstance(steps, int) or steps <= 0:
            raise SystemExit(f"habits: {key} steps {steps!r} is not a positive count")
    if len(days) != 380:
        raise SystemExit(f"habits: steps.json has {len(days)} days, expected 380")


def check_exercise(workouts: dict) -> None:
    ex = workouts.get("exercise")
    metric = (workouts.get("intensity") or {}).get("metric")
    if ex is None:
        if metric == "exercise_min":
            raise SystemExit("habits: workouts.json intensity is exercise_min but has no exercise map")
        return
    if metric != "exercise_min" or (workouts.get("intensity") or {}).get("edges") != EXERCISE_CUTS:
        raise SystemExit("habits: workouts.json exercise map needs intensity exercise_min with EXERCISE_CUTS")
    if not isinstance(ex, dict):
        raise SystemExit("habits: workouts.json exercise must be an object")
    through = workouts.get("through") or ""
    for key, val in ex.items():
        if not DATE_RE.fullmatch(key) or key < EXERCISE_FROM or (through and key > through):
            raise SystemExit(f"habits: exercise day {key} outside {EXERCISE_FROM}..{through}")
        if not isinstance(val, int) or isinstance(val, bool) or not 0 < val <= 1440:
            raise SystemExit(f"habits: exercise {key} = {val!r} is not 1..1440 minutes")


def check() -> None:
    cfg = load_json(TRACKERS)
    check_index(cfg)
    cursor = load_json(CURSOR)
    workouts = load_json(WORKOUTS)
    if not isinstance(workouts.get("days"), dict):
        raise SystemExit("habits: workouts.json days must be an object")
    check_exercise(workouts)
    days = cursor.get("days") or {}
    for key, day in days.items():
        if not DATE_RE.fullmatch(key):
            raise SystemExit(f"habits: bad date {key}")
        ai = int(day.get("ai_lines") or 0)
        rides = int(day.get("rides") or 0)
        thinking = int(day.get("thinking") or 0)
        workout_sessions = int(day.get("workouts") or 0)
        expect = (
            int(day["commits"]) + int(day["prs_opened"]) + int(day["prs_merged"])
            + ai + rides + thinking + workout_sessions
        )
        if int(day["total"]) != expect:
            raise SystemExit(f"habits: {key} total {day['total']} != {expect}")
        if ai == 0 and "ai_lines" in day:
            raise SystemExit(f"habits: {key} has a zero ai_lines key; omit it")
        if rides == 0 and "rides" in day:
            raise SystemExit(f"habits: {key} has a zero rides key; omit it")
        if thinking == 0 and "thinking" in day:
            raise SystemExit(f"habits: {key} has a zero thinking key; omit it")
        if thinking not in (0, 1):
            raise SystemExit(f"habits: {key} thinking {thinking} is not 0 or 1")
        if workout_sessions == 0 and "workouts" in day:
            raise SystemExit(f"habits: {key} has a zero workouts key; omit it")
        if workout_sessions < 0:
            raise SystemExit(f"habits: {key} workouts {workout_sessions} is negative")
    journal = load_json(JOURNAL) if JOURNAL.exists() else {}
    expected_rides = ride_counts(workouts)
    expected_thinking = thinking_counts(journal)
    expected_workouts = workout_code_counts(workouts)
    for key, n in expected_rides.items():
        got = int((days.get(key) or {}).get("rides") or 0)
        if got != n:
            raise SystemExit(f"habits: {key} rides {got} != {n} ride points")
    for key, day in days.items():
        got = int(day.get("rides") or 0)
        if got and expected_rides.get(key, 0) != got:
            raise SystemExit(f"habits: {key} rides {got} has no matching ride points")
        got_t = int(day.get("thinking") or 0)
        if got_t != expected_thinking.get(key, 0):
            raise SystemExit(f"habits: {key} thinking {got_t} != {expected_thinking.get(key, 0)}")
        got_w = int(day.get("workouts") or 0)
        if got_w != expected_workouts.get(key, 0):
            raise SystemExit(f"habits: {key} workouts {got_w} != {expected_workouts.get(key, 0)}")
    for key, n in expected_thinking.items():
        if int((days.get(key) or {}).get("thinking") or 0) != n:
            raise SystemExit(f"habits: {key} is missing thinking {n}")
    for key, n in expected_workouts.items():
        if int((days.get(key) or {}).get("workouts") or 0) != n:
            raise SystemExit(f"habits: {key} is missing workouts {n}")
    today = date.fromisoformat(cursor.get("through") or chicago_today().isoformat())
    start, _grid_start, _grid_end = window(today)
    longest = run = 0
    current = 0
    year_total = 0
    best_n = 0
    best_day = ""
    by_month: dict[str, int] = {}
    cursor_day = today
    # current streak ends today if today is active, else yesterday
    if not days.get(today.isoformat(), {}).get("total"):
        cursor_day = today - timedelta(days=1)
    if days.get(cursor_day.isoformat(), {}).get("total"):
        probe = cursor_day
        while days.get(probe.isoformat(), {}).get("total"):
            current += 1
            probe -= timedelta(days=1)
    day = start
    while day <= today:
        n = int((days.get(day.isoformat()) or {}).get("total") or 0)
        year_total += n
        if n > 0:
            run += 1
            longest = max(longest, run)
            mo = day.isoformat()[:7]
            by_month[mo] = by_month.get(mo, 0) + n
            if n > best_n or (n == best_n and day.isoformat() > best_day):
                best_n = n
                best_day = day.isoformat()
        else:
            run = 0
        day += timedelta(days=1)
    best_mo = ""
    best_mo_n = 0
    for mo, n in by_month.items():
        if n > best_mo_n or (n == best_mo_n and mo > best_mo):
            best_mo = mo
            best_mo_n = n
    total = sum(int(day["total"]) for day in days.values())
    wdays = workouts.get("days") or {}
    for key, day in wdays.items():
        if not DATE_RE.fullmatch(key):
            raise SystemExit(f"habits: bad workout date {key}")
        items = day.get("items")
        if items is None:
            if day_pages_enabled():
                raise SystemExit(f"habits: {key} is missing workout items")
        elif int(day["total"]) != len(items):
            raise SystemExit(f"habits: {key} workout total {day['total']} != {len(items)} items")
        if int(day.get("minutes") or 0) <= 0:
            raise SystemExit(f"habits: {key} is an active day with no minutes")
        if "ride_min" in day and len(day["ride_min"]) != int(day.get("rides") or 0):
            raise SystemExit(f"habits: {key} ride_min has {len(day['ride_min'])} entries for {day.get('rides') or 0} rides")
        if key.startswith("2025-") or key[5:7] in {"04", "05"} and key.startswith("2026-"):
            raise SystemExit(f"habits: {key} falls in a real empty stretch and should not be in the file")
    check_sleep()
    check_steps()
    check_jarvis()
    n = assert_redirects()
    pages = f"{n} day urls redirect to /"
    print(
        f"habits: check ok. cursor active {len(days)}, total {total}, year {year_total}, "
        f"longest {longest}, current {current}, best month {best_mo} ({best_mo_n}), best day {best_day} ({best_n}); "
        f"workouts {len(wdays)} days; {pages}"
    )


def main(argv: list[str]) -> None:
    cmd = argv[1] if len(argv) > 1 else "all"
    if cmd not in {"all", "fetch", "pages", "check", "workouts", "exercise"}:
        raise SystemExit("usage: habits.py [all|fetch|pages|check|workouts <merged.json>|exercise <export.json>]")
    if cmd == "exercise":
        if len(argv) < 3:
            raise SystemExit("usage: habits.py exercise <health_export_all.json>")
        write_exercise(Path(argv[2]))
        check()
        return
    if cmd == "workouts":
        if len(argv) < 3:
            raise SystemExit("usage: habits.py workouts <merged.json>")
        write_workouts(Path(argv[2]))
        check()
        return
    cfg = load_json(TRACKERS)
    today = chicago_today()
    if cmd in {"all", "fetch"}:
        try:
            write_cursor(cfg, today)
        except SystemExit:
            raise
        except Exception as err:  # noqa: BLE001 — keep the seed and still publish
            print(f"habits: fetch failed ({err})", file=sys.stderr)
            if not CURSOR.exists():
                raise SystemExit(1) from err
            if cmd == "fetch":
                raise SystemExit(1) from err
    if cmd in {"all", "pages"}:
        check_index(cfg)
        publish_counts()
        refresh_rides()
        write_redirects()
    if cmd == "check" or cmd == "all":
        check()


if __name__ == "__main__":
    main(sys.argv)
