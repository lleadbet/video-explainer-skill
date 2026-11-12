import { h, reveal, splitReveal } from '/__runtime/helpers.js';

export default function ({ el, tl }) {
  const title = h('div', { class: 'h1' }, 'Your headline here');
  const sub = h('div', { class: 'h3 muted' }, 'A short subtitle that sets up the question');
  const accent = h('div', { style: { width: '160px', height: '10px', borderRadius: '5px', background: 'var(--accent)' } });
  el.append(h('div', { class: 'center' }, h('div', { class: 'stack', style: { alignItems: 'center' } }, accent, title, sub)));

  tl.from(accent, { scaleX: 0, duration: 0.6, ease: 'power3.out' }, 0.3);
  splitReveal(tl, title, { at: 0.5 });
  reveal(tl, sub, { at: '+=0.2' });
}
