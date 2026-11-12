import { h, reveal, pop } from '/__runtime/helpers.js';

const POINTS = [
  { n: '1', title: 'This', body: 'The first idea, in a few words.' },
  { n: '2', title: 'That', body: 'The second idea builds on it.' },
  { n: '3', title: 'Together', body: 'Why the combination matters.' },
];

export default function ({ el, tl }) {
  const heading = h('div', { class: 'h2' }, 'Three things to know');
  const cards = POINTS.map((p) =>
    h('div', { class: 'card stack', style: { flex: 1, gap: '20px' } },
      h('div', { class: 'h1 accent' }, p.n),
      h('div', { class: 'h3' }, p.title),
      h('div', { class: 'body muted' }, p.body)));
  el.append(h('div', { class: 'safe stack', style: { gap: '72px', justifyContent: 'center' } },
    heading, h('div', { class: 'row', style: { alignItems: 'stretch' } }, ...cards)));

  reveal(tl, heading, { at: 0.3 });
  // Time each card to its sentence in the narration.
  pop(tl, cards[0], { at: 1.8 });
  pop(tl, cards[1], { at: 3.3 });
  pop(tl, cards[2], { at: 4.8 });
  tl.to(cards[2], { borderColor: 'var(--accent)', scale: 1.04, duration: 0.5, ease: 'power2.out' }, 6.2);
  tl.to(cards.slice(0, 2), { opacity: 0.45, duration: 0.5 }, '<');
}
