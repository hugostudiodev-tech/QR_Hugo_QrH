import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.js';

// Hand-written translations. Add a language = add src/locales/<code>.js + one line here.
export const LANGS = { vi: 'Tiếng Việt', en: 'English' };
const loaders = { en: () => import('./locales/en.js') };

// Every other language is served through Google's translate proxy (works on the deployed domain only).
export const MT_LANGS = 'af sq am ar hy az eu be bn bs bg ca ceb zh-CN zh-TW co hr cs da nl eo et fi fr fy gl ka de el gu ht ha haw he hi hmn hu is ig id ga it ja jv kn kk km rw ko ku ky lo la lv lt lb mk mg ms ml mt mi mr mn my ne no ny or ps fa pl pt pa ro ru sm gd sr st sn sd si sk sl so es su sw sv tl tg ta tt te th tr tk uk ur ug uz cy xh yi yo zu'.split(' ');

export function machineTranslateUrl(code) {
  const host = location.hostname.replace(/-/g, '--').replace(/\./g, '-');
  return `https://${host}.translate.goog${location.pathname}?_x_tr_sl=${i18n.language}&_x_tr_tl=${code}&_x_tr_hl=${code}`;
}

export function initialLang() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q && LANGS[q]) return q;
    const saved = localStorage.getItem('qr-lang');
    if (saved && LANGS[saved]) return saved;
  } catch { /* storage blocked */ }
  return (navigator.language || '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export async function setLang(lng) {
  if (!LANGS[lng]) return;
  if (!i18n.hasResourceBundle(lng, 'translation')) i18n.addResourceBundle(lng, 'translation', (await loaders[lng]()).default);
  await i18n.changeLanguage(lng);
  document.documentElement.lang = lng;
  document.title = i18n.t('meta.title');
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('meta.description'));
  try { localStorage.setItem('qr-lang', lng); } catch { /* storage blocked */ }
}

i18n.use(initReactI18next).init({
  resources: { vi: { translation: vi } },
  lng: 'vi',
  fallbackLng: 'vi',
  returnObjects: true,
  interpolation: { escapeValue: false },
});

export default i18n;
