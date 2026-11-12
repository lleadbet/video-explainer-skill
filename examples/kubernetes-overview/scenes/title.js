import { h, reveal, splitReveal } from '/__runtime/helpers.js';
import { container } from './_shared.js';

const COLORS = ['var(--accent)', 'var(--accent)', 'var(--accent)', 'var(--accent3)', 'var(--accent4)'];

export default function ({ el, tl, random, cue }) {
  const kicker = h('div', { class: 'label' }, 'Container orchestration');
  const title = h('div', { class: 'display' }, 'Kubernetes');
  const sub = h('div', { class: 'h3 muted' }, 'The one-minute overview');
  el.append(h('div', { class: 'abs stack', style: { left: 0, right: 0, top: '170px', alignItems: 'center', gap: '24px' } }, kicker, title, sub));

  const machines = [], boxes = [], labels = [];
  const row = h('div', { class: 'abs row', style: { left: '128px', right: '128px', top: '600px', gap: '40px', alignItems: 'flex-start' } });
  for (let m = 0; m < 4; m++) {
    const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' } });
    for (let i = 0; i < 18; i++) {
      const b = container(COLORS[Math.floor(random() * COLORS.length)], 44);
      grid.appendChild(b);
      boxes.push(b);
    }
    const machine = h('div', { style: { flex: 1, padding: '28px', border: '3px solid var(--muted)', borderRadius: '24px', display: 'grid', placeItems: 'center' } }, grid);
    const label = h('div', { class: 'label', style: { textAlign: 'center', marginTop: '16px' } }, `machine ${m + 1}`);
    row.appendChild(h('div', { style: { flex: 1 } }, machine, label));
    machines.push(machine); labels.push(label);
  }
  el.appendChild(row);

  reveal(tl, kicker, { at: 0.3, y: 20 });
  splitReveal(tl, title, { at: 0.5, by: 'chars', stagger: 0.04 });
  reveal(tl, sub, { at: 1.3 });
  tl.from(boxes, { autoAlpha: 0, scale: 0, duration: 0.35, ease: 'back.out(2)', stagger: { each: 0.012, from: 'random' } }, cue('hundreds'));
  tl.fromTo(machines, { borderColor: 'rgba(0,0,0,0)' }, { borderColor: 'var(--muted)', duration: 0.5, stagger: 0.1, immediateRender: true }, cue('many machines'));
  reveal(tl, labels, { at: cue('many machines') + 0.1, y: 10, stagger: 0.1 });
}
