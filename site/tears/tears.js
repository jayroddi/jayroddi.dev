/* Newest URL first. YouTube and X become embeds. Anything else is a centered link. */
const list = document.getElementById('tears');

function youtubeId(url) {
  let parsed;
  try { parsed = new URL(url); } catch (e) { return ''; }
  const host = parsed.hostname.replace(/^(www|m)\./, '');
  if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || '';
  if (host !== 'youtube.com' && host !== 'youtube-nocookie.com') return '';
  if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') return parts[1] || '';
  return '';
}

function tweetId(url) {
  let parsed;
  try { parsed = new URL(url); } catch (e) { return ''; }
  const host = parsed.hostname.replace(/^www\./, '');
  if (host !== 'x.com' && host !== 'twitter.com' && host !== 'mobile.twitter.com') return '';
  const parts = parsed.pathname.split('/').filter(Boolean);
  const at = parts.indexOf('status');
  const id = at >= 0 ? parts[at + 1] : '';
  return /^\d+$/.test(id || '') ? id : '';
}

function frame(src, title, kind) {
  const wrap = document.createElement('div');
  wrap.className = kind === 'x' ? 'tear x' : 'tear video';
  const iframe = document.createElement('iframe');
  iframe.src = src;
  iframe.title = title;
  iframe.loading = 'lazy';
  iframe.setAttribute('allowfullscreen', '');
  if (kind === 'video') iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  wrap.append(iframe);
  return wrap;
}

function item(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  const video = youtubeId(url);
  if (/^[\w-]{6,}$/.test(video)) {
    return frame('https://www.youtube-nocookie.com/embed/' + encodeURIComponent(video), 'YouTube video', 'video');
  }
  const tweet = tweetId(url);
  if (tweet) return frame('https://platform.twitter.com/embed/Tweet.html?id=' + tweet + '&theme=dark&dnt=true', 'X post', 'x');
  const link = document.createElement('a');
  link.href = url;
  link.textContent = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const wrap = document.createElement('div');
  wrap.className = 'tear link';
  wrap.append(link);
  return wrap;
}

fetch('/tears/items.json', { cache: 'no-cache' })
  .then((res) => res.ok ? res.json() : [])
  .then((rows) => {
    if (!list || !Array.isArray(rows)) return;
    const frag = document.createDocumentFragment();
    rows.forEach((url) => {
      const node = item(url);
      if (!node) return;
      const li = document.createElement('li');
      li.append(node);
      frag.append(li);
    });
    list.replaceChildren(frag);
  })
  .catch(() => {});
