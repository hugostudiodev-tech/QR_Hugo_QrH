// Colour + logo helpers for the builder's "smart suggestions".

const hex2rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgb2hex = (rgb) => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const lum = (h) => {
  const [r, g, b] = hex2rgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG contrast ratio, 1–21. */
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

export function toHsl(h) {
  const [r, g, b] = hex2rgb(h).map((v) => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, s * 100, l * 100];
}
export function fromHsl(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  return rgb2hex([0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))));
}

/** Harmonious, scan-safe palettes built around one base colour. */
export function suggestPalettes(base) {
  const [h, s0] = toHsl(base);
  const s = Math.max(s0, 55);
  const dark = (hue, l = 40) => fromHsl(hue, s, l);
  return [
    { name: 'Đơn sắc', fg: dark(h, 28), fg2: dark(h, 45), eye: dark(h, 22) },
    { name: 'Tương đồng', fg: dark(h - 25), fg2: dark(h + 30), eye: '' },
    { name: 'Bổ túc', fg: dark(h, 34), fg2: dark(h, 42), eye: dark(h + 180, 45) },
    { name: 'Bộ ba', fg: dark(h), fg2: dark(h + 120), eye: dark(h + 240, 42) },
    { name: 'Đêm', fg: '#1c1c1e', fg2: '', eye: dark(h, 45) },
  ].map((p) => ({ ...p, bg: '#ffffff' }));
}

/** Average colour of the saturated pixels in an image (data URL). Resolves '' if nothing stands out. */
export function dominantColor(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const c = Object.assign(document.createElement('canvas'), { width: 24, height: 24 });
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0, 24, 24);
      const px = ctx.getImageData(0, 0, 24, 24).data;
      const sum = [0, 0, 0];
      let n = 0;
      for (let i = 0; i < px.length; i += 4) {
        const [r, g, b, a] = px.slice(i, i + 4);
        if (a < 128 || Math.max(r, g, b) - Math.min(r, g, b) < 40) continue; // skip transparent/grey
        sum[0] += r; sum[1] += g; sum[2] += b; n++;
      }
      resolve(n ? rgb2hex(sum.map((v) => v / n)) : '');
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

export const LOGO_ICONS = {
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  wifi: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z',
  chat: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  cart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0020 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
  place: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z',
  mail: 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  call: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  bolt: 'M7 2v11h3v9l7-12h-4l4-8z',
};

const esc = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const b64 = (svg) => `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;

/** Build a logo (icon or initials on a coloured shape) as an SVG data URL. */
export function makeLogo({ kind, icon, text, color, bg, shape }) {
  const back = { circle: `<circle cx="50" cy="50" r="50" fill="${bg}"/>`, rounded: `<rect width="100" height="100" rx="26" fill="${bg}"/>`, square: `<rect width="100" height="100" fill="${bg}"/>`, hex: `<path d="M50 0l43.3 25v50L50 100 6.7 75V25z" fill="${bg}"/>` }[shape] || '';
  const t = (text || 'H').slice(0, 3).toUpperCase();
  const inner = kind === 'icon'
    ? `<path transform="translate(20 20) scale(2.5)" fill="${color}" d="${LOGO_ICONS[icon] || LOGO_ICONS.heart}"/>`
    : `<text x="50" y="50" dy=".35em" text-anchor="middle" font-family="Baloo 2,Nunito,Segoe UI,Helvetica,Arial,sans-serif" font-weight="800" font-size="${t.length > 2 ? 32 : t.length > 1 ? 42 : 56}" fill="${color}">${esc(t)}</text>`;
  return b64(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${back}${inner}</svg>`);
}
