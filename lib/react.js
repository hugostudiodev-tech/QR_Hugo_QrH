// React component: <QrHugo data="https://…" dots="rounded" fg="#0a84ff" />
import { createElement, useId, useMemo } from 'react';
import { DEFAULTS, renderSvg } from './index.js';

export function QrHugo({ className, style, ...options }) {
  const id = useId().replace(/:/g, '');
  const svg = useMemo(() => renderSvg({ ...DEFAULTS, ...options }, id), [JSON.stringify(options), id]);
  return createElement('div', { className, style, role: 'img', dangerouslySetInnerHTML: { __html: svg } });
}
export default QrHugo;
