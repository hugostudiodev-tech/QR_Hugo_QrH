import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULTS, DOTS, EYES, FRAMES, renderSvg } from 'qr-hugo';
import { contrast, dominantColor, LOGO_ICONS, makeLogo, suggestPalettes } from './smart.js';
import { LANGS, MT_LANGS, machineTranslateUrl, setLang } from './i18n.js';

// After a deploy, an open tab asks for chunk hashes that no longer exist; reload once to get the new build.
const lazyChunk = (load) => lazy(() => load().then((m) => { try { sessionStorage.removeItem('qr-reloaded'); } catch { /* ignore */ } return m; }, (err) => {
  let first = true;
  try { first = !sessionStorage.getItem('qr-reloaded'); sessionStorage.setItem('qr-reloaded', '1'); } catch { /* ignore */ }
  if (!first) throw err;
  location.reload();
  return new Promise(() => {});
}));
const Learn = lazyChunk(() => import('./Learn.jsx'));
const ApiDocs = lazyChunk(() => import('./ApiDocs.jsx'));

/* ---------- sound: tiny WebAudio blips, no audio files ---------- */
let audio;
let muted = (() => { try { return localStorage.getItem('qr-muted') === '1'; } catch { return false; } })();
export function blip(freq = 660, dur = 0.07, delay = 0) {
  if (muted) return;
  try {
    audio ||= new AudioContext();
    const t = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + dur);
  } catch { /* audio unsupported: stay silent */ }
}
const success = () => [523, 659, 784].forEach((f, i) => blip(f, 0.12, i * 0.07));

export const Icon = ({ name, className = '' }) => <span className={`ms ${className}`} aria-hidden="true">{name}</span>;

