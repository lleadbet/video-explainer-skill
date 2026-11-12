import { h, pop, reveal } from '/__runtime/helpers.js';

export default function ({ el, tl, cue }) {
  const items = [
    ['Nodes run pods', 'accent'],
    ['You declare the state', 'accent4'],
    ['Kubernetes keeps it that way', 'accent3'],
  ];
  const cards = items.map(([t, c], i) => h('div', { class: 'card', style: { flex: 1, borderColor: `var(--${c})`, textAlign: 'center', padding: '48px 36px' } },
    h('div', { class: 'h1', style: { color: `var(--${c})` } }, String(i + 1)),
    h('div', { class: 'h3' }, t)));
  const heading = h('div', { class: 'label' }, 'Recap');
  el.append(h('div', { class: 'safe stack', style: { justifyContent: 'center', gap: '48px' } },
    heading, h('div', { class: 'row', style: { alignItems: 'stretch' } }, ...cards)));

  reveal(tl, heading, { at: 0.1, y: 10 });
  pop(tl, cards[0], { at: cue('Nodes run pods') });
  pop(tl, cards[1], { at: cue('you declare') });
  pop(tl, cards[2], { at: cue('Kubernetes keeps') });
}
