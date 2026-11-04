import assert from 'node:assert/strict';
import worker from '../worker/index.js';
import { parseParams, renderSvg, DOTS, EYES, FRAMES } from '../lib/index.js';

const call = (q) => worker.fetch(new Request(`https://qr.example/api/qr?${q}`));

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
assert.match(await (await call('data=x&frame=card&caption=%3Cb%3E')).text(), /&#60;b&#62;/, 'caption is escaped');

const bad = await call('url=javascript%3Aalert(1)');
assert.equal(bad.status, 400);
assert.deepEqual(await bad.json(), { error: 'URL chỉ hỗ trợ http hoặc https.' });
assert.equal((await call('data=' + 'a'.repeat(2049))).status, 400);
assert.equal((await call('data=%3Cscript%3E')).status, 200);
assert.doesNotMatch(await (await call('data=%3Cscript%3E')).text(), /<script>/, 'title is escaped');
assert.equal((await worker.fetch(new Request('https://qr.example/api'))).status, 200);

console.log('QR API self-check passed.');
