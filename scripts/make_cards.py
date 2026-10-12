#!/usr/bin/env python3
"""scripts/make_cards.py: jaytha.ninja's share cards (1200x630 png, from capri's templates in scripts/cards/, v1.61) and their nightly flip.

the cards show what the pages show: /og/home.png = the intro + "// yyyy.mm.dd", /og/song.png, /og/quote.png, /og/snap.png = the newest entry dated
that day or earlier (same rule as the pages). every og:image / twitter:image pointing at them carries ?d=<the cards' date> so social apps refetch.
the entries ship at the 11:31pm drop but stay hidden until 12:00am CT (v1.59), so the cards do the same: they're rendered at the drop into og-next/
(outside site/, so never deployed) and flipped into site/og/ (+ the ?d= values) by the pages deploy once that date has started in chicago.

  python3 scripts/make_cards.py stage --date YYYY-MM-DD   the 11:31pm drop, after the entries are in. --date = the drop's date (tomorrow). first
                                                          promotes anything already due (so the repo matches what's live), then renders that
                                                          date's cards into og-next/ (+ og-next/date.txt). needs chrome + playwright-core
  python3 scripts/make_cards.py flip [--today YYYY-MM-DD] the deploy (.github/workflows/pages.yml, on every push + just after 12:00am CT). if
                                                          og-next/ holds cards dated today (CT) or earlier that aren't live yet, copies them into
                                                          site/og/ and rewrites ?d=. stdlib only, never fails the deploy, a no-op otherwise
  python3 scripts/make_cards.py now --date YYYY-MM-DD [--generic]
                                                          by hand: render straight into site/og/ + rewrite ?d= (--generic also re-renders
                                                          site/og-image.png + og-image-v128.png, the static lyric card)
  python3 scripts/make_cards.py stamp --date YYYY-MM-DD   only rewrite the ?d= values

--repo (default: this checkout) is the site repo. the song's album art comes from spotify's public oembed (no key); if that fails the song card keeps
its last png. rendering needs node + playwright-core (NODE_PATH, default /usr/local/lib/node_modules) and chrome (CHROME, default /usr/bin/google-chrome)
"""
import argparse, datetime, html, json, os, pathlib, re, shutil, subprocess, sys, tempfile, urllib.parse, urllib.request, zoneinfo

HERE = pathlib.Path(__file__).resolve().parent
TPL = HERE/'cards'
CT = zoneinfo.ZoneInfo('America/Chicago')
NAMES = ('home', 'snap', 'quote', 'song')
NEXT = 'og-next'
INTRO = [('the internet was a place to make ', 'genuine connections with other humans'), ('somewhere along the way, ', 'we messed up'), ('my team and i hope to ', 'run it back')]
LYRICS = ("don't tell your dreams to everybody around", 'some people smile, but wanna see you down', "keep it quiet, don't make a sound", 'let your success be what shakes the ground')
CARD_URL = re.compile(r'(https://jaytha\.ninja/og/(?:home|snap|quote|song)\.png)(?:\?d=\d{4}-\d{2}-\d{2})?(?=")')
LIVE = re.compile(r'https://jaytha\.ninja/og/home\.png\?d=(\d{4}-\d{2}-\d{2})"')
e = lambda s: html.escape(s, quote=False)

def qbr(t):   # word for word; a short multi-sentence quote breaks after each sentence (capri's layout), anything else just wraps
    parts = re.split(r'(?<=[.!?])\s+', t.strip())
    return '<br>'.join(e(p) for p in parts) if 1 < len(parts) <= 3 and all(len(p) <= 34 for p in parts) else e(t)

def newest(rows, day, ok=lambda r: True):
    rows = [r for r in rows if isinstance(r, dict) and re.fullmatch(r'\d{4}-\d{2}-\d{2}', r.get('date', '')) and r['date'] <= day and ok(r)]
    return max(rows, key=lambda r: r['date']) if rows else None

