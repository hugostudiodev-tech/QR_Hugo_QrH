import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { renderSvg, DEFAULTS } from '../lib/index.js';
import { blip, Icon } from './App.jsx';

const M = 4; // quiet zone used in the anatomy figure

function regions(n) {
  const eye = (c, r) => ({ x: c + M - 0.4, y: r + M - 0.4, w: 7.8, h: 7.8 });
  return {
    finder: ['center_focus_strong', [eye(0, 0), eye(n - 7, 0), eye(0, n - 7)]],
    timing: ['more_horiz', [{ x: 8 + M, y: 6 + M, w: n - 16, h: 1 }, { x: 6 + M, y: 8 + M, w: 1, h: n - 16 }]],
    align: ['filter_center_focus', n > 21 ? [{ x: n - 9 + M, y: n - 9 + M, w: 5, h: 5 }] : []],
    data: ['grid_view', [{ x: 9 + M, y: 9 + M, w: n - 9, h: n - 9 }]],
    quiet: ['crop_free', [{ x: 0, y: 0, w: n + M * 2, h: M }, { x: 0, y: n + M, w: n + M * 2, h: M }, { x: 0, y: M, w: M, h: n }, { x: n + M, y: M, w: M, h: n }]],
  };
}

const BENEFIT_ICONS = ['bolt', 'link', 'shield', 'devices', 'eco', 'palette'];
const USE_ICONS = ['restaurant', 'storefront', 'inventory_2', 'badge', 'confirmation_number', 'campaign', 'school', 'home_work'];
const TIP_ICONS = ['straighten', 'contrast', 'crop_free', 'print', 'short_text', 'phone_iphone'];
const LEVELS = [['L', 7], ['M', 15], ['Q', 25], ['H', 30]];

function Head({ k, id, lead }) {
  const { t } = useTranslation();
  return (
    <div className="section-head">
      <p className="kicker">{t(`learn.${k}.kicker`)}</p>
      <h2 id={id}>{t(`learn.${k}.title`)}</h2>
      {lead && <p className="lead">{t(`learn.${k}.lead`)}</p>}
    </div>
  );
}

export default function Learn() {
  const { t } = useTranslation();
  const [active, setActive] = useState('finder');
  const { svg, parts, N } = useMemo(() => {
    const out = renderSvg({ ...DEFAULTS, data: 'https://qr.hugowishpax.studio/learn', margin: M, fg: '#1c1c1e' }, 'anat');
    const vb = +out.match(/viewBox="0 0 (\d+)/)[1];
    return { svg: out, parts: regions(vb - M * 2), N: vb };
  }, []);
  const w = (k) => t(`learn.what.${k}`);

  return (
    <div className="learn">
      <section className="section" aria-labelledby="what-title">
        <Head k="what" id="what-title" lead />
        <div className="anatomy glass">
          <div className="anatomy-fig">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
            <svg className="anatomy-overlay" viewBox={`0 0 ${N} ${N}`} aria-hidden="true">
              {Object.entries(parts).map(([k, [, rects]]) => rects.map((r, i) => (
                <rect key={k + i} className={active === k ? 'on' : ''} x={r.x} y={r.y} width={r.w} height={r.h} rx=".6" />
              )))}
            </svg>
          </div>
          <div className="anatomy-list" role="tablist" aria-label={w('anatomy')}>
            {Object.entries(parts).map(([k, [icon]]) => {
              const [label, text] = t(`learn.what.parts.${k}`);
              return (
                <button key={k} type="button" role="tab" aria-selected={active === k} onMouseEnter={() => setActive(k)} onFocus={() => setActive(k)} onClick={() => { setActive(k); blip(620); }}>
                  <Icon name={icon} /><span><b>{label}</b><small>{text}</small></span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="levels">
          <h3>{w('levelsTitle')}</h3>
          <p>{w('levelsText')}</p>
          <div className="level-bars">
            {LEVELS.map(([l, pct], i) => (
              <div key={l} className="level reveal">
                <b>{l}</b>
                <div className="bar"><span style={{ '--w': `${(pct / 30) * 100}%` }} /></div>
                <span className="pct">{pct}%</span>
                <small>{w('levels')[i]}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="benefit-title">
        <Head k="benefits" id="benefit-title" />
        <div className="cards">
          {t('learn.benefits.items').map(([title, d], i) => (
            <article key={title} className="card glass reveal"><span className="card-icon"><Icon name={BENEFIT_ICONS[i]} /></span><h3>{title}</h3><p>{d}</p></article>
          ))}
        </div>
      </section>

      <section className="section" id="ung-dung" aria-labelledby="use-title">
        <Head k="uses" id="use-title" lead />
        <div className="uses">
          {t('learn.uses.items').map(([title, d, tag], i) => (
            <article key={title} className="use glass reveal" tabIndex={0}>
              <Icon name={USE_ICONS[i]} className="use-icon" />
              <h3>{title}</h3><p>{d}</p><span className="tag">{tag}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="meo" aria-labelledby="tip-title">
        <Head k="tips" id="tip-title" />
        <ol className="tips">
          {t('learn.tips.items').map(([title, d], k) => (
            <li key={title} className="reveal"><span className="tip-no">{String(k + 1).padStart(2, '0')}</span><Icon name={TIP_ICONS[k]} /><div><h3>{title}</h3><p>{d}</p></div></li>
          ))}
        </ol>
      </section>

      <section className="section" id="hoi-dap" aria-labelledby="faq-title">
        <Head k="faq" id="faq-title" />
        <div className="faq">
          {t('learn.faq.items').map(([q, a]) => (
            <details key={q} className="glass" onToggle={(e) => e.currentTarget.open && blip(560)}>
              <summary>{q}<Icon name="expand_more" /></summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
