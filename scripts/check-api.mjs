import assert from 'node:assert/strict';
import worker, { qrOptions } from '../worker/index.js';

const valid = qrOptions(new URLSearchParams('url=https://example.com&size=5000&level=h'));
assert.equal(valid.url, 'https://example.com/');
assert.equal(valid.size, 1024);
assert.equal(valid.level, 'H');

const response = await worker.fetch(new Request('https://qr.example/api/qr?url=https%3A%2F%2Fexample.com'));
assert.equal(response.status, 200);
assert.match(response.headers.get('content-type'), /^image\/svg\+xml/);
assert.match(await response.text(), /^<svg/);

const invalid = await worker.fetch(new Request('https://qr.example/api/qr?url=javascript%3Aalert(1)'));
assert.equal(invalid.status, 400);
assert.deepEqual(await invalid.json(), { error: 'URL chỉ hỗ trợ http hoặc https.' });

console.log('QR API self-check passed.');
