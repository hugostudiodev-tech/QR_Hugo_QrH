import { lazy, Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { blip, Icon } from './App.jsx';

export const LOGIN_URL = 'https://www.hugowishpax.studio/login?redirect=%2Fmember%2Futilities%2Fqrhugo';
const ApiDocs = lazy(() => import('./ApiDocs.jsx'));
const KEY_RE = /^HS-[A-Z0-9]{3,32}-[A-Za-z0-9_-]{32}$/;

// The docs + library guide are only downloaded after the server accepts the key.
export default function ApiGate(props) {
  const { t } = useTranslation();
  const a = (k) => t(`api.${k}`);
  const [key, setKey] = useState('');
  const [state, setState] = useState('locked'); // locked | checking | open | bad
  const [info, setInfo] = useState(null);
  const [popup, setPopup] = useState(false);

  const check = async (k) => {
    if (!KEY_RE.test(k)) { setState('bad'); blip(220); return; }
    setState('checking');
    try {
      const res = await fetch('/api/key', { headers: { Authorization: `Bearer ${k}` }, cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      setInfo(body); setState('open'); blip(880);
      try { sessionStorage.setItem('qr-key', k); } catch { /* storage blocked */ }
    } catch (e) { setInfo({ error: e.message }); setState('bad'); blip(220); }
  };
  useEffect(() => { try { const k = sessionStorage.getItem('qr-key'); if (k) { setKey(k); check(k); } } catch { /* storage blocked */ } }, []);

  return (
    <section className="section api" aria-labelledby="api-title">
      <div className="section-head">
        <p className="kicker">{a('kicker')}</p>
        <h2 id="api-title">{a('title')}</h2>
        <p className="lead">{a('lead')}</p>
      </div>
      <div className="key-card glass">
        <span className="card-icon"><Icon name={state === 'open' ? 'lock_open' : 'key'} /></span>
        <div>
          <h3>{a('key.title')}</h3>
          <p>{a('key.text')}</p>
          <ul className="key-limits" aria-label={a('key.limits')}>{a('key.limitItems').map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <button type="button" className="btn primary" onClick={() => { setPopup(true); blip(700); }}><Icon name="key" /> {a('key.btn')}</button>
      </div>
      {state !== 'open' ? (
        <form className="key-form glass" onSubmit={(e) => { e.preventDefault(); check(key.trim()); }}>
          <Icon name="lock" />
          <label className="field">
            <span>{a('key.unlock')}</span>
            <input type="password" autoComplete="off" spellCheck="false" value={key} placeholder="HS-…" onChange={(e) => { setKey(e.target.value); if (state === 'bad') setState('locked'); }} />
          </label>
          <button type="submit" className="btn primary" disabled={state === 'checking' || !key}>{a(state === 'checking' ? 'key.checking' : 'key.open')}</button>
          {state === 'bad' && <p className="hint warn" role="alert"><Icon name="error" /> {info?.error || a('key.invalid')}</p>}
        </form>
      ) : (
        <>
          <p className="hint center"><Icon name="verified" /> {a('key.valid')} {new Date(info.periodEnd).toLocaleDateString()} · {info.used}/{info.limits?.perPeriod}</p>
          <Suspense fallback={<div className="sk sk-card" />}><ApiDocs {...props} /></Suspense>
        </>
      )}
      {popup && (
        <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && setPopup(false)} onKeyDown={(e) => e.key === 'Escape' && setPopup(false)}>
          <div className="modal glass" role="dialog" aria-modal="true" aria-labelledby="key-modal-title">
            <button type="button" className="icon-btn modal-close" onClick={() => setPopup(false)} aria-label={t('builder.remove')} autoFocus><Icon name="close" /></button>
            <span className="card-icon"><Icon name="key" /></span>
            <h3 id="key-modal-title">{a('key.popTitle')}</h3>
            <p>{a('key.popText')}</p>
            <ol className="modal-steps">{a('key.popSteps').map((x) => <li key={x}>{x}</li>)}</ol>
            <a className="btn primary" href={LOGIN_URL} target="_blank" rel="noopener" onClick={() => { setPopup(false); blip(880); setTimeout(() => document.querySelector('.key-form input')?.focus(), 300); }}><Icon name="login" /> {a('key.login')}</a>
          </div>
        </div>
      )}
    </section>
  );
}
