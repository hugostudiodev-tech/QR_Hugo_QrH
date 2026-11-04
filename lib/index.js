// qr-hugo core: pure functions, no DOM — runs in browsers, Node, Workers, Deno, Bun. Used by the site, the API and the npm package.
import qrcode from 'qrcode-generator';

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

export const DOTS = ['square', 'rounded', 'fluid', 'dots', 'diamond', 'star', 'bars'];
export const EYES = ['square', 'rounded', 'circle', 'leaf', 'dot', 'soft'];
export const FRAMES = ['none', 'card', 'band', 'pill'];
export const LEVELS = ['L', 'M', 'Q', 'H'];
export const DEFAULTS = {
  data: 'https://qr.hugowishpax.studio', size: 512, margin: 2, level: 'M',
  fg: '#0f0f15', fg2: '', gradient: 'linear', bg: '#ffffff', eye: '', transparent: false,
  dots: 'square', eyes: 'square', logo: '', frame: 'none', caption: '', frameColor: '#0f0f15',
};

const HEX = /^#[0-9a-f]{6}$/i;
const LOGO = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[a-z0-9+/=]+$/i;
const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const clamp = (v, min, max, d) => (Number.isFinite(+v) && v !== '' && v != null ? Math.min(max, Math.max(min, Math.round(+v))) : d);

// Rounded rect path with per-corner radii [tl, tr, br, bl].
const rr = (x, y, w, h, [a, b, c, d]) =>
  `M${x + a} ${y}h${w - a - b}a${b} ${b} 0 0 1 ${b} ${b}v${h - b - c}a${c} ${c} 0 0 1 ${-c} ${c}h${-(w - c - d)}a${d} ${d} 0 0 1 ${-d} ${-d}v${-(h - d - a)}a${a} ${a} 0 0 1 ${a} ${-a}z`;
// Eye styles = [outer ring shape, pupil shape].
const EYE_PARTS = { dot: ['square', 'circle'], soft: ['rounded', 'circle'] };
const corners = (style, s) => ({ rounded: [s * 0.3, s * 0.3, s * 0.3, s * 0.3], circle: [s / 2, s / 2, s / 2, s / 2], leaf: [s * 0.45, 0, s * 0.45, 0] }[style] || [0, 0, 0, 0]);

