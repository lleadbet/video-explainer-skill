import { h, barChart, growBars, reveal, marker } from '/__runtime/helpers.js';

export default function ({ el, tl, cue }) {
  const heading = h('div', { class: 'h2' }, 'Caching makes repeat lookups ', h('span', {}, 'nearly free'));
  const chart = barChart([
    { label: 'Full lookup', value: 120, color: 'var(--accent2)' },
    { label: 'Resolver cache', value: 18, color: 'var(--accent)' },
    { label: 'Laptop cache', value: 1, color: 'var(--accent3)' },
  ], { width: 1100, height: 560, unit: ' ms', max: 120 });
  const note = h('div', { class: 'card stack', style: { width: '460px', gap: '16px' } },
    h('div', { class: 'label' }, 'TTL'),
    h('div', { class: 'body' }, 'Each record says how long it may be cached: its ', h('b', {}, 'time to live'), '.'));
  el.append(h('div', { class: 'safe stack', style: { gap: '64px' } },
    heading,
    h('div', { class: 'row', style: { alignItems: 'flex-end', gap: '96px' } }, chart.el, note)));

  reveal(tl, heading, { at: 0.3 });
  growBars(tl, chart, { at: cue('would be slow'), stagger: 0.5 });
  reveal(tl, note, { at: cue('time to live'), x: 40, y: 0 });
  marker(tl, heading.lastChild, { at: cue('Repeat lookups'), color: 'var(--accent3)' });
}