def fill(name, date, main_css, main_html, site_label):
    s = (TPL/f'card-{name}.html').read_text(encoding='utf-8')
    # the per-card css is the last rule block after ".rk svg{...}"; swap it for ours
    a = s.index('.rk svg{width:64px;height:64px;display:block}') + len('.rk svg{width:64px;height:64px;display:block}')
    s = s[:a] + '\n' + main_css + s[s.index('</style>'):]
    s = re.sub(r'<div class="top"><span>[^<]*</span><span class="site">[^<]*</span></div>',
               f'<div class="top"><span>{e(date)}</span><span class="site">{e(site_label)}</span></div>', s, count=1)
    i, j = s.index('<div class="main">'), s.index('<div class="foot">')
    s = s[:i] + f'<div class="main">{main_html}</div>' + s[j:]
    # shrink anything marked data-fit until the main block clears the footer and nothing overflows (long quotes / lyrics / captions)
    fit = """<script>document.fonts.ready.then(async()=>{await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
const m=document.querySelector('.main'),f=document.querySelector('.foot'),els=[...document.querySelectorAll('[data-fit]')];
const bad=()=>els.some(x=>x.getBoundingClientRect().bottom>f.getBoundingClientRect().top-22||x.scrollWidth>x.clientWidth+1);
for(let n=0;n<60&&bad();n++)els.forEach(x=>{x.style.fontSize=(parseFloat(getComputedStyle(x).fontSize)*.96)+'px'});window.__fit=bad()?'overflow':'ok'})</script>"""
    return s.replace('</body>', fit + '</body>')

def cards(repo, day, generic):
    site = repo/'site'
    d8 = day.replace('-', '.')
    out = {}
    out['home'] = fill('home', '// ' + d8, '.main{margin-top:68px;font-size:34px;line-height:1.35}.main p{margin-bottom:22px}',
                       ''.join(f'<p data-fit>{e(a)}<span class="t">{e(b)}</span></p>' for a, b in INTRO), 'jaytha.ninja')
    snaps = json.loads((site/'snap-of-the-day/snaps.json').read_text(encoding='utf-8'))
    sn = newest(snaps, day, lambda r: r.get('src'))
    if sn:
        src = site/sn['src'].split('?')[0].lstrip('/')
        out['snap'] = fill('snap', '// ' + sn['date'].replace('-', '.'),
            '.main{margin-top:40px;display:flex;gap:48px;align-items:center}.txt{flex:1;min-width:0}.lab{font-size:34px;margin-bottom:26px}.cap{font-size:25px;line-height:1.45;color:#c9c3be}.main img{flex:none;width:540px;height:360px;object-fit:cover;border-radius:16px;box-shadow:0 0 40px rgba(26,173,179,.25),0 0 0 1px rgba(26,173,179,.35)}',
            f'<div class="txt"><p class="t lab">📸 snap of the day</p><p class="cap" data-fit>{e(sn.get("alt", "").lower())}</p></div><img src="{src.as_uri()}">', 'jaytha.ninja/snap-of-the-day')
    quotes = json.loads((site/'quote-of-the-day/quotes.json').read_text(encoding='utf-8'))
    q = newest(quotes, day, lambda r: r.get('quote') and r.get('author'))
    if q:   # word for word, lowercased like the page (css text-transform there)
        out['quote'] = fill('quote', '// ' + q['date'].replace('-', '.'),
            '.main{margin-top:64px}.lab{font-size:28px;margin-bottom:30px}.q{font-size:50px;line-height:1.25;color:#fff}.by{margin-top:26px;font-size:24px}',
            f'<p class="t lab">💭 today\'s quote</p><p class="q" data-fit>{qbr(q["quote"].lower())}</p><p class="g by" data-fit>{e(q["author"].lower())}</p>', 'jaytha.ninja/quote-of-the-day')
    songs = json.loads((site/'song-of-the-day/songs.json').read_text(encoding='utf-8'))
    so = newest(songs, day, lambda r: r.get('id') and r.get('track'))
    art = None
    if so:
        try:
            u = 'https://open.spotify.com/oembed?url=' + urllib.parse.quote(f'https://open.spotify.com/track/{so["id"]}', safe='')
            meta = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'jaytha.ninja cards'}), timeout=20))
            art = urllib.request.urlopen(meta['thumbnail_url'], timeout=20).read()
        except Exception as ex:
            print('song art: oembed failed, keeping the old song card:', ex, file=sys.stderr)
    if so and art:
        lyric = '\n'.join([l for l in (so.get('lyric') or '').lower().split('\n') if l.strip()][:2])   # the first 2 lines, never a blank verse-break line (v1.68)
        track = re.sub(r'\s*\((from|feat\.?|with)\b[^)]*\)\s*$', '', so['track'], flags=re.I)
        artist = so['artist'].split(',')[0].strip()
        ly = '<br>'.join(e(x) for x in lyric.split('\n')) if lyric else ''
        out['song'] = fill('song', '// ' + so['date'].replace('-', '.'),
            '.main{margin-top:44px;display:flex;gap:48px;align-items:center}.main img{flex:none;width:330px;height:330px;border-radius:14px;box-shadow:0 0 40px rgba(26,173,179,.25),0 0 0 1px rgba(26,173,179,.35)}.txt{flex:1;min-width:0}.lab{font-size:28px;margin-bottom:24px}.ly{font-size:31px;line-height:1.4;color:#fff}.by{margin-top:22px;font-size:23px}',
            f'<div class="txt"><p class="t lab">🎧 song of the day</p>' + (f'<p class="ly" data-fit>{ly}</p>' if ly else '') +
            f'<p class="g by" data-fit>{e(track.lower())} // {e(artist.lower())}</p></div><img src="__ART__">', 'jaytha.ninja/song-of-the-day')
    if generic:
        out['site'] = fill('home', '// because being here matters',
                           '.main{margin-top:72px;font-size:36px;line-height:1.45}.main p{margin:0 0 18px;white-space:nowrap}.main p:last-child{margin-bottom:0}',
                           ''.join(f'<p data-fit>{e(line)}</p>' for line in LYRICS), 'jaytha.ninja')
    return out, art

