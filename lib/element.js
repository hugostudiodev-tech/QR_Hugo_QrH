// <qr-hugo> Web Component — works in plain HTML, Vue, Angular, Svelte, Solid, Astro…
import { DEFAULTS, renderSvg } from './index.js';

const ATTRS = Object.keys(DEFAULTS).map((k) => k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
let uid = 0;

export class QrHugoElement extends HTMLElement {
  static observedAttributes = ATTRS;
  #id = `qh${uid++}`;
  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  render() {
    const o = { ...DEFAULTS };
    for (const a of ATTRS) {
      const v = this.getAttribute(a);
      if (v == null) continue;
      const k = a.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      o[k] = typeof DEFAULTS[k] === 'number' ? Number(v) : typeof DEFAULTS[k] === 'boolean' ? v !== 'false' : v;
    }
    try { this.innerHTML = renderSvg(o, this.#id); this.querySelector('svg').style.cssText = 'width:100%;height:auto;display:block'; }
    catch (e) { this.textContent = e.message; }
  }
}
if (typeof customElements !== 'undefined' && !customElements.get('qr-hugo')) customElements.define('qr-hugo', QrHugoElement);
