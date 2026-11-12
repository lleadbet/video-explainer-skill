import { h, reveal, splitReveal, hide } from '/__runtime/helpers.js';

export default function ({ el, tl, cue }) {
  const kicker = h('div', { class: 'label' }, 'Networking basics');
  const title = h('div', { class: 'display' }, 'How DNS works');
  const sub = h('div', { class: 'h3 muted' }, 'From a name to an address in a few milliseconds');
  const question = h('div', { class: 'h1 accent', style: { position: 'absolute', left: 0, right: 0, top: '760px', textAlign: 'center' } }, 'Where is it?');
  el.append(
    h('div', { class: 'center' }, h('div', { class: 'stack', style: { alignItems: 'center', gap: '28px' } }, kicker, title, sub)),
    question,
  );

  reveal(tl, kicker, { at: 0.3, y: 20 });
  splitReveal(tl, title, { at: 0.5, by: 'chars', stagger: 0.03 });
  reveal(tl, sub, { at: 1.4 });
  reveal(tl, question, { at: cue('where is it'), y: 0, scale: 0.8 });
}
