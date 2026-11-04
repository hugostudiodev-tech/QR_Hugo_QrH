import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseParams, renderSvg } from 'qr-hugo';
import { blip, Icon } from './App.jsx';

const PARAMS = [
  ['data', 'string', '—'], ['url', 'string', '—'], ['size', 'number', '512'], ['margin', 'number', '2'], ['level', 'L | M | Q | H', 'M'],
  ['fg', '#RRGGBB', '#0f0f15'], ['fg2', '#RRGGBB', '—'], ['gradient', 'linear | radial', 'linear'], ['bg', '#RRGGBB', '#ffffff'], ['transparent', '1', '—'],
  ['eye', '#RRGGBB', '= fg'], ['dots', 'square | rounded | fluid | dots | diamond | star | bars', 'square'], ['eyes', 'square | rounded | circle | leaf | dot | soft', 'square'],
  ['frame', 'none | card | band | pill', 'none'], ['caption', 'string ≤ 40', 'SCAN ME'], ['frameColor', '#RRGGBB', '#0f0f15'], ['download', '1', '—'],
];
const RECIPES = [
  // [icon, API query, builder content type, builder fields]
  ['wifi', 'data=WIFI%3AT%3AWPA%3BS%3AHugo_Cafe%3BP%3A12345678%3B%3B&dots=rounded&eyes=soft&fg=%230a84ff&frame=card&frameColor=%230a84ff&caption=FREE%20WI-FI', 'wifi', { ssid: 'Hugo_Cafe', pass: '12345678', enc: 'WPA' }],
  ['link', 'url=https%3A%2F%2Fwww.hugowishpax.studio&dots=dots&eyes=circle&fg=%23ff375f&fg2=%23ff9f0a', 'url', { url: 'https://www.hugowishpax.studio' }],
  ['contact_page', 'data=BEGIN%3AVCARD%0AVERSION%3A3.0%0AFN%3AHugo%0ATEL%3A%2B84912345678%0AEND%3AVCARD&dots=fluid&eyes=leaf&fg=%2330d158&fg2=%230a84ff&gradient=radial', 'vcard', { name: 'Hugo', tel: '+84912345678' }],
];

const apiSamples = (base) => ({
  HTML: `<img
  src="${base}?data=https%3A%2F%2Fexample.com&dots=rounded"
  width="256" height="256"
  alt="QR code"
  loading="lazy"
/>`,
  JavaScript: `const params = new URLSearchParams({
  data: 'https://example.com/product?id=42',
  size: '512',
  dots: 'rounded',
  fg: '#0a84ff',            // URLSearchParams encodes # → %23
});

const res = await fetch(\`${base}?\${params}\`);
if (!res.ok) throw new Error((await res.json()).error);
document.querySelector('#qr').innerHTML = await res.text();`,
  cURL: `curl -G "${base}" \\
  --data-urlencode "data=https://example.com" \\
  --data-urlencode "fg=#0a84ff" \\
  -d size=1024 -d dots=dots -d eyes=circle \\
  -o qr.svg`,
  Python: `import requests

res = requests.get("${base}", params={
    "data": "https://example.com",
    "size": 1024,
    "dots": "rounded",
    "frame": "card",
    "caption": "SCAN ME",
})
res.raise_for_status()
open("qr.svg", "wb").write(res.content)`,
  PHP: `<?php
$query = http_build_query([
  'data' => 'https://example.com',
  'dots' => 'fluid',
  'fg'   => '#0a84ff',
]);
file_put_contents('qr.svg', file_get_contents("${base}?$query"));`,
});

const LIB = {
  'npm': 'npm i qr-hugo',
  'JS / Node': `import { renderSvg, DEFAULTS } from 'qr-hugo';

const svg = renderSvg({ ...DEFAULTS, data: 'https://example.com', dots: 'rounded', fg: '#0a84ff', fg2: '#5e5ce6' });`,
  React: `import { QrHugo } from 'qr-hugo/react';

<QrHugo data="https://example.com" dots="fluid" eyes="leaf" fg="#30d158" style={{ width: 240 }} />`,
  Vue: `<script setup>
import 'qr-hugo/element';
</script>

<template>
  <qr-hugo :data="link" dots="dots" eyes="circle" fg="#ff375f" fg2="#ff9f0a" />
</template>
<!-- vite.config: vue({ template: { compilerOptions: { isCustomElement: (t) => t === 'qr-hugo' } } }) -->`,
  Angular: `// component.ts
import 'qr-hugo/element';
@Component({ schemas: [CUSTOM_ELEMENTS_SCHEMA], template: \`<qr-hugo [attr.data]="link" dots="rounded"></qr-hugo>\` })`,
  Svelte: `<script>
  import 'qr-hugo/element';
  let link = 'https://example.com';
</script>

<qr-hugo data={link} dots="bars" eyes="soft" frame="pill" caption="SCAN ME" />`,
  HTML: `<script type="module" src="https://cdn.jsdelivr.net/npm/qr-hugo@1.0.0/element.js/+esm"></script>

<qr-hugo data="https://example.com" dots="dots" frame="card" frame-color="#0a84ff"></qr-hugo>`,
};

function Copy({ text, notify }) {
  const { t } = useTranslation();
  return (
    <button type="button" className="mini text" onClick={async () => { try { await navigator.clipboard.writeText(text); notify(t('toast.copied')); } catch { blip(220); } }}>
      <Icon name="content_copy" /> {t('api.copy')}
    </button>
  );
}

