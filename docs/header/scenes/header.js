// README banner, rendered as a still: `render.mjs docs/header --stills 0.5`.
import { h, svg, svgLayer } from '/__runtime/helpers.js';

const FRAMES = [
  ['f0008.40.jpg', '00:08:12', 252],
  ['f0029.60.jpg', '00:29:18', 888],
  ['f0048.40.jpg', '00:48:12', 1452],
  ['f0072.90.jpg', '01:12:27', 2187],
];

export default function ({ el }) {
  const layer = svgLayer(el, { width: 1920, height: 640 });
  layer.append(
    svg('rect', { x: 32, y: 32, width: 1856, height: 576, fill: 'none', stroke: 'var(--fg)', 'stroke-width': 2 }),
    svg('line', { x1: 32, y1: 608, x2: 32 + 1856 * 0.62, y2: 608, stroke: 'var(--accent)', 'stroke-width': 6 }),
  );

  el.append(
    h('div', { class: 'display abs', style: { left: '96px', top: '118px', fontSize: '138px' } }, 'Explainer videos,', h('br'), 'written as code.'),
    h('div', { class: 'abs', style: { left: '100px', top: '420px', width: '780px', fontSize: '34px', lineHeight: 1.35, color: 'var(--muted)' } },
      'A Claude skill that storyboards, animates and narrates a topic, then renders it to MP4.'),
  );

  FRAMES.forEach(([file, tc, frame], i) => {
    const x = 1060 + (i % 2) * 392, y = 84 + Math.floor(i / 2) * 252;
    el.append(
      h('img', { class: 'abs', src: `/assets/${file}`, style: { left: x + 'px', top: y + 'px', width: '376px', height: '212px', border: '2px solid var(--fg)' } }),
      h('div', { class: 'abs mono', style: { left: x + 'px', top: y + 218 + 'px', fontSize: '20px', color: 'var(--fg)' } },
        `${tc}  frame ${String(frame).padStart(4, '0')}`),
    );
  });
}
