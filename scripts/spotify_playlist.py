#!/usr/bin/env python3
"""Fetch the /music playlist through the official Spotify Web API (client credentials) and write site/music/playlist.json.
Writes only when the data changed. Env: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN.
Spotify's current API only returns playlist items (GET /playlists/{id}/items) with USER auth: client credentials get
403 on /tracks and 401 on /items. So this needs a one-time user login (authorization code flow) whose refresh token is
stored as SPOTIFY_REFRESH_TOKEN. Without it the script exits 0 and leaves playlist.json untouched. Usage: spotify_playlist.py [out]"""
import base64, json, os, sys, urllib.request, urllib.parse, datetime
PL = "2gnGKUyfcjB5aecShkH33N"
OUT = sys.argv[1] if len(sys.argv) > 1 else "site/music/playlist.json"

def req(url, data=None, headers=None):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers or {}), timeout=30))

def token():
    rt = os.environ.get("SPOTIFY_REFRESH_TOKEN")
    if not rt:
        print("music: no SPOTIFY_REFRESH_TOKEN (playlist items need user auth); playlist.json left as is"); sys.exit(0)
    auth = base64.b64encode(f"{os.environ['SPOTIFY_CLIENT_ID']}:{os.environ['SPOTIFY_CLIENT_SECRET']}".encode()).decode()
    return req("https://accounts.spotify.com/api/token", urllib.parse.urlencode({"grant_type": "refresh_token", "refresh_token": rt}).encode(),
               {"Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded"})["access_token"]

def cover(images):
    if not images: return None
    return min(images, key=lambda i: abs((i.get("width") or 300) - 300))["url"]   # ~300px

def main():
    H = {"Authorization": "Bearer " + token()}
    meta = req(f"https://api.spotify.com/v1/playlists/{PL}", headers=H)
    page = meta.get("tracks") or meta.get("items") or {}          # older shape: tracks{items,next,total}; newer: items
    if isinstance(page, list): page = {"items": page, "next": None}
    items, nxt = list(page.get("items") or []), page.get("next")
    if not items and not nxt:                                       # neither embedded: page the endpoint directly
        nxt = f"https://api.spotify.com/v1/playlists/{PL}/items?limit=50"
    while nxt:
        p = req(nxt, headers=H); items += p.get("items") or []; nxt = p.get("next")
    tracks = []
    for it in items:
        t = it.get("track") or it.get("item")
        if not t or t.get("type", "track") != "track" or not t.get("id"): continue   # skips local files / episodes / removed
        al = t.get("album") or {}
        tracks.append({"n": len(tracks) + 1, "name": t["name"], "artists": ", ".join(a["name"] for a in t.get("artists", [])),
                       "album_id": al.get("id"), "album": al.get("name"), "cover": cover(al.get("images")),
                       "url": (t.get("external_urls") or {}).get("spotify") or f"https://open.spotify.com/track/{t['id']}",
                       "explicit": t.get("explicit"), "duration_ms": t.get("duration_ms")})
    body = {"playlist": {"id": PL, "name": meta.get("name"), "owner": (meta.get("owner") or {}).get("display_name"),
                         "url": f"https://open.spotify.com/playlist/{PL}", "cover": cover(meta.get("images"))},
            "source": "spotify web api (user refresh token)", "count": len(tracks),
            "albums": len({t["album_id"] for t in tracks}), "skipped": len(items) - len(tracks), "tracks": tracks}
    try: old = json.load(open(OUT, encoding="utf-8"))
    except Exception: old = {}
    if {k: v for k, v in old.items() if k != "fetched"} == body:
        print(f"music: unchanged ({len(tracks)} tracks)"); return
    body["fetched"] = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f: json.dump(body, f, indent=1, ensure_ascii=False); f.write("\n")
    print(f"music: wrote {len(tracks)} tracks, {body['albums']} albums, skipped {body['skipped']}")

if __name__ == "__main__":
    main()