/* ---------- content types. Field: [key, label key, placeholder ('@key' = translated), input type, options] ---------- */
const wifiEsc = (s = '') => s.replace(/([\\;,:"])/g, '\\$1');
const digits = (s) => s.replace(/[^\d+]/g, '');
const TYPES = {
  url: { icon: 'link', fields: [['url', 'url', 'https://example.com', 'url']], build: (f) => f.url || '' },
  text: { icon: 'notes', fields: [['text', 'text', '@textPh', 'textarea']], build: (f) => f.text || '' },
  wifi: {
    icon: 'wifi',
    fields: [['ssid', 'ssid', 'Hugo_Cafe'], ['pass', 'pass', '••••••••'], ['enc', 'enc', '', 'select', [['WPA', 'WPA/WPA2/WPA3'], ['WEP', 'WEP'], ['nopass', '@encNone']]], ['hidden', 'hidden', '', 'checkbox']],
    build: (f) => (f.ssid ? `WIFI:T:${f.enc || 'WPA'};S:${wifiEsc(f.ssid)};${f.enc === 'nopass' ? '' : `P:${wifiEsc(f.pass)};`}${f.hidden ? 'H:true;' : ''};` : ''),
  },
  email: {
    icon: 'mail',
    fields: [['to', 'to', 'hello@example.com', 'email'], ['subject', 'subject', '@subjectPh'], ['body', 'body', '@bodyPh', 'textarea']],
    build: (f) => (f.to ? `mailto:${f.to}?subject=${encodeURIComponent(f.subject || '')}&body=${encodeURIComponent(f.body || '')}` : ''),
  },
  phone: { icon: 'call', fields: [['tel', 'tel', '+84 912 345 678', 'tel']], build: (f) => (f.tel ? `tel:${digits(f.tel)}` : '') },
  sms: {
    icon: 'sms', fields: [['tel', 'telTo', '+84 912 345 678', 'tel'], ['msg', 'msg', '@msgPh', 'textarea']],
    build: (f) => (f.tel ? `SMSTO:${digits(f.tel)}:${f.msg || ''}` : ''),
  },
  vcard: {
    icon: 'contact_page',
    fields: [['name', 'name', '@namePh'], ['org', 'org', 'Hugo Studio'], ['title', 'title', 'Designer'], ['tel', 'tel', '+84 912 345 678', 'tel'], ['email', 'email', 'a@example.com', 'email'], ['web', 'web', 'https://…', 'url']],
    build: (f) => (f.name ? ['BEGIN:VCARD', 'VERSION:3.0', `FN:${f.name}`, f.org && `ORG:${f.org}`, f.title && `TITLE:${f.title}`, f.tel && `TEL:${f.tel}`, f.email && `EMAIL:${f.email}`, f.web && `URL:${f.web}`, 'END:VCARD'].filter(Boolean).join('\n') : ''),
  },
  geo: { icon: 'location_on', fields: [['lat', 'lat', '10.7769', 'number'], ['lng', 'lng', '106.7009', 'number']], build: (f) => (f.lat && f.lng ? `geo:${f.lat},${f.lng}` : '') },
};

const BASE = { fg: '#0f0f15', fg2: '', gradient: 'linear', bg: '#ffffff', eye: '', dots: 'square', eyes: 'square' };
const PRESETS = [
  {},
  { fg: '#0a84ff', fg2: '#5e5ce6', dots: 'rounded', eyes: 'rounded' },
  { fg: '#ff375f', fg2: '#ff9f0a', dots: 'dots', eyes: 'circle' },
  { fg: '#30d158', fg2: '#0a84ff', gradient: 'radial', dots: 'bars', eyes: 'leaf' },
  { fg: '#bf5af2', fg2: '#64d2ff', bg: '#0f0f15', eye: '#ffffff', dots: 'dots', eyes: 'circle' },
  { fg: '#1c1c1e', eye: '#ff9f0a', dots: 'diamond', eyes: 'leaf' },
].map((p) => ({ ...BASE, ...p }));
const LOGO_SHAPES = ['circle', 'rounded', 'square', 'hex', 'none'];
const TABS = [['content', 'edit_note'], ['style', 'interests'], ['color', 'palette'], ['logo', 'image'], ['export', 'download']];
const SOCIAL = [
  ['TikTok', 'https://www.tiktok.com/@hugo.studiotiktok'],
  ['group', 'https://tiktok.me/group/ZSbw65bM7/'],
  ['Instagram', 'https://www.instagram.com/hugostudio.vn'],
  ['Facebook', 'https://www.facebook.com/share/1DdurLeBhW/'],
];

function downloadBlob(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
function svgToPng(svg, size) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    img.onload = () => {
      const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
      canvas.getContext('2d').drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(src);
      canvas.toBlob(resolve, 'image/png');
    };
    img.onerror = reject;
    img.src = src;
  });
}

/* ---------- lazy section: mounts + downloads its code only when near the viewport ---------- */
function Skeleton() {
  const { t } = useTranslation();
  return (
    <div className="skeleton" aria-busy="true" aria-label={t('loading')}>
      <div className="sk sk-kicker" /><div className="sk sk-title" /><div className="sk sk-line" /><div className="sk sk-line short" />
      <div className="sk-grid"><div className="sk sk-card" /><div className="sk sk-card" /><div className="sk sk-card" /></div>
    </div>
  );
}
const INNER = { 'tim-hieu': ['#ung-dung', '#hoi-dap', '#meo'], api: ['#thu-vien'] };
function LazySection({ id, children }) {
  const ref = useRef(null);
  const [show, setShow] = useState(() => location.hash === `#${id}` || (INNER[id] || []).includes(location.hash));
  useEffect(() => {
    if (show) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShow(true); io.disconnect(); } }, { rootMargin: '600px' });
    io.observe(ref.current);
    // footer links to anchors inside a not-yet-loaded section: mount it, then scroll.
    const onHash = () => { if ((INNER[id] || []).includes(location.hash)) setShow(true); };
    addEventListener('hashchange', onHash);
    return () => { io.disconnect(); removeEventListener('hashchange', onHash); };
  }, [show, id]);
  useEffect(() => { if (show && location.hash && (INNER[id] || []).includes(location.hash)) setTimeout(() => document.querySelector(location.hash)?.scrollIntoView(), 300); }, [show, id]);
  return <div id={id} ref={ref} className="lazy-section">{show ? <Suspense fallback={<Skeleton />}>{children}</Suspense> : <Skeleton />}</div>;
}