/** Turn query params (or any `get(key)` source) into safe options. Throws Error with a Vietnamese message. */
export function parseParams(sp) {
  const get = (k) => sp.get(k);
  let data = get('data');
  const url = get('url');
  if (data == null && url != null) {
    let parsed;
    try { parsed = new URL(url.trim()); } catch { throw new Error('URL không hợp lệ.'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('URL chỉ hỗ trợ http hoặc https.');
    data = parsed.href;
  }
  if (!data || data.length > 2048) throw new Error('Tham số data (hoặc url) phải có từ 1 đến 2048 ký tự.');
  const pick = (k, list, d) => (list.includes(get(k)) ? get(k) : d);
  const color = (k, d, alias) => { const v = get(k) || (alias && get(alias)) || ''; return HEX.test(v) ? v : d; };
  return {
    data,
    size: clamp(get('size'), 128, 2048, DEFAULTS.size),
    margin: clamp(get('margin'), 0, 10, DEFAULTS.margin),
    level: LEVELS.includes((get('level') || '').toUpperCase()) ? get('level').toUpperCase() : DEFAULTS.level,
    fg: color('fg', DEFAULTS.fg, 'foreground'),
    fg2: color('fg2', ''),
    gradient: pick('gradient', ['linear', 'radial'], 'linear'),
    bg: color('bg', DEFAULTS.bg, 'background'),
    eye: color('eye', ''),
    transparent: get('transparent') === '1' || get('transparent') === 'true',
    dots: pick('dots', DOTS, 'square'),
    eyes: pick('eyes', EYES, 'square'),
    logo: '',
    frame: pick('frame', FRAMES, 'none'),
    caption: (get('caption') || '').slice(0, 40),
    frameColor: color('frameColor', DEFAULTS.frameColor),
  };
}

/** Render options to an SVG string. `id` keeps gradient ids unique when several QRs share a page. */
export function renderSvg(o, id = 'q') {
  const qr = qrcode(0, o.logo ? 'H' : o.level);
  qr.addData(o.data, 'Byte');
  try { qr.make(); } catch { throw new Error('Nội dung quá dài cho mã QR. Hãy rút ngắn hoặc giảm mức sửa lỗi.'); }
  const n = qr.getModuleCount();
  const m = o.margin;
  const N = n + m * 2;
  const isEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  // ponytail: logo covers the centre ~22%; level H (30% recovery) is forced so it still scans.
  const L = o.logo ? Math.ceil(n * 0.22) | 1 : 0;
  const l0 = (n - L) / 2;
  const isLogo = (r, c) => L && r >= l0 - 1 && r < l0 + L + 1 && c >= l0 - 1 && c < l0 + L + 1;
  const on = (r, c) => r >= 0 && c >= 0 && r < n && c < n && qr.isDark(r, c) && !isEye(r, c) && !isLogo(r, c);

  let d = '';
  for (let c = 0; c < n; c++) {
    for (let r = 0; r < n; r++) {
      if (!on(r, c)) continue;
      const x = c + m, y = r + m;
      if (o.dots === 'bars') {
        let len = 1;
        while (on(r + len, c)) len++;
        d += rr(x + 0.1, y + 0.1, 0.8, len - 0.2, [0.4, 0.4, 0.4, 0.4]);
        r += len - 1;
      } else if (o.dots === 'dots') d += `M${x + 0.5} ${y + 0.08}a.42 .42 0 1 1 0 .84a.42 .42 0 1 1 0-.84z`;
      else if (o.dots === 'fluid') {
        const u = on(r - 1, c), dn = on(r + 1, c), lf = on(r, c - 1), rt = on(r, c + 1);
        d += rr(x, y, 1, 1, [!u && !lf ? 0.5 : 0, !u && !rt ? 0.5 : 0, !dn && !rt ? 0.5 : 0, !dn && !lf ? 0.5 : 0]);
      } else if (o.dots === 'star') d += `M${x + 0.5} ${y}Q${x + 0.6} ${y + 0.4} ${x + 1} ${y + 0.5}Q${x + 0.6} ${y + 0.6} ${x + 0.5} ${y + 1}Q${x + 0.4} ${y + 0.6} ${x} ${y + 0.5}Q${x + 0.4} ${y + 0.4} ${x + 0.5} ${y}z`;
      else if (o.dots === 'diamond') d += `M${x + 0.5} ${y}l.5 .5l-.5 .5l-.5-.5z`;
      else if (o.dots === 'rounded') d += rr(x + 0.05, y + 0.05, 0.9, 0.9, [0.32, 0.32, 0.32, 0.32]);
      else d += `M${x} ${y}h1v1h-1z`;
    }
  }

  let eyes = '';
  for (const [r, c] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
    const x = c + m, y = r + m;
    const [ring, pupil] = EYE_PARTS[o.eyes] || [o.eyes, o.eyes];
    eyes += rr(x, y, 7, 7, corners(ring, 7)) + rr(x + 1, y + 1, 5, 5, corners(ring, 5)) + rr(x + 2, y + 2, 3, 3, corners(pupil, 3));
  }

  const fill = o.fg2 ? `url(#${id}g)` : o.fg;
  const grad = !o.fg2 ? '' : o.gradient === 'radial'
    ? `<radialGradient id="${id}g" gradientUnits="userSpaceOnUse" cx="${N / 2}" cy="${N / 2}" r="${N * 0.7}"><stop offset="0" stop-color="${o.fg}"/><stop offset="1" stop-color="${o.fg2}"/></radialGradient>`
    : `<linearGradient id="${id}g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${N}" y2="${N}"><stop offset="0" stop-color="${o.fg}"/><stop offset="1" stop-color="${o.fg2}"/></linearGradient>`;
  const logo = L && LOGO.test(o.logo)
    ? `<rect x="${l0 + m - 0.6}" y="${l0 + m - 0.6}" width="${L + 1.2}" height="${L + 1.2}" rx="${L * 0.22}" fill="${o.transparent ? '#ffffff' : o.bg}"/><image href="${o.logo}" x="${l0 + m}" y="${l0 + m}" width="${L}" height="${L}" preserveAspectRatio="xMidYMid meet"/>`
    : '';

  const body = `${o.transparent ? '' : `<rect width="${N}" height="${N}" fill="${o.bg}"/>`}<path fill="${fill}" d="${d}"/><path fill="${o.eye || fill}" fill-rule="evenodd" d="${eyes}"/>${logo}`;
  const title = `<title>${esc(`Mã QR: ${o.data.slice(0, 120)}`)}</title>${grad ? `<defs>${grad}</defs>` : ''}`;
  if (!o.frame || o.frame === 'none') {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" width="${o.size}" height="${o.size}" role="img">${title}${body}</svg>`;
  }
  // Frames wrap the code in a branded card with a caption; output stays square so PNG export is unchanged.
  const p = N * 0.08, cap = N * 0.2, W = N + p * 2, H = N + p * 2 + cap, S = Math.max(W, H);
  const ox = (S - W) / 2, fc = o.frameColor, text = esc(o.caption || 'SCAN ME');
  const light = parseInt(fc.slice(1), 16) > 0xaaaaaa;
  const font = `font-family="Baloo 2,Nunito,Segoe UI,Helvetica,Arial,sans-serif" font-weight="800" text-anchor="middle" font-size="${cap * 0.38}"`;
  const frame = {
    card: `<rect x="${ox}" y="0" width="${W}" height="${H}" rx="${N * 0.09}" fill="${fc}"/><rect x="${ox + p * 0.5}" y="${p * 0.5}" width="${N + p}" height="${N + p}" rx="${N * 0.06}" fill="${o.transparent ? '#ffffff' : o.bg}"/><text x="${S / 2}" y="${N + p * 2 + cap * 0.55}" fill="${light ? '#0f0f15' : '#ffffff'}" ${font}>${text}</text>`,
    band: `<rect x="${ox}" y="0" width="${W}" height="${H}" rx="${N * 0.04}" fill="${o.transparent ? 'none' : o.bg}" stroke="${fc}" stroke-width="${p * 0.35}"/><rect x="${ox}" y="${N + p * 1.6}" width="${W}" height="${cap + p * 0.4}" fill="${fc}"/><text x="${S / 2}" y="${N + p * 1.6 + cap * 0.62}" fill="${light ? '#0f0f15' : '#ffffff'}" ${font}>${text}</text>`,
    pill: `<rect x="${ox}" y="0" width="${W}" height="${N + p * 2}" rx="${N * 0.1}" fill="${o.transparent ? 'none' : o.bg}" stroke="${fc}" stroke-width="${p * 0.25}"/><rect x="${S / 2 - N * 0.36}" y="${N + p * 2 + cap * 0.12}" width="${N * 0.72}" height="${cap * 0.76}" rx="${cap * 0.38}" fill="${fc}"/><text x="${S / 2}" y="${N + p * 2 + cap * 0.63}" fill="${light ? '#0f0f15' : '#ffffff'}" ${font}>${text}</text>`,
  }[o.frame];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${o.size}" height="${o.size}" role="img">${title}<g transform="translate(0 ${(S - H) / 2})">${frame}<g transform="translate(${ox + p} ${p})">${body}</g></g></svg>`;
}
