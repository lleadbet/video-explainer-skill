import { h, svg, svgLayer, arrow, drawArrow, reveal, pop, hide, moveAlong } from '/__runtime/helpers.js';

// Node centres in stage pixels.
const N = {
  laptop:   { x: 260,  y: 640, title: 'Your laptop', sub: 'asks: example.com?' },
  resolver: { x: 820,  y: 640, title: 'Resolver', sub: 'your ISP or 1.1.1.1' },
  root:     { x: 1540, y: 330, title: 'Root server', sub: '"."' },
  tld:      { x: 1540, y: 620, title: '.com server', sub: 'top-level domain' },
  auth:     { x: 1540, y: 910, title: 'Authoritative', sub: 'example.com’s own' },
};

export default function ({ el, tl, gsap, cue }) {
  const layer = svgLayer(el);
  const nodes = {};
  for (const [k, n] of Object.entries(N)) {
    const node = h('div', { class: 'card abs', style: { left: n.x + 'px', top: n.y + 'px', width: '380px', textAlign: 'center', padding: '26px 30px' } },
      h('div', { class: 'h3' }, n.title),
      h('div', { class: 'small muted', style: { marginTop: '6px' } }, n.sub));
    // Centre on (x, y). Use xPercent/yPercent, not a CSS transform, so GSAP scale tweens don't clobber it.
    gsap.set(node, { xPercent: -50, yPercent: -50 });
    el.appendChild(node);
    nodes[k] = node;
  }

  // Edge points (right side of laptop/resolver, left side of servers).
  const R = (k) => [N[k].x + 200, N[k].y];
  const L = (k) => [N[k].x - 200, N[k].y];
  const req = (from, to, curve) => arrow(layer, { from, to, curve, color: 'var(--accent)', width: 6 });
  // Same curve value with from/to swapped bows to the other side, so the return trip doesn't overlap.
  const back = (from, to, curve, color) => arrow(layer, { from, to, curve, color, width: 6, dash: '2 14' });

  const a1 = req(R('laptop'), L('resolver'), -60);
  const toRoot = req(R('resolver'), L('root'), -40), fromRoot = back(L('root'), R('resolver'), -40, 'var(--accent2)');
  const toTld = req(R('resolver'), L('tld'), -30), fromTld = back(L('tld'), R('resolver'), -30, 'var(--accent2)');
  const toAuth = req(R('resolver'), L('auth'), 40), fromAuth = back(L('auth'), R('resolver'), 40, 'var(--accent3)');
  const a2 = back(L('resolver'), R('laptop'), -60, 'var(--accent3)');

  const caption = h('div', { class: 'h2 abs', style: { left: '128px', top: '96px', width: '1100px' } });
  el.appendChild(caption);
  const step = (text, at) => {
    tl.set(caption, { textContent: text }, at);
    tl.fromTo(caption, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, at);
  };

  const packet = (color) => {
    const g = svg('circle', { r: 14, fill: color, stroke: 'var(--bg)', 'stroke-width': 4 });
    layer.appendChild(g);
    tl.set(g, { autoAlpha: 0 }, 0);
    return g;
  };
  const trip = (a, color, at, dur = 0.9) => {
    drawArrow(tl, a, { at, duration: 0.5 });
    const p = packet(color);
    tl.set(p, { autoAlpha: 1 }, at);
    moveAlong(tl, p, a.path, { at, duration: dur });
    tl.to(p, { autoAlpha: 0, duration: 0.15 }, '>');
  };
  const flash = (node, color, at) =>
    tl.fromTo(node, { borderColor: 'var(--surface2)' }, { borderColor: color, duration: 0.25, yoyo: true, repeat: 1 }, at);

  pop(tl, [nodes.laptop, nodes.resolver], { at: 0.2, stagger: 0.15 });
  step('1. Ask a resolver', 0.4);
  trip(a1, 'var(--accent)', cue('to a resolver'));
  flash(nodes.resolver, 'var(--accent)', cue('to a resolver') + 0.9);

  const asks = cue('asks a root server');
  pop(tl, [nodes.root, nodes.tld, nodes.auth], { at: asks - 0.4, stagger: 0.12 });
  step('2. Follow the referrals', asks);
  trip(toRoot, 'var(--accent)', cue('root server'));
  trip(fromRoot, 'var(--accent2)', cue('points it to the dot-com'));
  trip(toTld, 'var(--accent)', cue('dot-com servers') + 0.3);
  trip(fromTld, 'var(--accent2)', cue('point it to the domain'));
  trip(toAuth, 'var(--accent)', cue('authoritative server'));
  flash(nodes.auth, 'var(--accent3)', cue('authoritative server') + 0.9);

  const answerAt = cue('That server has');
  step('3. Get the answer', answerAt);
  trip(fromAuth, 'var(--accent3)', answerAt + 0.2);
  trip(a2, 'var(--accent3)', answerAt + 1.4);
  const answer = h('div', { class: 'pill abs mono', style: { left: N.laptop.x + 'px', top: N.laptop.y + 110 + 'px', background: 'var(--accent3)', color: '#0b1a12' } }, '93.184.216.34');
  gsap.set(answer, { xPercent: -50 });
  el.appendChild(answer);
  pop(tl, answer, { at: answerAt + 2.3 });

  const legend = h('div', { class: 'row small abs', style: { left: '128px', top: '960px', gap: '40px' } },
    ...[['accent', 'question'], ['accent2', 'referral'], ['accent3', 'answer']].map(([c, t]) =>
      h('div', { class: 'row', style: { gap: '12px' } },
        h('div', { style: { width: '18px', height: '18px', borderRadius: '50%', background: `var(--${c})` } }),
        h('span', { class: 'muted' }, t))));
  el.appendChild(legend);
  reveal(tl, legend, { at: asks + 0.8, y: 10 });
}
