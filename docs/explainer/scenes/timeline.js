import { h, svg, svgLayer, reveal, pop } from '/__runtime/helpers.js';

// Track geometry (stage px) and the demo's own 4-second timeline.
const T = { x0: 360, x1: 1760, top: 690, row: 64, len: 4 };
const BARS = [
  { name: 'square.x', a: 0, b: 2.5 },
  { name: 'square.rotate', a: 1, b: 3.5 },
  { name: 'dot.scale', a: 2, b: 4 },
];
const ease = (p) => (p < 0 ? 0 : p > 1 ? 1 : p * p * (3 - 2 * p));
const xAt = (t) => T.x0 + (t / T.len) * (T.x1 - T.x0);

export default function ({ el, tl, cue }) {
  const heading = h('div', { class: 'h2 abs', style: { left: '128px', top: '130px' } }, 'A paused timeline you can seek');
  el.appendChild(heading);

  // Demo: what the timeline controls.
  // Wrappers take GSAP's entrance; the inner shapes take the manual, seek-driven transform.
  const square = h('div', { style: { width: '120px', height: '120px', background: 'var(--accent)' } });
  const dot = h('div', { style: { width: '100px', height: '100px', borderRadius: '50%', background: 'var(--accent2)', border: '3px solid var(--fg)' } });
  const squareWrap = h('div', { class: 'abs', style: { left: '420px', top: '330px' } }, square);
  const dotWrap = h('div', { class: 'abs', style: { left: '1560px', top: '340px' } }, dot);
  el.append(squareWrap, dotWrap);
  const apply = (t) => {
    square.style.transform = `translateX(${ease((t - 0) / 2.5) * 820}px) rotate(${ease((t - 1) / 2.5) * 180}deg)`;
    dot.style.transform = `scale(${0.5 + ease((t - 2) / 2) * 0.9})`;
  };

  // Track: ruler, bars, playhead.
  const layer = svgLayer(el);
  const track = svg('g');
  for (let s = 0; s <= T.len; s += 0.5) {
    const major = s % 1 === 0;
    track.appendChild(svg('line', { x1: xAt(s), y1: T.top - 40, x2: xAt(s), y2: T.top - (major ? 16 : 26), stroke: 'var(--muted)', 'stroke-width': 2 }));
    if (major) track.appendChild(svg('text', { x: xAt(s), y: T.top - 50, 'text-anchor': 'middle', 'font-size': 24, fill: 'var(--muted)', text: `${s}s` }));
  }
  BARS.forEach((b, i) => {
    const y = T.top + i * T.row;
    track.appendChild(svg('text', { x: T.x0 - 24, y: y + 30, 'text-anchor': 'end', 'font-size': 26, fill: 'var(--fg)', 'font-family': 'var(--mono)', text: b.name }));
    track.appendChild(svg('rect', { x: xAt(b.a), y: y + 6, width: xAt(b.b) - xAt(b.a), height: 36, rx: 3, fill: 'var(--surface)', stroke: 'var(--fg)', 'stroke-width': 2 }));
  });
  layer.appendChild(track);
  const head = svg('g');
  head.append(
    svg('line', { x1: 0, y1: T.top - 40, x2: 0, y2: T.top + BARS.length * T.row, stroke: 'var(--accent)', 'stroke-width': 4 }),
    svg('path', { d: 'M-14 -60 L14 -60 L0 -40 Z', transform: `translate(0 ${T.top})`, fill: 'var(--accent)' }),
  );
  layer.appendChild(head);
  const tag = h('div', { class: 'mono abs', style: { top: T.top - 130 + 'px', fontSize: '26px', color: 'var(--accent)', whiteSpace: 'nowrap' } });
  el.appendChild(tag);

  const state = { t: 0 };
  const render = () => {
    apply(state.t);
    head.setAttribute('transform', `translate(${xAt(state.t)} 0)`);
    tag.style.left = xAt(state.t) - 70 + 'px';
  };
  render();

  reveal(tl, heading, { at: 0.3 });
  pop(tl, [squareWrap, dotWrap], { at: cue('Scenes draw'), stagger: 0.2 });
  tl.from(track, { autoAlpha: 0, y: 30, duration: 0.6, ease: 'power3.out' }, cue('GSAP timelines'));
  tl.from(head, { autoAlpha: 0, duration: 0.3 }, cue('GSAP timelines') + 0.4);

  // Play through, then stop at "paused".
  const play = cue('GSAP timelines') + 0.6, pause = cue('stay paused');
  tl.to(state, { t: 3.2, duration: Math.max(0.5, pause - play), ease: 'none', onUpdate: render }, play);
  tl.set(tag, { textContent: 'paused' }, pause);
  tl.from(tag, { autoAlpha: 0, duration: 0.2 }, pause);

  // Seek: jump to exact times; the demo snaps to match.
  const seekAt = cue('seeking to it');
  [0.8, 2.6, 1.7].forEach((t, i) => {
    const at = seekAt + i * 0.55;
    tl.to(state, { t, duration: 0.001, onUpdate: render }, at);
    tl.set(tag, { textContent: `seek(${t})` }, at);
  });
}
