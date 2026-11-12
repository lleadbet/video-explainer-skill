import { h, svg, svgLayer, arrow, drawArrow, reveal, pop, moveAlong } from '/__runtime/helpers.js';
import { pod } from './_shared.js';

const POD_Y = [330, 560, 790]; // pod centres
export default function ({ el, tl, gsap, cue, voice }) {
  const heading = h('div', { class: 'h2 abs', style: { left: '128px', top: '96px' } }, 'Services: one stable address');

  const pods = POD_Y.map((y, i) => {
    const p = pod({ label: `web-${i + 1}` });
    Object.assign(p.style, { position: 'absolute', left: '1560px', top: y - 46 + 'px' });
    return p;
  });
  const old = pod({ label: 'web-0', color: 'var(--muted)' });
  Object.assign(old.style, { position: 'absolute', left: '1560px', top: POD_Y[2] - 46 + 'px' });

  const service = h('div', { class: 'card abs', style: { left: '820px', top: '470px', width: '460px', textAlign: 'center', borderColor: 'var(--accent)' } },
    h('div', { class: 'h3' }, 'Service'), h('div', { class: 'small mono accent', style: { marginTop: '8px' } }, 'web.default.svc'));
  const users = h('div', { class: 'card abs', style: { left: '128px', top: '490px', width: '300px', textAlign: 'center' } }, h('div', { class: 'h3' }, 'Users'));
  el.append(heading, old, ...pods, service, users);

  const layer = svgLayer(el);
  const inbound = arrow(layer, { from: [440, 560], to: [805, 560], color: 'var(--muted)', width: 4, head: 16 });
  const outs = POD_Y.map((y) => arrow(layer, { from: [1290, 560], to: [1545, y], color: 'var(--muted)', width: 4, head: 16 }));

  // "Pods come and go": web-3 replaces web-0
  const churn = cue('come and go');
  pop(tl, [pods[0], pods[1], old], { at: 0.2, stagger: 0.1 });
  tl.set(pods[2], { autoAlpha: 0 }, 0);
  tl.to(old, { autoAlpha: 0, scale: 0.6, duration: 0.4 }, churn + 0.2);
  tl.set(pods[2], { autoAlpha: 1 }, churn + 0.5);
  tl.from(pods[2], { scale: 0.4, duration: 0.4, ease: 'back.out(2)' }, churn + 0.5);
  reveal(tl, heading, { at: cue('a service') });
  pop(tl, service, { at: cue('a service') + 0.3 });
  const addr = cue('one stable address');
  reveal(tl, users, { at: addr, x: -30, y: 0 });
  drawArrow(tl, inbound, { at: addr + 0.4, duration: 0.4 });
  outs.forEach((a, i) => drawArrow(tl, a, { at: addr + 0.8 + i * 0.1, duration: 0.4 }));

  // "spreads traffic across whichever pods are healthy": round-robin requests until the scene ends.
  const UNHEALTHY_AT = cue('healthy');
  const trafficEnd = voice.end + 0.3;
  let target = 0;
  for (let k = 0, t = cue('spreads traffic'); t < trafficEnd; k++, t += 0.45) {
    let dest = target % 3;
    if (t + 0.45 >= UNHEALTHY_AT && dest === 1) dest = (++target) % 3; // skip the unhealthy pod
    target++;
    const dot = svg('circle', { r: 12, fill: 'var(--accent3)' });
    layer.appendChild(dot);
    tl.set(dot, { autoAlpha: 0 }, 0);
    tl.set(dot, { autoAlpha: 1 }, t);
    moveAlong(tl, dot, inbound.path, { at: t, duration: 0.45, ease: 'none' });
    moveAlong(tl, dot, outs[dest].path, { at: t + 0.45, duration: 0.4, ease: 'none' });
    tl.set(dot, { autoAlpha: 0 }, t + 0.85);
  }
  // "healthy": web-2 fails its health check
  tl.to(pods[1], { borderColor: 'var(--danger)', opacity: 0.5, duration: 0.3 }, UNHEALTHY_AT);
  tl.to(outs[1].g, { opacity: 0.15, duration: 0.3 }, UNHEALTHY_AT);
  const tag = h('div', { class: 'pill abs', style: { left: '1530px', top: POD_Y[1] + 70 + 'px', background: 'var(--danger)', color: '#10131c', fontWeight: 700, fontSize: '24px' } }, 'unhealthy');
  el.appendChild(tag);
  pop(tl, tag, { at: UNHEALTHY_AT });
}
