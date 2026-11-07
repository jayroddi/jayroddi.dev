/* Reference adapter. It is not mounted, and it does not send mail
   unless a host injects a mailer and turns email on. Do not print the
   record. The HTTP response is `body` only. `record` stays on the server. */

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LANG = /^[A-Za-z0-9-]{0,35}$/;
const TZ = /^[A-Za-z0-9_+\-/]{0,64}$/;
const BROWSERS = new Set(['chrome', 'safari', 'firefox', 'edge', 'other']);
const DEVICES = new Set(['mobile', 'desktop']);
const FIELDS = new Set(['sessionId', 'eventId', 'durationMs', 'lang', 'tz', 'viewport', 'referrer', 'page', 'client']);
const HOUR = 60 * 60 * 1000;

function fail(status) {
  return { status, body: { ok: false }, mailed: false, record: null };
}

function header(headers, name) {
  if (!headers) return '';
  if (headers[name] != null) return String(headers[name]);
  const found = Object.keys(headers).find((key) => key.toLowerCase() === name);
  return found ? String(headers[found]) : '';
}

function ipLike(value) {
  if (typeof value !== 'string') return null;
  const first = value.split(',')[0].trim();
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(first)) return first;
  if (first.includes(':') && /^[0-9a-fA-F:]+$/.test(first)) return first;
  return null;
}

export function clientIp(request, config) {
  const peer = typeof request.socketAddress === 'string' && request.socketAddress ? request.socketAddress : null;
  if (config.trustProxy === true && peer && Array.isArray(config.trustedProxies) && config.trustedProxies.includes(peer)) {
    const forwarded = ipLike(header(request.headers, 'x-forwarded-for'));
    if (forwarded) return forwarded;
  }
  return peer;
}

function cleanReferrer(value) {
  if (value == null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.some((key) => key !== 'origin' && key !== 'path')) return null;
  if (typeof value.origin !== 'string' || typeof value.path !== 'string') return null;
  let url;
  try { url = new URL(value.origin); } catch (e) { return null; }
  if (url.origin !== value.origin || (url.protocol !== 'http:' && url.protocol !== 'https:')) return null;
  if (!value.path.startsWith('/') || value.path.includes('?') || value.path.includes('#') || value.path.includes('..')) return null;
  if (value.path.length > 200) return null;
  return { origin: value.origin, path: value.path };
}

function cleanViewport(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.keys(value).some((key) => key !== 'w' && key !== 'h')) return null;
  if (!Number.isInteger(value.w) || !Number.isInteger(value.h)) return null;
  if (value.w < 0 || value.h < 0 || value.w > 10000 || value.h > 10000) return null;
  return { w: value.w, h: value.h };
}

function cleanClient(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (Object.keys(value).length !== 2) return null;
  if (!BROWSERS.has(value.browser) || !DEVICES.has(value.device)) return null;
  return { browser: value.browser, device: value.device };
}

function limited(key, rates, now, perHour) {
  const row = rates.get(key) || { start: now, count: 0 };
  if (now - row.start >= HOUR) {
    row.start = now;
    row.count = 0;
  }
  row.count += 1;
  rates.set(key, row);
  return row.count > perHour;
}

export async function handleUnlock(request, config, deps = {}) {
  if (!config || config.enabled !== true) return fail(404);
  if (!request || request.method !== 'POST') return fail(405);
  const origin = header(request.headers, 'origin');
  if (!Array.isArray(config.allowedOrigins) || !config.allowedOrigins.includes(origin)) return fail(403);
  const type = header(request.headers, 'content-type');
  if (!type.startsWith('application/json')) return fail(415);
  const max = config.maxBodyBytes || 2048;
  if (typeof request.rawLength === 'number' && request.rawLength > max) return fail(413);

  let body = request.body;
  if (typeof body === 'string') {
    if (body.length > max) return fail(413);
    try { body = JSON.parse(body); } catch (e) { return fail(400); }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return fail(400);
  if (Object.keys(body).some((key) => !FIELDS.has(key))) return fail(400);

  if (typeof body.sessionId !== 'string' || !ID.test(body.sessionId)) return fail(400);
  if (typeof body.eventId !== 'string' || !ID.test(body.eventId)) return fail(400);
  if (!Number.isInteger(body.durationMs) || body.durationMs < 0 || body.durationMs > 86400000) return fail(400);
  if (typeof body.lang !== 'string' || !LANG.test(body.lang)) return fail(400);
  if (typeof body.tz !== 'string' || !TZ.test(body.tz)) return fail(400);
  if (typeof body.page !== 'string' || body.page.length > 80 || !body.page.startsWith('/') || body.page.includes('?') || body.page.includes('#') || body.page.includes('..')) return fail(400);
  const viewport = cleanViewport(body.viewport);
  const client = cleanClient(body.client);
  const referrer = body.referrer == null ? null : cleanReferrer(body.referrer);
  if (!viewport || !client || (body.referrer != null && !referrer)) return fail(400);

  const now = typeof deps.now === 'number' ? deps.now : Date.now();
  const rates = deps.rates || new Map();
  const seen = deps.seen || new Set();
  const ip = clientIp(request, config);
  const rateKey = ip || body.sessionId.toLowerCase();
  if (limited(rateKey, rates, now, config.ratePerHour || 5)) return fail(429);
  if (seen.has(body.sessionId.toLowerCase())) {
    return { status: 202, body: { ok: true, deduped: true }, mailed: false, record: null };
  }

  const record = {
    t: new Date(now).toISOString(),
    sessionId: body.sessionId.toLowerCase(),
    eventId: body.eventId.toLowerCase(),
    durationMs: body.durationMs,
    lang: body.lang,
    tz: body.tz,
    viewport,
    referrer,
    page: body.page,
    client,
    ip,
    ipLocation: null,
    retainUntil: new Date(now + (config.retentionDays || 14) * 86400000).toISOString()
  };

  let mailed = false;
  if (config.email === true) {
    if (typeof deps.mailer !== 'function') return fail(503);
    try {
      await deps.mailer({ to: config.recipient, record });
    } catch (e) {
      return fail(502);
    }
    mailed = true;
  }
  seen.add(record.sessionId);
  return { status: 202, body: { ok: true, id: record.eventId }, mailed, record };
}
