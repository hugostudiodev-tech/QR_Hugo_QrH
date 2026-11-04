# qr-hugo

Render beautiful QR codes as SVG — offline, zero DOM in the core. Same options as the [QR Hugo API](https://qr.hugowishpax.studio/#api).

```bash
npm i qr-hugo
```

## Any JavaScript (Node, Deno, Bun, Workers, browser)

```js
import { renderSvg, DEFAULTS } from 'qr-hugo';
const svg = renderSvg({ ...DEFAULTS, data: 'https://example.com', dots: 'rounded', eyes: 'soft', fg: '#0a84ff', fg2: '#5e5ce6' });
```

## Web Component — HTML, Vue, Angular, Svelte, Solid, Astro

```js
import 'qr-hugo/element';
```
```html
<qr-hugo data="https://example.com" dots="dots" eyes="circle" fg="#ff375f" fg2="#ff9f0a" frame="card" caption="SCAN ME" frame-color="#ff375f"></qr-hugo>
```
Vue: add `compilerOptions.isCustomElement = (t) => t === 'qr-hugo'`. Angular: add `CUSTOM_ELEMENTS_SCHEMA`.

## React

```jsx
import { QrHugo } from 'qr-hugo/react';
<QrHugo data="https://example.com" dots="fluid" eyes="leaf" fg="#30d158" style={{ width: 240 }} />
```

## Options

| option | values | default |
|---|---|---|
| data | text, 1–2048 chars | — |
| size | px | 512 |
| margin | 0–10 modules | 2 |
| level | L M Q H | M |
| fg / fg2 / bg / eye | #RRGGBB | #0f0f15 / – / #ffffff / = fg |
| gradient | linear radial | linear |
| transparent | boolean | false |
| dots | square rounded fluid dots diamond star bars | square |
| eyes | square rounded circle leaf dot soft | square |
| frame | none card band pill | none |
| caption / frameColor | text ≤ 40 / #RRGGBB | SCAN ME / #0f0f15 |
| logo | base64 image data URL (forces level H) | — |
