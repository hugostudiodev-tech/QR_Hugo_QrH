import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { parseParams, renderSvg, DOTS, EYES, EYE_OUTER, EYE_INNER, FRAMES } from 'qr-hugo';
import { LIMITS } from '../worker/auth.js';

// Fake Hugo Studio: one account, quota counted here.
const env = { QR_SERVICE_SECRET: 'svc', HUGO_STUDIO_API: 'https://studio.test/api' };
const KEY = 'HS-ABC123-' + 'k'.repeat(32);
const RK = 'HS-RATE01-' + 'r'.repeat(32);
const studioCalls = [];
let left = 2;
globalThis.fetch = async (u, init) => {
  const path = new URL(u).pathname.split('/').pop();
  const body = JSON.parse(init.body);
  studioCalls.push(path);
  assert.equal(init.headers['X-Service-Secret'], 'svc');
  const ok = body.key === KEY || body.key === RK;
  if (path === 'log') return Response.json({ ok: true });
  if (!ok) return Response.json({ error: 'API key không đúng.' }, { status: 401 });
  if (path === 'connect') return Response.json({ connected: true });
  if (body.key === KEY && left-- <= 0) return Response.json({ error: 'Đã dùng hết lượt.' }, { status: 429 });
  return Response.json({ ok: true, left: 99 });
};
const call = (q, key = KEY) => worker.fetch(new Request(`https://qr.example/api/qr?${q}`, { headers: key ? { Authorization: `Bearer ${key}` } : {} }), env);

// auth
assert.equal((await call('data=x', '')).status, 401, 'no key');
assert.equal((await call('data=x', 'HS-ABC123-' + 'x'.repeat(32))).status, 401, 'wrong secret (studio says 401)');
assert.equal((await worker.fetch(new Request('https://qr.example/api/qr?data=x', { headers: { Authorization: `Bearer ${KEY}` } }), {})).status, 503, 'no service secret configured');
studioCalls.length = 0;
assert.equal((await call('data=' + 'a'.repeat(2049))).status, 400);
assert.ok(!studioCalls.includes('use'), 'invalid input never reaches /use (no credit spent)');
assert.equal((await call('data=x')).status, 200);
assert.equal((await call('data=x')).status, 200);
assert.equal((await call('data=x')).status, 429, 'studio quota exhausted → 429');
left = 1e9;
// local per-minute limit, then reported to the studio log once
const rk = RK;
for (let i = 0; i < LIMITS.perMinute; i++) assert.equal((await call('data=x', rk)).status, 200);
const limited = await call('data=x', rk);
assert.equal(limited.status, 429);
assert.ok(+limited.headers.get('retry-after') > 0);
await new Promise((r) => setTimeout(r, 10));
assert.ok(studioCalls.includes('log'), 'local limit hit is logged in Hugo Studio');

const o = parseParams(new URLSearchParams('url=https://example.com&size=5000&level=h&foreground=%23ff0000'));
assert.equal(o.data, 'https://example.com/');
assert.equal(o.size, 2048);
assert.equal(o.level, 'H');
assert.equal(o.fg, '#ff0000', 'legacy foreground alias');

const ok = await call('data=Xin%20ch%C3%A0o&dots=dots&eyes=circle&fg2=%230a84ff&gradient=radial');
assert.equal(ok.status, 200);
assert.match(ok.headers.get('content-type'), /^image\/svg\+xml/);
const svg = await ok.text();
assert.match(svg, /^<svg/);
assert.match(svg, /radialGradient/);

for (const dots of DOTS) for (const eyes of EYES) for (const frame of FRAMES) assert.doesNotMatch(renderSvg({ ...o, dots, eyes, frame }), /NaN|undefined/);
for (const eyeOuter of EYE_OUTER) for (const eyeInner of EYE_INNER) assert.doesNotMatch(renderSvg({ ...o, eyeOuter, eyeInner, eye2: '#ff0000' }), /NaN|undefined/);
assert.match(await (await call('data=x&frame=card&caption=%3Cb%3E')).text(), /&#60;b&#62;/, 'caption is escaped');

const bad = await call('url=javascript%3Aalert(1)');
assert.equal(bad.status, 400);
assert.deepEqual(await bad.json(), { error: 'URL chỉ hỗ trợ http hoặc https.' });
assert.equal((await call('data=' + 'a'.repeat(2049))).status, 400);
assert.equal((await call('data=%3Cscript%3E')).status, 200);
assert.doesNotMatch(await (await call('data=%3Cscript%3E')).text(), /<script>/, 'title is escaped');
assert.equal((await worker.fetch(new Request('https://qr.example/api'), env)).status, 401, 'spec needs key');
assert.equal((await worker.fetch(new Request('https://qr.example/api/key', { headers: { Authorization: `Bearer ${KEY}` } }), env)).status, 200, 'connect');
assert.equal((await worker.fetch(new Request('https://qr.example/api/qr', { method: 'POST' }), env)).status, 404);
// brute force: 10 bad keys from one IP → that IP is blocked even with a good key
const from = (ip, key) => worker.fetch(new Request('https://qr.example/api/qr?data=x', { headers: { Authorization: `Bearer ${key}`, 'x-real-ip': ip } }), env);
for (let i = 0; i < 10; i++) await from('6.6.6.6', 'HS-ABC123-' + 'z'.repeat(32));
assert.equal((await from('6.6.6.6', KEY)).status, 429, 'brute-force IP blocked');
assert.equal((await from('7.7.7.7', KEY)).status, 200, 'other IPs unaffected');

console.log('QR API self-check passed.');
