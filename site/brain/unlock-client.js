/* The static page cannot see a trusted address or send mail.
   Collection stays off. There is no endpoint, no key, and no request. */

export const UNLOCK_ENABLED = false;

export const DISCLOSURE = 'finishing this code can send one short unlock note. playing stays optional.';

export function disclosureNeeded(enabled) {
  return enabled === true;
}

export function sanitizeReferrer(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 2000) return null;
  let url;
  try { url = new URL(raw); } catch (e) { return null; }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  return { origin: url.origin, path: url.pathname.slice(0, 200) };
}

export function coarseClient(ua) {
  const text = String(ua || '');
  const device = /Mobile|Android|iPhone|iPad/i.test(text) ? 'mobile' : 'desktop';
  let browser = 'other';
  if (/Edg\//.test(text)) browser = 'edge';
  else if (/Firefox\//.test(text)) browser = 'firefox';
  else if (/Chrome\//.test(text)) browser = 'chrome';
  else if (/Safari\//.test(text)) browser = 'safari';
  return { browser, device };
}

function clip(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function clampInt(value, min, max) {
  const number = Math.round(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function requireId(value) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error('bad id');
  return value.toLowerCase();
}

/* Fields the browser may know. No address, no position, no raw user agent. */
export function buildClientPing(fields) {
  const viewport = fields && fields.viewport;
  return {
    sessionId: requireId(fields.sessionId),
    eventId: requireId(fields.eventId),
    durationMs: clampInt(fields.durationMs, 0, 24 * 60 * 60 * 1000),
    lang: clip(fields.lang, 35),
    tz: clip(fields.tz, 64),
    viewport: {
      w: clampInt(viewport && viewport.w, 0, 10000),
      h: clampInt(viewport && viewport.h, 0, 10000)
    },
    referrer: sanitizeReferrer(fields.referrer),
    page: clip(fields.page, 80),
    client: coarseClient(fields.ua)
  };
}

export async function maybeNotify(ping, opts) {
  const enabled = !!(opts && opts.enabled === true);
  if (!enabled) return { sent: false, reason: 'disabled' };
  if (!opts.transport) return { sent: false, reason: 'no-transport' };
  if (!opts.store || typeof opts.store.get !== 'function' || typeof opts.store.set !== 'function') {
    return { sent: false, reason: 'no-store' };
  }
  const key = opts.dedupeKey || 'brain-unlock-sent';
  if (opts.store.get(key)) return { sent: false, reason: 'deduped' };
  opts.store.set(key, '1');
  try {
    await opts.transport(ping);
  } catch (e) {
    return { sent: false, reason: 'transport' };
  }
  return { sent: true };
}
