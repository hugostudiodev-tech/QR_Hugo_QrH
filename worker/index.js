import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QRCodeSVG } from 'qrcode.react';

const HEX = /^#[0-9a-f]{6}$/i;
const LEVELS = new Set(['L', 'M', 'Q', 'H']);
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export function qrOptions(searchParams) {
  const raw = (searchParams.get('url') || '').trim();
  if (!raw || raw.length > 2048) throw new Error('URL phải có từ 1 đến 2048 ký tự.');

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL không hợp lệ.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('URL chỉ hỗ trợ http hoặc https.');

  const size = Math.min(1024, Math.max(128, Number.parseInt(searchParams.get('size'), 10) || 512));
  const foreground = HEX.test(searchParams.get('foreground') || '') ? searchParams.get('foreground') : '#111827';
  const background = HEX.test(searchParams.get('background') || '') ? searchParams.get('background') : '#ffffff';
  const requestedLevel = (searchParams.get('level') || '').toUpperCase();
  const level = LEVELS.has(requestedLevel) ? requestedLevel : 'M';
  return { url: url.href, size, foreground, background, level };
}

export function renderQrSvg(options) {
  return renderToStaticMarkup(React.createElement(QRCodeSVG, {
    value: options.url,
    size: options.size,
    level: options.level,
    fgColor: options.foreground,
    bgColor: options.background,
    marginSize: 2,
    title: `Mã QR cho ${options.url}`,
  }));
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: CORS });
    }
    if (request.method !== 'GET' || url.pathname !== '/api/qr') {
      return Response.json({ error: 'Không tìm thấy API.' }, { status: 404, headers: CORS });
    }

    try {
      const options = qrOptions(url.searchParams);
      const headers = new Headers({
        ...CORS,
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'Content-Disposition': url.searchParams.get('download') === '1' ? 'attachment; filename="qr-hugo.svg"' : 'inline',
      });
      return new Response(renderQrSvg(options), { headers });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400, headers: CORS });
    }
  },
};
