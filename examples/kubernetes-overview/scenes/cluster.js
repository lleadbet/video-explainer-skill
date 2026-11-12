import { h, svgLayer, arrow, drawArrow, reveal, pop } from '/__runtime/helpers.js';
import { pod, node } from './_shared.js';

export default function ({ el, tl, gsap, cue }) {
  const outline = h('div', { class: 'abs', style: { left: '96px', top: '170px', width: '1728px', height: '820px', border: '3px dashed var(--surface2)', borderRadius: '32px' } });
  const clusterLbl = h('div', { class: 'label abs', style: { left: '136px', top: '150px', background: 'var(--bg)', padding: '0 12px' } }, 'Cluster');

  const comps = ['API server', 'Scheduler', 'Controllers', 'etcd'].map((t) => h('div', { class: 'pill', style: { fontSize: '28px', textAlign: 'center' } }, t));
  const cp = h('div', { class: 'card abs stack', style: { left: '160px', top: '250px', width: '470px', height: '660px', gap: '22px', borderColor: 'var(--accent4)' } },
    h('div', { class: 'h3' }, 'Control plane'), h('div', { class: 'small muted' }, 'makes decisions'), ...comps);

  const pods = [];
  const nodes = [0, 1, 2].map((i) => {
    const ps = Array.from({ length: [3, 2, 3][i] }, () => pod());
    pods.push(...ps);
    return node(`worker node ${i + 1}`, { width: 580, pods: ps });
  });
  const nodeCol = h('div', { class: 'abs stack', style: { left: '820px', top: '250px', gap: '45px' } }, ...nodes);
  const nodesLbl = h('div', { class: 'small muted abs', style: { left: '820px', top: '205px' } }, 'run your applications');
  el.append(outline, clusterLbl, cp, nodeCol, nodesLbl);

  const layer = svgLayer(el);
  const arrows = [345, 580, 815].map((y) => arrow(layer, { from: [640, 580], to: [805, y], curve: 0, color: 'var(--accent4)', width: 4, head: 16 }));

  const callout = h('div', { class: 'card abs', style: { left: '1460px', top: '470px', width: '330px', borderColor: 'var(--accent)', padding: '24px 30px' } },
    h('div', { class: 'h3 accent' }, 'Pod'),
    h('div', { class: 'small' }, 'one or more containers, scheduled together'));
  el.appendChild(callout);

  reveal(tl, [outline, clusterLbl], { at: 0.2, y: 0 });
  pop(tl, cp, { at: cue('control plane') });
  reveal(tl, comps, { at: cue('makes decisions'), y: 16, stagger: 0.1 });
  reveal(tl, nodes, { at: cue('worker nodes'), x: 40, y: 0, stagger: 0.12 });
  arrows.forEach((a, i) => drawArrow(tl, a, { at: cue('worker nodes') + 0.2 + i * 0.12, duration: 0.4 }));
  reveal(tl, nodesLbl, { at: cue('run your applications'), y: 10 });
  pop(tl, pods, { at: cue('run your applications') + 0.2, stagger: 0.07 });
  const focus = pods[3];
  tl.to(pods.filter((p) => p !== focus), { opacity: 0.3, duration: 0.4 }, cue('inside pods'));
  tl.to(focus, { scale: 1.25, duration: 0.5, ease: 'back.out(2)' }, cue('inside pods'));
  tl.to(focus.querySelectorAll('.ctr'), { backgroundColor: 'var(--accent3)', duration: 0.3, stagger: 0.15 }, cue('inside pods') + 0.5);
  reveal(tl, callout, { at: cue('the smallest unit'), x: 30, y: 0 });
}
