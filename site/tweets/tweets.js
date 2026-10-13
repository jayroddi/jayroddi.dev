/* v2.47: /tweets is a chat. newest exchange first from /tweets/tweets.json.
   one object: ts (ISO with an explicit offset) and messages.
   a message is author, optional text, optional photo (a file name in
   /tweets/photos/) plus w and h when that photo is present.
   the time is centered. jay is on the right: photo, then a "jay" label,
   then the text. everyone else is on the left with their name above the
   text. the photo alt is empty. the time reads "oct 13, 2026 · 9:18 am".
   a timestamp with no offset, and one still in the future, stays hidden. */
(() => {
  const host = document.querySelector('.copy');
  if (!host) return;
  const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

  function when(iso){
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const parts = {};
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h12'
    }).formatToParts(date).forEach(part => { parts[part.type] = part.value; });
    const month = MONTHS[Number(parts.month) - 1];
    const day = String(Number(parts.day));
    const hour = String(Number(parts.hour));
    const minute = parts.minute;
    const ap = String(parts.dayPeriod || '').toLowerCase();
    if (!month || !day || !parts.year || !hour || !minute || !ap) return '';
    return month + ' ' + day + ', ' + parts.year + ' · ' + hour + ':' + minute + ' ' + ap;
  }

  function photoURL(name){
    if (typeof name !== 'string') return '';
    const base = name.split('/').pop();
    if (!base || !/^[\w.-]+$/.test(base)) return '';
    return '/tweets/photos/' + base;
  }

  function side(author){
    return String(author || '').trim().toLowerCase() === 'jay' ? 'right' : 'left';
  }

  function messagesOf(entry){
    const raw = Array.isArray(entry.messages) ? entry.messages : (
      (typeof entry.text === 'string' && entry.text.trim()) || entry.photo
        ? [{author: 'jay', text: entry.text, photo: entry.photo, w: entry.w, h: entry.h}]
        : []
    );
    return raw.map(message => {
      if (!message || typeof message !== 'object') return null;
      const author = String(message.author || '').trim().toLowerCase();
      const text = typeof message.text === 'string' ? message.text.trim() : '';
      const photo = photoURL(message.photo);
      if (!author || (!text && !photo)) return null;
      return {author: author, text: text, photo: photo, w: Number(message.w) || 0, h: Number(message.h) || 0};
    }).filter(Boolean);
  }

  function paint(list){
    let ol = host.querySelector('ol.tweets');
    if (!ol){
      ol = document.createElement('ol');
      ol.className = 'tweets';
      host.appendChild(ol);
    }
    ol.setAttribute('aria-label', 'tweets');
    ol.replaceChildren();
    if (!list.length){
      const li = document.createElement('li');
      li.className = 'empty';
      const note = document.createElement('p');
      note.className = 'when';
      note.textContent = 'no tweets yet';
      li.appendChild(note);
      ol.appendChild(li);
      return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(entry => {
      const li = document.createElement('li');
      const whenP = document.createElement('p');
      whenP.className = 'when';
      const time = document.createElement('time');
      time.dateTime = entry.ts;
      time.textContent = entry.label;
      whenP.appendChild(time);
      li.appendChild(whenP);
      entry.messages.forEach(message => {
        const box = document.createElement('div');
        box.className = 'msg ' + side(message.author);
        if (message.photo){
          const img = document.createElement('img');
          img.className = 'pic';
          img.src = message.photo;
          img.alt = '';
          img.loading = 'lazy';
          img.decoding = 'async';
          if (message.w) img.width = message.w;
          if (message.h) img.height = message.h;
          img.addEventListener('error', () => img.remove());
          box.appendChild(img);
        }
        if (message.text){
          const who = document.createElement('p');
          who.className = 'who';
          who.textContent = message.author;
          const bubble = document.createElement('div');
          bubble.className = 'bubble';
          const text = document.createElement('p');
          text.className = 'txt';
          text.textContent = message.text;
          bubble.appendChild(text);
          box.append(who, bubble);
        }
        li.appendChild(box);
      });
      frag.appendChild(li);
    });
    ol.appendChild(frag);
  }

  fetch('/tweets/tweets.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : Promise.reject()).then(rows => {
    if (!Array.isArray(rows)) return;
    const now = Date.now();
    const offset = /(?:Z|[+-]\d{2}:?\d{2})$/;
    const list = rows.filter(entry => entry && typeof entry.ts === 'string' && offset.test(entry.ts.trim()))
      .map(entry => ({ts: entry.ts, messages: messagesOf(entry), at: Date.parse(entry.ts)}))
      .filter(entry => entry.messages.length && Number.isFinite(entry.at) && entry.at <= now)
      .sort((a, b) => b.at - a.at)
      .map(entry => ({...entry, label: when(entry.ts)}))
      .filter(entry => entry.label);
    paint(list);
  }).catch(() => paint([]));

  const canvas = document.getElementById('rain');
  if (canvas && window.JayRain){
    const T = [26, 173, 179], PALE_TEAL = [121, 205, 207], HEAD = [255, 255, 255], PALE_ORANGE = [255, 150, 121];
    const mob = () => document.documentElement.clientWidth < 760;
    const rain = JayRain.Rain(canvas, {
      fs: 16, fsMobile: 13, mono: '"JetBrains Mono", monospace', seed: 5, head: HEAD, headMix: .6,
      tint: T, paleTint: PALE_TEAL, paleOrange: PALE_ORANGE,
      palette: (x, w, r) => r < .84 ? T : PALE_TEAL,
      bands: (w, H) => [{y0: 0, y1: H, perCol: mob() ? 1.6 : 2.1, lenMin: 8, lenMax: 30, alpha: .56, stepMin: 60, stepMax: 170, colDensity: () => 1}],
      alphaAt: (x, y, R) => 1 - .45 * JayRain.smooth(R.H * .55, R.H, y),
      partSel: '.copy, .gallery, .foot', partPad: 50, partFloor: .25
    });
    JayRain.register(rain);
    document.fonts.ready.then(() => {
      rain.build();
      requestAnimationFrame(rain.frame);
    });
  }
})();
