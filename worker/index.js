import { parseParams, renderSvg, DOTS, EYES, EYE_OUTER, EYE_INNER, FRAMES, LEVELS } from 'qr-hugo';
import { bearer, codeOf, studio, rateLimit, LIMITS, ipOf, ipGate, ipFail, ipBlocked } from './auth.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-Quota-Remaining, Retry-After',
};

const SPEC = {
  endpoint: 'GET /api/qr',
  returns: 'image/svg+xml',
  auth: 'Header "Authorization: Bearer <key>". Key lấy trong app QR Hugo của Hugo Studio (đăng nhập: https://www.hugowishpax.studio/login?redirect=/member/utilities/qrhugo). Chu kỳ 30 ngày, tự reset.',
  limits: LIMITS,
  docs: 'https://qr.hugowishpax.studio/#api',
  params: {
    data: 'Nội dung bất kỳ (1–2048 ký tự). Bắt buộc nếu không có url.',
    url: 'Link http/https (kiểm tra chặt). Dùng khi không có data.',
    size: '128–2048, mặc định 512 (px)',
    margin: '0–10 module, mặc định 2',
    level: LEVELS.join(' | ') + ', mặc định M',
    fg: '#RRGGBB màu chính, mặc định #0f0f15',
    fg2: '#RRGGBB màu thứ hai → bật gradient',
    gradient: 'linear | radial',
    bg: '#RRGGBB màu nền, mặc định #ffffff',
    transparent: '1 → nền trong suốt',
    eye: '#RRGGBB màu riêng cho 3 mắt định vị',
    dots: DOTS.join(' | '),
    eyes: EYES.join(' | ') + ' — kiểu mắt có sẵn',
    eyeOuter: EYE_OUTER.join(' | ') + ' — viền mắt (ghi đè eyes)',
    eyeInner: EYE_INNER.join(' | ') + ' — nhân mắt (ghi đè eyes)',
    eye2: '#RRGGBB màu riêng cho nhân mắt',
    frame: FRAMES.join(' | ') + ' — khung bao quanh mã',
    caption: 'Chữ dưới khung (tối đa 40 ký tự), mặc định QUÉT MÃ NÀY',
    frameColor: '#RRGGBB màu khung',
    download: '1 → trình duyệt tải file thay vì hiển thị',
  },
};

const loggedAt = new Map(); // key code → last time a local limit hit was reported to Hugo Studio

export default {
  async fetch(request, env = globalThis.process?.env || {}) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api')) return new Response(null, { status: 204, headers: CORS });
    const ip = ipOf(request);
    const deny = (status, error, extra = {}) => Response.json({ error }, { status, headers: { ...CORS, 'Cache-Control': 'no-store', ...extra } });
    const gate = ipGate(ip);
    if (!gate.ok || ipBlocked(ip)) return deny(429, 'Quá nhiều yêu cầu từ địa chỉ này. Thử lại sau.', { 'Retry-After': String(gate.retry || 60) });
    if (url.search.length > 6000) return deny(414, 'Query quá dài.');

    const isQr = url.pathname === '/api/qr';
    if (request.method !== 'GET' || !(isQr || url.pathname === '/api' || url.pathname === '/api/key')) return deny(404, 'Không tìm thấy API.');

    // Every endpoint, docs included, needs a key from the Hugo Studio app "QR Hugo".
    const key = bearer(request.headers.get('Authorization'));
    const fail = (r) => { if (r.status === 401) ipFail(ip); return deny(r.status, r.body.error || 'Lỗi xác thực.', r.status === 401 ? { 'WWW-Authenticate': 'Bearer' } : {}); };
    if (!key) return fail({ status: 401, body: { error: 'Thiếu hoặc sai API key. Gửi header "Authorization: Bearer <key>" — đăng nhập Hugo Studio, mở app QR Hugo để lấy key: https://www.hugowishpax.studio/login?redirect=/member/utilities/qrhugo' } });

    if (!isQr) {
      // Pasting the key on the website (or reading the spec) connects the account in Hugo Studio.
      const r = await studio('connect', { key }, env);
      if (r.status !== 200) return fail(r);
      return Response.json(url.pathname === '/api' ? { ...SPEC, account: r.body } : r.body, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
    }

    let svg;
    try { svg = renderSvg(parseParams(url.searchParams)); } catch (error) { return deny(400, error.message); } // bad input never costs a credit
    const code = codeOf(key);
    const rl = rateLimit(code);
    const rlHeaders = { 'X-RateLimit-Limit': `${LIMITS.perMinute}/min; ${LIMITS.perDay}/day; ${LIMITS.perPeriod}/${LIMITS.periodDays}d`, 'X-RateLimit-Remaining': String(Math.min(rl.minute.left, rl.day?.left ?? 0)) };
    if (!rl.ok) {
      const msg = `Vượt giới hạn ${rl.scope === 'minute' ? `${LIMITS.perMinute} lượt/phút` : `${LIMITS.perDay} lượt/ngày`}.`;
      if (Date.now() - (loggedAt.get(code) || 0) > 3_600_000) { loggedAt.set(code, Date.now()); studio('log', { key, msg: `Từ chối tạo QR: ${msg}` }, env); }
      return deny(429, `${msg} Thử lại sau ${rl.retry}s.`, { ...rlHeaders, 'Retry-After': String(rl.retry) });
    }
    const r = await studio('use', { key }, env);
    if (r.status !== 200) return fail(r);
    return new Response(svg, {
        headers: {
          ...CORS,
          ...rlHeaders,
          'X-Quota-Remaining': String(r.body.left),
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'private, no-store',
          'Content-Disposition': url.searchParams.get('download') === '1' ? 'attachment; filename="qr-hugo.svg"' : 'inline',
        },
      });
  },
};