function CodeTabs({ samples, notify, label }) {
  const keys = Object.keys(samples);
  const [lang, setLang] = useState(keys[0]);
  return (
    <div className="code glass">
      <div className="code-tabs" role="tablist" aria-label={label}>
        {keys.map((k) => <button key={k} type="button" role="tab" aria-selected={lang === k} onClick={() => { setLang(k); blip(640); }}>{k}</button>)}
        <Copy text={samples[lang]} notify={notify} />
      </div>
      <pre key={lang}><code>{samples[lang]}</code></pre>
    </div>
  );
}

export default function ApiDocs({ query, hasLogo, notify, onApply }) {
  const { t } = useTranslation();
  // Docs/code samples always show the public domain; live calls hit whichever server serves this page.
  const local = /^(localhost|127\.)/.test(location.hostname);
  const base = `${local ? 'https://qr.hugowishpax.studio' : location.origin}/api/qr`;
  const api = `${base}?${query}`;
  const live = `/api/qr?${query}`;
  const thumbs = useMemo(() => RECIPES.map(([, q], k) => renderSvg({ ...parseParams(new URLSearchParams(q)), size: 80 }, `r${k}`)), []);
  const [imgState, setImgState] = useState('loading');
  const a = (k) => t(`api.${k}`);

  return (
    <section className="section api" aria-labelledby="api-title">
      <div className="section-head">
        <p className="kicker">{a('kicker')}</p>
        <h2 id="api-title">{a('title')}</h2>
        <p className="lead">{a('lead')}</p>
      </div>

      <ol className="steps">
        {a('steps').map(([h, p], i) => <li key={h} className="glass reveal"><span>{i + 1}</span><h3>{h}</h3><p>{p}</p></li>)}
      </ol>

      <div className="playground glass">
        <div className="playground-head">
          <h3><Icon name="science" /> {a('tryTitle')}</h3>
          <p>{a('tryText')} {hasLogo && a('tryLogo')}</p>
        </div>
        <div className="endpoint">
          <span className="method">GET</span>
          <code>{api}</code>
          <Copy text={api} notify={notify} />
          <a className="mini text" href={api} target="_blank" rel="noreferrer"><Icon name="open_in_new" /> {a('open')}</a>
        </div>
        <div className="playground-preview">
          {imgState !== 'ok' && <div className={`sk sk-qr${imgState === 'error' ? ' err' : ''}`}>{imgState === 'error' && <span><Icon name="cloud_off" /> {a('offline')}</span>}</div>}
          <img key={live} src={live} alt={a('result')} loading="lazy" width="200" height="200" hidden={imgState !== 'ok'} onLoad={() => setImgState('ok')} onError={() => setImgState('error')} />
        </div>
      </div>

      <h3 className="sub">{a('params')}</h3>
      <div className="table-wrap glass">
        <table>
          <thead><tr>{a('th').map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>{PARAMS.map(([n, ty, d]) => <tr key={n}><td><code>{n}</code></td><td>{ty}</td><td>{d}</td><td>{t(`api.desc.${n}`)}</td></tr>)}</tbody>
        </table>
      </div>

      <h3 className="sub">{a('samples')}</h3>
      <CodeTabs samples={apiSamples(base)} notify={notify} label={a('samples')} />

      <h3 className="sub">{a('recipes')}</h3>
      <div className="recipes">
        {RECIPES.map(([i, q, type, fields], k) => (
          <article key={i} className="recipe glass reveal">
            <button type="button" className="recipe-img" aria-label={`${a('useRecipe')}: ${a('recipeNames')[k]}`} onClick={() => onApply(type, fields, parseParams(new URLSearchParams(q)))} dangerouslySetInnerHTML={{ __html: thumbs[k] }} />
            <span>
              <b><Icon name={i} /> {a('recipeNames')[k]}</b>
              <span className="recipe-actions">
                <button type="button" className="mini text" onClick={() => onApply(type, fields, parseParams(new URLSearchParams(q)))}><Icon name="auto_awesome" /> {a('useRecipe')}</button>
                <a className="mini text ghosty" href={`${local ? '/api/qr' : base}?${q}`} target="_blank" rel="noreferrer"><Icon name="code" /> {a('openResult')}</a>
              </span>
            </span>
          </article>
        ))}
      </div>

      <div className="api-notes">
        <div className="glass">
          <h3>{a('codes')}</h3>
          <ul>{['200', '400', '404'].map((c, i) => <li key={c}><code className={`status s${c[0]}`}>{c}</code><span><b>{i ? 'application/json' : 'image/svg+xml'}</b> {a('codeText')[i]}</span></li>)}</ul>
        </div>
        <div className="glass">
          <h3>{a('notes')}</h3>
          <ul className="bullets">{a('noteItems').map(([h, p]) => <li key={h}><span><b>{h}</b> {p}</span></li>)}</ul>
        </div>
      </div>

      <div id="thu-vien">
        <h3 className="sub"><Icon name="code" /> {t('api.lib.title')}</h3>
        <p className="lead" style={{ marginTop: 0, marginBottom: 20 }}>{t('api.lib.text')}</p>
        <CodeTabs samples={LIB} notify={notify} label={t('api.lib.title')} />
      </div>
    </section>
  );
}
