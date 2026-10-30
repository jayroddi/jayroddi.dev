"""Goodreads export -> site/books/books.json + site/books/covers/. Usage: books_import.py site/books/books.json [goodreads.csv]
Books whose hashed id is in scripts/books_hidden.json are dropped before anything is fetched or written. Undated books (no Date Read) sort after dated ones."""
import csv,json,re,os,sys,urllib.request,urllib.parse,collections,concurrent.futures as cf
from PIL import Image
SRC=sys.argv[2] if len(sys.argv)>2 else '/workspace/mideeyah-imports/goodreads.csv'; OUT=sys.argv[1]; COV=os.path.join(os.path.dirname(OUT),'covers'); os.makedirs(COV,exist_ok=True)
UA={'User-Agent':'jayroddi.dev books (hi@jayroddi.lol)'}
def get(u,raw=False):
    try:
        r=urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=25); b=r.read()
        return b if raw else json.loads(b)
    except Exception: return None
def clean(t): return re.sub(r'\s*\(.*?#\d+.*?\)\s*$','',t).strip()
def short(t): return re.split(r'[:(]',t)[0].strip()
def ok_img(b): 
    if not b or len(b)<2000: return False
    try:
        from io import BytesIO; im=Image.open(BytesIO(b)); return im.width>=60 and im.height>=80
    except Exception: return False
OVR={k:v for k,v in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'books_cover_overrides.json'))).items() if not k.startswith('_')}
def one(r):
    isbn=(r['ISBN13'] or '').strip('="') or (r['ISBN'] or '').strip('="'); t,a=r['Title'],r['Author']
    src=None; img=None; olkey=None
    if isbn:
        img=get(f'https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg?default=false',True)
        if ok_img(img): src='openlibrary-isbn'
        else: img=None
        j=get(f'https://openlibrary.org/isbn/{isbn}.json')
        if j: olkey=(j.get('works') or [{}])[0].get('key') or j.get('key')
    if not img or not olkey:
        q=urllib.parse.urlencode({'title':short(t),'author':' '.join(a.split()),'limit':5,'fields':'key,cover_i,title'})
        j=get('https://openlibrary.org/search.json?'+q) or {}
        docs=j.get('docs') or []
        if docs and not olkey: olkey=docs[0]['key']
        if not img:
            for d in docs:
                if d.get('cover_i'):
                    b=get(f"https://covers.openlibrary.org/b/id/{d['cover_i']}-L.jpg?default=false",True)
                    if ok_img(b): img,src=b,'openlibrary-search'; break
    if not img:
        q='isbn:'+isbn if isbn else f'intitle:{short(t)} inauthor:{a}'
        j=get('https://www.googleapis.com/books/v1/volumes?'+urllib.parse.urlencode({'q':q,'maxResults':3})) or {}
        for it in j.get('items') or []:
            u=((it.get('volumeInfo') or {}).get('imageLinks') or {}).get('thumbnail')
            if u:
                b=get(u.replace('http://','https://').replace('&edge=curl',''),True)
                if ok_img(b): img,src=b,'google-books'; break
    cover=None
    oext=next((e for e in ('.webp','.jpg') if os.path.exists(os.path.join(COV,r['Book Id']+e))), None)
    if r['Book Id'] in OVR and oext: img=None; cover='/books/covers/'+r['Book Id']+oext; src='manual: '+OVR[r['Book Id']]
    if img:
        from io import BytesIO
        im=Image.open(BytesIO(img)).convert('RGB'); im.thumbnail((400,600)); fn=f"{r['Book Id']}.jpg"; im.save(os.path.join(COV,fn),quality=82,optimize=True,progressive=True); cover='/books/covers/'+fn
    url=f'https://openlibrary.org{olkey}' if olkey else f"https://www.goodreads.com/book/show/{r['Book Id']}"
    return {'id':r['Book Id'],'title':t,'author':' '.join(a.split()),'isbn':isbn or None,'read':r['Date Read'].replace('/','-') or None,'added':r['Date Added'].replace('/','-'),'pages':int(r['Number of Pages']) if r['Number of Pages'].isdigit() else None,'year':r['Original Publication Year'] or r['Year Published'] or None,'read_count':int(r['Read Count'] or 1),'cover':cover,'cover_source':src,'url':url}
import hashlib
HIDDEN=set(json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'books_hidden.json')))['sha256'])
hid=lambda i: hashlib.sha256(('jayroddi.lol/books:'+i).encode()).hexdigest() in HIDDEN
R=[r for r in csv.DictReader(open(SRC,encoding='utf-8-sig')) if not hid(r['Book Id'])]
with cf.ThreadPoolExecutor(6) as ex: B=list(ex.map(one,R))
B.sort(key=lambda b:(b['read'] is not None,b['read'] or '',b['added'] or ''),reverse=True)
json.dump({'source':'goodreads export','count':len(B),'books':B},open(OUT,'w'),indent=1,ensure_ascii=False)
print(len(B),collections.Counter(b['cover_source'] for b in B))
for b in B:
    if not b['cover']: print('NO COVER',b['title'],'/',b['author'])