SHOT = r"""
const { chromium } = require('playwright-core'); const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch({executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--allow-file-access-from-files']});
  const p = await (await b.newContext({viewport: {width: 1200, height: 630}, deviceScaleFactor: 1})).newPage();
  for (const [inp, out] of jobs){
    await p.goto('file://' + inp); await p.waitForFunction(() => window.__fit, null, {timeout: 20000});
    const fit = await p.evaluate(() => window.__fit); await p.screenshot({path: out});
    console.log(out, fit);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
"""

def ctday(): return datetime.datetime.now(CT).date().isoformat()
def isday(s): return bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', s or '')) and bool(datetime.date.fromisoformat(s))

def render(repo, day, generic, dest):
    """render day's cards; dest(name) -> the path each png goes to. returns the names written"""
    out, art = cards(repo, day, generic)
    tmp = pathlib.Path(tempfile.mkdtemp(prefix='cards-'))
    try:
        if art: (tmp/'art.jpg').write_bytes(art)
        jobs = []
        for k, s in out.items():
            f = tmp/f'{k}.html'; f.write_text(s.replace('__ART__', (tmp/'art.jpg').as_uri()), encoding='utf-8')
            jobs.append([str(f), str(tmp/f'{k}.png')])
        (tmp/'jobs.json').write_text(json.dumps(jobs)); (tmp/'shot.js').write_text(SHOT)
        env = dict(os.environ, NODE_PATH=os.environ.get('NODE_PATH', '/usr/local/lib/node_modules'))
        r = subprocess.run(['node', str(tmp/'shot.js'), str(tmp/'jobs.json')], env=env, capture_output=True, text=True)
        print(r.stdout, end='')
        if r.returncode: sys.exit('render failed: ' + r.stderr)
        if any(l.split()[-1] != 'ok' for l in r.stdout.split('\n') if l.strip()): print('warning: a card still overflows after shrinking, check it', file=sys.stderr)
        for k in out:
            for p in dest(k):
                p.parent.mkdir(parents=True, exist_ok=True); shutil.copyfile(tmp/f'{k}.png', p)
        return list(out)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def stamp(repo, day):
    """point every /og/{home,snap,quote,song}.png url in site/**/*.html at ?d=day. returns the files changed"""
    changed = []
    for f in sorted((repo/'site').rglob('*.html')):
        s = f.read_text(encoding='utf-8'); t = CARD_URL.sub(lambda m: m.group(1) + '?d=' + day, s)
        if t != s: f.write_text(t, encoding='utf-8'); changed.append(str(f.relative_to(repo)))
    return changed

