// API keys belong to Hugo Studio accounts (app "QR Hugo" in the member portal): HS-<member code>-<secret>.
// This server never stores keys; it asks Hugo Studio, server-to-server, with the shared QR_SERVICE_SECRET:
//   POST /qr-key/connect  → user pasted the key on qr.hugowishpax.studio (marks the account connected)
//   POST /qr-key/use      → one QR request (checks key, counts against the 30-day quota)
//   POST /qr-key/log      → report a local rate-limit hit so it shows in the member's log

export const LIMITS = { perMinute: 30, perDay: 500, perPeriod: 3000, periodDays: 30 };
export const KEY_RE = /^HS-[A-Z0-9]{3,32}-[A-Za-z0-9_-]{32}$/;
const STUDIO = 'https://www.hugowishpax.studio/api';

export const bearer = (header) => {
  const m = /^Bearer\s+(\S+)$/i.exec(header || '');
  return m && KEY_RE.test(m[1]) ? m[1] : null;
};
export const codeOf = (key) => key.split('-')[1];

/** Calls Hugo Studio. Returns { status, body }; network trouble becomes 503. */
export async function studio(path, body, env) {
  if (!env.QR_SERVICE_SECRET) return { status: 503, body: { error: 'API chưa được cấu hình kết nối Hugo Studio.' } };
  try {
    const res = await fetch(`${env.HUGO_STUDIO_API || STUDIO}/qr-key/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Service-Secret': env.QR_SERVICE_SECRET },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  } catch {
    return { status: 503, body: { error: 'Không liên lạc được Hugo Studio để xác thực key. Thử lại sau.' } };
  }
}

// ponytail: per-minute/day counters live in memory per server instance (real ceiling = limit × instances);
// the 30-day quota is counted atomically in Hugo Studio's database. Move these to Redis if keys get abused.
const hits = new Map();
export function rateLimit(id, now = Date.now(), rules = [['minute', 60_000, LIMITS.perMinute], ['day', 86_400_000, LIMITS.perDay]]) {
  const res = {};
  for (const [name, ms, max] of rules) {
    const win = Math.floor(now / ms), k = `${id}:${name}:${win}`;
    const n = (hits.get(k) || 0) + 1;
    hits.set(k, n);
    res[name] = { max, left: Math.max(0, max - n), reset: (win + 1) * ms };
    if (n > max) return { ok: false, ...res, scope: name, retry: Math.ceil(((win + 1) * ms - now) / 1000) };
  }
  if (hits.size > 50_000) hits.clear(); // crude memory cap
  return { ok: true, ...res };
}

/** Per-IP shield in front of everything (flood + key guessing). Cheap: runs before any network call. */
export const IP_LIMITS = { perMinute: 120, failsPerMinute: 10 };
export const ipOf = (req) => (req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'unknown').trim();
export const ipGate = (ip, now) => rateLimit(`ip:${ip}`, now, [['minute', 60_000, IP_LIMITS.perMinute]]);
export const ipFail = (ip, now) => rateLimit(`fail:${ip}`, now, [['minute', 60_000, IP_LIMITS.failsPerMinute]]);
export const ipBlocked = (ip, now = Date.now()) => (hits.get(`fail:${ip}:minute:${Math.floor(now / 60_000)}`) || 0) >= IP_LIMITS.failsPerMinute;