function Field({ field: [key, label, placeholder, type, options], value, onChange }) {
  const { t } = useTranslation();
  const tr = (s) => (s?.startsWith('@') ? t(`builder.f.${s.slice(1)}`) : s);
  const id = `f-${key}`;
  const text = t(`builder.f.${label}`, { defaultValue: t(`builder.${label}`) });
  if (type === 'checkbox') return <label className="check"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {text}</label>;
  return (
    <label className="field" htmlFor={id}>
      <span>{text}</span>
      {type === 'textarea' ? <textarea id={id} rows={3} value={value || ''} placeholder={tr(placeholder)} maxLength={2048} onChange={(e) => onChange(e.target.value)} />
        : type === 'select' ? <select id={id} value={value || options[0][0]} onChange={(e) => onChange(e.target.value)}>{options.map(([v, o]) => <option key={v} value={v}>{tr(o)}</option>)}</select>
          : <input id={id} type={type || 'text'} value={value || ''} placeholder={tr(placeholder)} maxLength={2048} step="any" onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

function Choice({ list, names, value, onPick, render }) {
  return (
    <div className="choices" role="radiogroup">
      {list.map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} className="choice" onClick={() => onPick(v)}>
          <span className="choice-art" dangerouslySetInnerHTML={{ __html: render(v) }} />
          <span>{names[v]}</span>
        </button>
      ))}
    </div>
  );
}

function ColorField({ label, value, onChange, optional }) {
  const { t } = useTranslation();
  return (
    <label className="color-field">
      <span className="swatch" style={{ background: value || 'transparent' }}><input type="color" value={value || '#0a84ff'} onChange={(e) => onChange(e.target.value)} /></span>
      <span><b>{label}</b><small>{value || t('builder.none')}</small></span>
      {optional && value && <button type="button" className="mini" onClick={() => onChange('')} aria-label={`${t('builder.remove')} ${label}`}><Icon name="close" /></button>}
    </label>
  );
}

