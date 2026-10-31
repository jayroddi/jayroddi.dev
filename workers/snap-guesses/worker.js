/* Unused guess log for jayroddi.dev. The snaps page no longer posts here.
   POST {guess} still stores a row if something calls the worker. The worker adds the time, the user agent,
   and Cloudflare's country / region / city. It stores that in KV. The page
   never receives a token. GET with the READ_TOKEN secret (Authorization:
   Bearer, or ?token=) renders the log. A wrong or missing token is a 404.

   Free tier: Workers plus KV. KV's free plan is about 1,000 writes a day.
   Each stored guess is two writes (the row and the rate-limit counter).
   An address is capped at 20 guesses an hour and 80 a day. Past that the
   worker still answers 200 and does not store the row, so the page can keep
   saying nope. Jay reads https://<worker>/?token=<READ_TOKEN> or the GUESSES
   namespace in the Cloudflare dashboard. Share that URL with xavier; it is
   the read credential. */

const HOUR_CAP = 20;
const DAY_CAP = 80;
const MAX_GUESS = 200;

function cors() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'cache-control': 'no-store'
  };
}

function nope() {
  return new Response(JSON.stringify({ok: false}), {
    status: 200,
    headers: Object.assign({'content-type': 'application/json; charset=utf-8'}, cors())
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

async function ipKey(request) {
  const ip = request.headers.get('cf-connecting-ip') || '0';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('snap-guess|' + ip));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function underCap(env, request) {
  const key = 'rl:' + await ipKey(request);
  const now = Date.now();
  const hour = Math.floor(now / 3600000);
  const day = Math.floor(now / 86400000);
  let bag = {hour: hour, hourN: 0, day: day, dayN: 0};
  const raw = await env.GUESSES.get(key);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object') bag = saved;
    } catch (e) { /* a broken counter starts over */ }
  }
  if (bag.hour !== hour) {
    bag.hour = hour;
    bag.hourN = 0;
  }
  if (bag.day !== day) {
    bag.day = day;
    bag.dayN = 0;
  }
  if (bag.hourN >= HOUR_CAP || bag.dayN >= DAY_CAP) return false;
  bag.hourN += 1;
  bag.dayN += 1;
  await env.GUESSES.put(key, JSON.stringify(bag), {expirationTtl: 60 * 60 * 48});
  return true;
}

function authorized(request, env, url) {
  const token = env.READ_TOKEN || '';
  if (!token) return false;
  const header = request.headers.get('authorization') || '';
  return header === 'Bearer ' + token || url.searchParams.get('token') === token;
}

async function readAll(env) {
  const rows = [];
  let cursor;
  do {
    const page = await env.GUESSES.list({prefix: 'g:', cursor: cursor, limit: 1000});
    const values = await Promise.all(page.keys.map((key) => env.GUESSES.get(key.name)));
    values.forEach((value) => {
      if (!value) return;
      try { rows.push(JSON.parse(value)); } catch (e) { /* skip a bad row */ }
    });
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return rows;
}

function chicago(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso || '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
}

function where(row) {
  return [row.city, row.region, row.country].filter(Boolean).join(', ');
}

function htmlPage(rows) {
  const body = rows.map((row) => (
    '<tr><td>' + escapeHtml(chicago(row.at)) + '</td><td>' + escapeHtml(row.guess || '') +
    '</td><td>' + escapeHtml(where(row)) + '</td><td>' + escapeHtml(row.ua || '') + '</td></tr>'
  )).join('');
  return '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>snap guesses</title>' +
    '<style>body{margin:24px;background:#000;color:#f6efe9;font:13px/1.45 ui-monospace,monospace}' +
    'table{border-collapse:collapse;width:100%}td{vertical-align:top;padding:6px 10px 6px 0;border-bottom:1px solid #222}' +
    'td:nth-child(2){white-space:pre-wrap;word-break:break-word}</style>' +
    '<p>' + rows.length + ' guesses, newest first. times are America/Chicago.</p><table>' + body + '</table>';
}

async function read(request, env, url) {
  if (!authorized(request, env, url)) return new Response('not found', {status: 404, headers: {'cache-control': 'no-store'}});
  const rows = await readAll(env);
  if (url.searchParams.get('format') === 'json') {
    return new Response(JSON.stringify(rows), {
      headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}
    });
  }
  return new Response(htmlPage(rows), {
    headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}
  });
}

async function write(request, env) {
  let guess = '';
  try {
    const text = await request.text();
    if (text.length > 4000) return nope();
    const body = JSON.parse(text);
    if (!body || typeof body.guess !== 'string') return nope();
    guess = body.guess.replace(/\s+/g, ' ').trim().slice(0, MAX_GUESS);
  } catch (e) {
    return nope();
  }
  if (!guess) return nope();
  try {
    if (!(await underCap(env, request))) return nope();
    const cf = request.cf || {};
    const at = new Date().toISOString();
    const row = {
      guess: guess,
      at: at,
      ua: (request.headers.get('user-agent') || '').slice(0, 400),
      country: cf.country || '',
      region: cf.region || '',
      city: cf.city || ''
    };
    await env.GUESSES.put('g:' + at + ':' + crypto.randomUUID(), JSON.stringify(row));
  } catch (e) {
    console.log('snap guess store failed', e && e.message);
  }
  return nope();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors()});
    if (request.method === 'GET') return read(request, env, url);
    if (request.method === 'POST') return write(request, env);
    return new Response('nope', {status: 405, headers: cors()});
  }
};
