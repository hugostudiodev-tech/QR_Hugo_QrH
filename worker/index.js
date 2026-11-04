import { parseParams, renderSvg, DOTS, EYES, FRAMES, LEVELS } from '../lib/index.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SPEC = {
  endpoint: 'GET /api/qr',
  returns: 'image/svg+xml',
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
    eyes: EYES.join(' | '),
    frame: FRAMES.join(' | ') + ' — khung bao quanh mã',
    caption: 'Chữ dưới khung (tối đa 40 ký tự), mặc định QUÉT MÃ NÀY',
    frameColor: '#RRGGBB màu khung',
    download: '1 → trình duyệt tải file thay vì hiển thị',
  },
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api')) return new Response(null, { status: 204, headers: CORS });
    if (request.method === 'GET' && url.pathname === '/api') return Response.json(SPEC, { headers: CORS });
    if (request.method !== 'GET' || url.pathname !== '/api/qr') {
      return Response.json({ error: 'Không tìm thấy API. Xem GET /api để biết cách dùng.' }, { status: 404, headers: CORS });
    }
    try {
      const svg = renderSvg(parseParams(url.searchParams));
      return new Response(svg, {
        headers: {
          ...CORS,
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'Content-Disposition': url.searchParams.get('download') === '1' ? 'attachment; filename="qr-hugo.svg"' : 'inline',
        },
      });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400, headers: CORS });
    }
  },
};
