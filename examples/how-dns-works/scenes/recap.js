import { h, svgLayer, arrow, drawArrow, pop, reveal } from '/__runtime/helpers.js';

export default function ({ el, tl, cue }) {
  const steps = ['Ask a resolver', 'Follow referrals', 'Cache the answer'].map((t, i) =>
    h('div', { class: 'card abs', style: { left: 160 + i * 580 + 'px', top: '380px', width: '440px', textAlign: 'center' } },
      h('div', { class: 'h1', style: { color: `var(--${['accent', 'accent2', 'accent3'][i]})` } }, String(i + 1)),
      h('div', { class: 'h3' }, t)));
  el.append(...steps);
  const layer = svgLayer(el);
  const arrows = [0, 1].map((i) => arrow(layer, { from: [620 + i * 580, 500], to: [720 + i * 580, 500], width: 6, head: 18, color: 'var(--muted)' }));
  const end = h('div', { class: 'h1 abs', style: { left: 0, right: 0, top: '760px', textAlign: 'center' } }, 'That’s DNS.');
  el.appendChild(end);

  pop(tl, steps[0], { at: cue('ask a resolver') });
  drawArrow(tl, arrows[0], { at: cue('follow the referrals') - 0.3, duration: 0.3 });
  pop(tl, steps[1], { at: cue('follow the referrals') });
  drawArrow(tl, arrows[1], { at: cue('cache the answer') - 0.3, duration: 0.3 });
  pop(tl, steps[2], { at: cue('cache the answer') });
  reveal(tl, end, { at: cue("That's DNS"), y: 0, scale: 0.9 });
}