def live(repo):
    m = LIVE.search((repo/'site/index.html').read_text(encoding='utf-8'))
    return m.group(1) if m else ''

def promote(repo, today):
    """og-next/ -> site/og/ + ?d=, only once its date has started (CT) and only if it's newer than what's live"""
    nxt = repo/NEXT
    d = (nxt/'date.txt').read_text().strip() if (nxt/'date.txt').exists() else ''
    if not isday(d): print('flip: nothing staged'); return False
    cur = live(repo)
    if d > today: print(f'flip: cards for {d} are staged, they flip at 12:00am CT on {d} (live: {cur or "?"})'); return False
    if cur and d <= cur: print(f'flip: cards for {d} are already live'); return False
    moved = [k for k in NAMES if (nxt/f'{k}.png').exists()]
    for k in moved: shutil.copyfile(nxt/f'{k}.png', repo/f'site/og/{k}.png')
    files = stamp(repo, d)
    print(f'flip: cards for {d} are live ({", ".join(moved) or "no new pngs"}; ?d={d} in {len(files)} files)')
    return True

def main():
    ap = argparse.ArgumentParser(description='share cards: stage at the 11:31pm drop, flip at 12:00am CT')
    ap.add_argument('cmd', choices=['stage', 'flip', 'now', 'stamp'])
    ap.add_argument('--repo', default=str(HERE.parent)); ap.add_argument('--date'); ap.add_argument('--today'); ap.add_argument('--generic', action='store_true')
    a = ap.parse_args(); repo = pathlib.Path(a.repo).resolve()
    today = a.today or ctday()
    assert isday(today), today
    if a.cmd == 'flip':
        try: promote(repo, today)
        except Exception as ex: print('flip: skipped, the cards stay as they are:', repr(ex), file=sys.stderr)   # never block the deploy
        return
    if not isday(a.date): sys.exit(f'{a.cmd} needs --date YYYY-MM-DD (the cards\' date, america/chicago)')
    if a.cmd == 'stamp':
        print('?d=' + a.date, 'in', ', '.join(stamp(repo, a.date)) or 'nothing (already set)'); return
    if a.cmd == 'stage':
        promote(repo, today)   # yesterday's staged cards are live by now (the midnight deploy), so the repo catches up
        nxt = repo/NEXT
        if nxt.exists(): shutil.rmtree(nxt)
        names = render(repo, a.date, False, lambda k: [nxt/f'{k}.png'])
        (nxt/'date.txt').write_text(a.date + '\n')
        print(f'staged cards for {a.date} in {NEXT}/ ({", ".join(names)}); they flip at 12:00am CT on {a.date}')
        if a.date <= today: print('note: that date has already started in chicago, so the next deploy flips them right away')
        return
    # now
    def dest(k):
        if k == 'site': return [repo/'site/og-image.png', repo/'site/og-image-v128.png']   # v128 = the pre-v1.61 url, so an old cached link gets the new card too
        return [repo/f'site/og/{k}.png']
    names = render(repo, a.date, a.generic, dest)
    files = stamp(repo, a.date)
    print(f'cards for {a.date} -> site/og ({", ".join(names)}); ?d={a.date} in {len(files)} files')

if __name__ == '__main__':
    main()