function LangSelect({ className = 'lang', notify }) {
  const { t, i18n } = useTranslation();
  const names = useMemo(() => { try { return new Intl.DisplayNames([i18n.language], { type: 'language' }); } catch { return null; } }, [i18n.language]);
  const onChange = (code) => {
    if (LANGS[code]) { setLang(code); blip(700); return; }
    if (/^(localhost|127\.|\d+\.\d+\.\d+\.\d+)/.test(location.hostname)) { notify(t('toast.machineLocal'), false); return; }
    location.href = machineTranslateUrl(code);
  };
  return (
    <label className={className}>
      <Icon name="translate" />
      <select value={i18n.language} onChange={(e) => onChange(e.target.value)} aria-label={t('nav.language')}>
        {Object.entries(LANGS).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        <optgroup label={t('nav.machine')}>
          {MT_LANGS.filter((c) => !LANGS[c]).map((c) => <option key={c} value={c}>{names?.of(c) || c}</option>)}
        </optgroup>
      </select>
    </label>
  );
}

function Footer({ notify }) {
  const { t, i18n } = useTranslation();
  const cols = [
    ['tools', [['create', '#tao-qr'], ['api', '#api'], ['lib', '#thu-vien']]],
    ['about', [['what', '#tim-hieu'], ['uses', '#ung-dung'], ['studio', 'https://www.hugowishpax.studio/'], ['edu', 'https://education.hugowishpax.studio'], ['web', 'https://www.hugowishpax.studio/']]],
    ['help', [['faq', '#hoi-dap'], ['tips', '#meo'], ['feedback', 'mailto:contact@hugowishpax.studio']]],
  ];
  return (
    <footer className="footer">
      <div className="footer-cols">
        {cols.map(([head, links]) => (
          <nav key={head} aria-label={t(`footer.${head}`)}>
            <h2>{t(`footer.${head}`)}</h2>
            {links.map(([k, href]) => <a key={k} href={href} {...(href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}>{t(`footer.${k}`)}</a>)}
          </nav>
        ))}
        <nav aria-label={t('footer.social')}>
          <h2>{t('footer.social')}</h2>
          {SOCIAL.map(([n, href]) => <a key={n} href={href} target="_blank" rel="noreferrer me">{n === 'group' ? t('footer.group') : n}</a>)}
        </nav>
      </div>
      <div className="footer-bottom">
        <p className="footer-lang-title">{t('footer.lang')}</p>
        <div className="footer-langs">
          {Object.entries(LANGS).map(([c, n]) => (
            <button key={c} type="button" lang={c} aria-current={i18n.language === c} onClick={() => { setLang(c); blip(700); }}>{n}</button>
          ))}
          <LangSelect className="lang footer-more" notify={notify} />
        </div>
        <p className="footer-brand"><strong>QR HUGO</strong> <span>{t('footer.belongs')} <Icon name="water_drop" /> {t('footer.tagline')} · © {new Date().getFullYear()}</span></p>
      </div>
    </footer>
  );
}

export default function App() {
  const { t } = useTranslation();
  const [type, setType] = useState('url');
  const [fields, setFields] = useState({ url: { url: DEFAULTS.data } });
  const [style, setStyle] = useState({ ...BASE, size: 1024, margin: 2, level: 'M', transparent: false, frame: 'none', caption: '', frameColor: '#0a84ff' });
  const [lg, setLg] = useState({ kind: 'none', icon: 'heart', text: 'HG', color: '#ffffff', bg: '#0a84ff', shape: 'circle', upload: '' });
  const [logoTone, setLogoTone] = useState('');
  const [tab, setTab] = useState('content');
  const [toast, setToast] = useState('');
  const [sound, setSound] = useState(!muted);
  const [pulse, setPulse] = useState(0);
  const toastTimer = useRef(0);

  const data = useDeferredValue(TYPES[type].build(fields[type] || {}));
  const set = (patch) => { setStyle((s) => ({ ...s, ...patch })); setPulse((p) => p + 1); };
  const setLogo = (patch) => { setLg((l) => ({ ...l, ...patch })); setPulse((p) => p + 1); };
  const logo = useMemo(() => (lg.kind === 'upload' ? lg.upload : lg.kind === 'none' ? '' : makeLogo(lg)), [lg]);
  const captions = t(`captions.${type}`);
  const result = useMemo(() => {
    if (!data) return { error: t('builder.empty') };
    try { return { svg: renderSvg({ ...style, caption: style.caption || captions[0], logo, data }, 'main') }; } catch { return { error: t('toast.tooLong') }; }
  }, [data, style, logo, captions, t]);
  const thumb = (patch, id) => renderSvg({ ...DEFAULTS, ...style, size: 64, margin: 1, logo: '', frame: 'none', ...patch, data: 'HUGO' }, id);
  const ratio = contrast(style.fg, style.transparent ? '#ffffff' : style.bg);
  const palettes = useMemo(() => suggestPalettes(logoTone || (lg.kind === 'icon' || lg.kind === 'text' ? lg.bg : style.fg)), [logoTone, lg, style.fg]);
  const urlWarn = type === 'url' && data && !/^https?:\/\/\S+\.\S+/i.test(data);

  const notify = (msg, ok = true) => {
    setToast(msg);
    if (ok) success(); else blip(220, 0.15);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  };
  const download = async (fmt) => {
    if (!result.svg) return;
    if (fmt === 'svg') downloadBlob(new Blob([result.svg], { type: 'image/svg+xml' }), 'qr-hugo.svg');
    else downloadBlob(await svgToPng(result.svg, style.size), 'qr-hugo.png');
    notify(t('toast.downloaded', { fmt: fmt === 'png' ? `PNG ${style.size}px` : 'SVG' }));
  };
  const copyImage = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': svgToPng(result.svg, style.size) })]);
      notify(t('toast.copiedImg'));
    } catch { notify(t('toast.noClipboard'), false); }
  };
  const onLogo = (file) => {
    if (!file) return;
    if (file.size > 600_000) { notify(t('toast.logoMax'), false); return; }
    const reader = new FileReader();
    reader.onload = async () => {
      setLogo({ kind: 'upload', upload: reader.result });
      const tone = await dominantColor(reader.result);
      setLogoTone(tone);
      notify(t(tone ? 'toast.logoTone' : 'toast.logoAdded'));
    };
    reader.readAsDataURL(file);
  };
  const applyRecipe = (nextType, nextFields, o) => {
    setType(nextType);
    setFields((all) => ({ ...all, [nextType]: nextFields }));
    set(Object.fromEntries(['fg', 'fg2', 'gradient', 'bg', 'eye', 'dots', 'eyes', 'frame', 'caption', 'frameColor', 'transparent'].map((k) => [k, o[k]])));
    setTab('content');
    document.getElementById('tao-qr')?.scrollIntoView({ behavior: 'smooth' });
    notify(t('toast.recipe'));
  };
  const toggleSound = () => {
    muted = sound;
    setSound(!sound);
    try { localStorage.setItem('qr-muted', muted ? '1' : '0'); } catch { /* storage blocked */ }
    blip(880);
  };

  const apiQuery = useMemo(() => {
    const q = new URLSearchParams({ data: data || DEFAULTS.data });
    for (const k of ['size', 'margin', 'level', 'fg', 'fg2', 'gradient', 'bg', 'eye', 'dots', 'eyes']) {
      const v = style[k];
      if (v && v !== { ...DEFAULTS, size: 512 }[k] && !(k === 'gradient' && !style.fg2)) q.set(k, v);
    }
    if (style.transparent) q.set('transparent', '1');
    if (style.frame !== 'none') { q.set('frame', style.frame); q.set('frameColor', style.frameColor); q.set('caption', style.caption || captions[0]); }
    return q.toString();
  }, [data, style, captions]);

  const heroSvg = useMemo(() => renderSvg({ ...DEFAULTS, fg: '#1c1c24', eye: '#0a84ff', dots: 'fluid', eyes: 'soft', margin: 1 }, 'hero'), []);
  const b = (k, o) => t(`builder.${k}`, o);

  return (
    <div className="site">
      <a className="skip" href="#tao-qr">{t('nav.skip')}</a>
      <header className="nav glass">
        <a className="brand" href="#top" aria-label={t('nav.home')}><Icon name="qr_code_2" /><strong>QR Hugo</strong></a>
        <nav aria-label="Main">
          <a href="#tao-qr">{t('nav.create')}</a>
          <a href="#tim-hieu">{t('nav.learn')}</a>
          <a href="#ung-dung">{t('nav.uses')}</a>
          <a href="#api">{t('nav.api')}</a>
        </nav>
        <div className="nav-tools">
          <LangSelect notify={notify} />
          <button type="button" className="icon-btn" onClick={toggleSound} aria-label={t(sound ? 'nav.soundOff' : 'nav.soundOn')} aria-pressed={sound}><Icon name={sound ? 'volume_up' : 'volume_off'} /></button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="kicker reveal">{t('hero.kicker')}</p>
            <h1 id="hero-title" className="reveal">{t('hero.title1')}<br /><span className="grad-text">{t('hero.title2')}</span></h1>
            <p className="lead reveal">{t('hero.lead')}</p>
            <div className="hero-cta reveal">
              <a className="btn primary" href="#tao-qr" onClick={() => blip(700)}>{t('hero.start')} <Icon name="arrow_downward" /></a>
              <a className="btn ghost" href="#api" onClick={() => blip(500)}><Icon name="code" /> {t('hero.api')}</a>
            </div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-qr glass">
              <div className="hero-qr-img" dangerouslySetInnerHTML={{ __html: heroSvg }} />
              <span className="scan-line" />
            </div>
            {['wifi', 'contact_page', 'link', 'location_on'].map((i, k) => (
              <span key={i} className={`chip glass chip-${k}`}><Icon name={i} />{t('hero.chips')[k]}</span>
            ))}
          </div>
        </section>

        <section className="builder" id="tao-qr" aria-labelledby="builder-title">
          <div className="section-head">
            <p className="kicker">{b('kicker')}</p>
            <h2 id="builder-title">{b('title')}</h2>
          </div>
          <div className="builder-grid">
            <div className="panel glass">
              <div className="tabs" role="tablist" aria-label={b('tablist')}>
                {TABS.map(([k, icon], i) => (
                  <button key={k} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls={`pane-${k}`} onClick={() => { setTab(k); blip(600 + i * 80); }}>
                    <Icon name={icon} /><span>{b(`tabs.${k}`)}</span>
                  </button>
                ))}
              </div>

              <div className="pane" role="tabpanel" id={`pane-${tab}`} aria-labelledby={`tab-${tab}`} key={tab}>
                {tab === 'content' && (
                  <>
                    <p className="label">{b('type')}</p>
                    <div className="types">
                      {Object.entries(TYPES).map(([k, ty]) => (
                        <button key={k} type="button" className="type" aria-pressed={type === k} onClick={() => { setType(k); blip(660); }}><Icon name={ty.icon} />{b(`types.${k}`)}</button>
                      ))}
                    </div>
                    <div className="fields">
                      {TYPES[type].fields.map((f) => (
                        <Field key={type + f[0]} field={f} value={fields[type]?.[f[0]]} onChange={(v) => setFields((all) => ({ ...all, [type]: { ...all[type], [f[0]]: v } }))} />
                      ))}
                    </div>
                    {urlWarn && <p className="hint warn" role="status"><Icon name="error" /> {b('urlWarn')}</p>}
                  </>
                )}

                {tab === 'style' && (
                  <>
                    <p className="label">{b('presets')}</p>
                    <div className="presets">
                      {PRESETS.map((p, i) => (
                        <button key={i} type="button" className="preset" onClick={() => { set(p); blip(740 + i * 40); }}>
                          <span dangerouslySetInnerHTML={{ __html: thumb(p, `p${i}`) }} />{b('presetNames')[i]}
                        </button>
                      ))}
                    </div>
                    <p className="label">{b('dots')}</p>
                    <Choice list={DOTS} names={b('dotNames')} value={style.dots} onPick={(dots) => { set({ dots }); blip(700); }} render={(dots) => thumb({ dots }, `d${dots}`)} />
                    <p className="label">{b('eyes')}</p>
                    <Choice list={EYES} names={b('eyeNames')} value={style.eyes} onPick={(eyes) => { set({ eyes }); blip(760); }} render={(eyes) => thumb({ eyes }, `e${eyes}`)} />
                  </>
                )}

                {tab === 'color' && (
                  <>
                    <div className="colors">
                      <ColorField label={b('fg')} value={style.fg} onChange={(fg) => set({ fg })} />
                      <ColorField label={b('fg2')} value={style.fg2} onChange={(fg2) => set({ fg2 })} optional />
                      <ColorField label={b('eye')} value={style.eye} onChange={(eye) => set({ eye })} optional />
                      <ColorField label={b('bg')} value={style.bg} onChange={(bg) => set({ bg, transparent: false })} />
                    </div>
                    {style.fg2 && (
                      <div className="seg" role="radiogroup" aria-label={b('gradient')}>
                        {['linear', 'radial'].map((v) => <button key={v} type="button" role="radio" aria-checked={style.gradient === v} onClick={() => { set({ gradient: v }); blip(640); }}>{b(v)}</button>)}
                      </div>
                    )}
                    <label className="check"><input type="checkbox" checked={style.transparent} onChange={(e) => set({ transparent: e.target.checked })} /> {b('transparent')}</label>
                    <div className={`scan-meter ${ratio >= 4.5 ? 'good' : ratio >= 3 ? 'ok' : 'bad'}`} role="status">
                      <Icon name={ratio >= 4.5 ? 'verified' : ratio >= 3 ? 'info' : 'error'} />
                      <span><b>{b(ratio >= 4.5 ? 'scanGood' : ratio >= 3 ? 'scanOk' : 'scanBad')}</b> · {b('contrast')} {ratio.toFixed(1)}:1 {ratio < 4.5 && b('should')}</span>
                      {ratio < 3 && <button type="button" className="mini text" onClick={() => { set({ bg: '#ffffff', transparent: false, fg: contrast(style.fg, '#ffffff') < 3 ? '#0f0f15' : style.fg }); blip(880); }}>{b('fix')}</button>}
                    </div>
                    <p className="label"><Icon name="auto_awesome" /> {b(logoTone ? 'suggestLogo' : 'suggestCur')}</p>
                    <div className="palettes">
                      {palettes.map((p, i) => (
                        <button key={i} type="button" className="palette" onClick={() => { set({ fg: p.fg, fg2: p.fg2, eye: p.eye, bg: p.bg, transparent: false }); blip(700 + i * 50); }}>
                          <span className="dots">{[p.fg, p.fg2 || p.fg, p.eye || p.fg].map((c, k) => <i key={k} style={{ background: c }} />)}</span>{b('palettes')[i]}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {tab === 'logo' && (
                  <>
                    <div className="seg" role="radiogroup" aria-label={b('logoKind')}>
                      {['none', 'icon', 'text', 'upload'].map((v) => (
                        <button key={v} type="button" role="radio" aria-checked={lg.kind === v} onClick={() => { setLogo({ kind: v }); if (v !== 'upload') setLogoTone(''); blip(620); }}>{b(`logoKinds.${v}`)}</button>
                      ))}
                    </div>
                    {lg.kind === 'icon' && (
                      <div className="icon-grid" role="radiogroup" aria-label={b('logoIcons')}>
                        {Object.keys(LOGO_ICONS).map((k) => (
                          <button key={k} type="button" role="radio" aria-checked={lg.icon === k} aria-label={k} onClick={() => { setLogo({ icon: k }); blip(760); }}>
                            <img alt="" src={makeLogo({ ...lg, kind: 'icon', icon: k })} />
                          </button>
                        ))}
                      </div>
                    )}
                    {lg.kind === 'text' && <div className="fields"><Field field={['logoText', 'logoText', 'HG']} value={lg.text} onChange={(text) => setLogo({ text: text.slice(0, 3) })} /></div>}
                    {(lg.kind === 'icon' || lg.kind === 'text') && (
                      <>
                        <div className="colors" style={{ marginTop: 16 }}>
                          <ColorField label={b('logoColor')} value={lg.color} onChange={(color) => setLogo({ color })} />
                          <ColorField label={b('logoBg')} value={lg.bg} onChange={(bg) => setLogo({ bg })} />
                        </div>
                        <p className="label">{b('logoShape')}</p>
                        <div className="seg wrap" role="radiogroup" aria-label={b('logoShape')}>
                          {LOGO_SHAPES.map((v) => <button key={v} type="button" role="radio" aria-checked={lg.shape === v} onClick={() => { setLogo({ shape: v }); blip(680); }}>{b(`shapes.${v}`)}</button>)}
                        </div>
                        <div><button type="button" className="btn ghost small" onClick={() => { set({ fg: lg.bg, fg2: '', eye: '' }); setLogoTone(lg.bg); blip(880); }}><Icon name="auto_awesome" /> {b('syncLogo')}</button></div>
                      </>
                    )}
                    {lg.kind === 'upload' && (
                      <div className="logo-row">
                        <label className="btn ghost upload"><Icon name="upload" /> {lg.upload ? b('change') : b('upload')}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => onLogo(e.target.files[0])} /></label>
                        {lg.upload && <img src={lg.upload} alt={b('chosen')} className="logo-thumb" />}
                      </div>
                    )}
                    {logo && <p className="hint"><Icon name="shield" /> {b('logoHint')}</p>}
                  </>
                )}

                {tab === 'export' && (
                  <>
                    <p className="label">{b('frame')}</p>
                    <Choice list={FRAMES} names={b('frameNames')} value={style.frame} onPick={(frame) => { set({ frame }); blip(720); }} render={(frame) => thumb({ frame, frameColor: style.frameColor, caption: 'SCAN' }, `f${frame}`)} />
                    {style.frame !== 'none' && (
                      <>
                        <div className="fields two">
                          <Field field={['caption', 'caption', captions[0]]} value={style.caption} onChange={(caption) => set({ caption: caption.slice(0, 40) })} />
                          <ColorField label={b('frameColor')} value={style.frameColor} onChange={(frameColor) => set({ frameColor })} />
                        </div>
                        <div className="suggest">
                          {captions.map((c) => <button key={c} type="button" onClick={() => { set({ caption: c }); blip(800); }}>{c}</button>)}
                          <button type="button" onClick={() => { set({ frameColor: style.fg }); blip(800); }}><Icon name="auto_awesome" /> {b('frameSync')}</button>
                        </div>
                      </>
                    )}
                    <div className="fields two">
                      <label className="field"><span>{b('size')}</span>
                        <select value={style.size} onChange={(e) => set({ size: +e.target.value })}>{[256, 512, 1024, 2048].map((s) => <option key={s} value={s}>{s} × {s} px</option>)}</select>
                      </label>
                      <label className="field"><span>{b('level')} {logo && b('levelLocked')}</span>
                        <select value={logo ? 'H' : style.level} disabled={!!logo} onChange={(e) => set({ level: e.target.value })}>
                          {['L', 'M', 'Q', 'H'].map((l) => <option key={l} value={l}>{b(`levels.${l}`)}</option>)}
                        </select>
                      </label>
                    </div>
                    <div className="fields">
                      <label className="field"><span>{b('margin', { n: style.margin })}</span>
                        <input type="range" min="0" max="8" value={style.margin} onChange={(e) => set({ margin: +e.target.value })} />
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>

            <aside className="preview glass" aria-label={b('preview')}>
              <div className={`qr-stage${style.transparent ? ' checker' : ''}`}>
                {result.svg
                  ? <div key={pulse} className="qr-img pop" dangerouslySetInnerHTML={{ __html: result.svg }} />
                  : <div className="qr-empty"><Icon name="qr_code_2" /><p>{result.error}</p></div>}
              </div>
              <p className="preview-data" title={data}>{data || '—'}</p>
              <div className="actions">
                <button type="button" className="btn primary" disabled={!result.svg} onClick={() => download('png')}><Icon name="download" /> PNG</button>
                <button type="button" className="btn ghost" disabled={!result.svg} onClick={() => download('svg')}><Icon name="download" /> SVG</button>
                <button type="button" className="btn ghost" disabled={!result.svg} onClick={copyImage} aria-label={b('copy')}><Icon name="content_copy" /></button>
              </div>
              <p className="hint center"><Icon name="verified" /> {b('scanTip')}</p>
            </aside>
          </div>
        </section>

        <LazySection id="tim-hieu"><Learn /></LazySection>
        <LazySection id="api"><ApiDocs query={apiQuery} hasLogo={!!logo} notify={notify} onApply={applyRecipe} /></LazySection>
      </main>

      <Footer notify={notify} />
      <div className={`toast glass${toast ? ' show' : ''}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
