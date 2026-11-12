import { h, svg, codeBlock, reveal, drawIn, highlightLines, pop } from '/__runtime/helpers.js';

const ENTRY = `{
  "id": "timeline",
  "duration": "auto",
  "narration": "Scenes draw with HTML...",
  "visual": "A timeline with a playhead..."
}`;

// Pencil sketches for three panels (in a 300x170 box).
const SKETCHES = [
  (g) => { g.append(svg('line', { x1: 40, y1: 70, x2: 230, y2: 70, class: 'pencil', 'stroke-width': 8 }), svg('line', { x1: 40, y1: 105, x2: 170, y2: 105, class: 'pencil' })); },
  (g) => { for (const [x, y] of [[50, 60], [190, 40], [190, 110]]) g.append(svg('rect', { x, y, width: 60, height: 34, rx: 3, class: 'pencil' }));
    g.append(svg('path', { d: 'M112 77 L188 57 M112 77 L188 127', class: 'pencil' })); },
  (g) => { [[50, 70], [110, 40], [170, 95]].forEach(([x, hgt], i) => g.append(svg('rect', { x: x + i * 6, y: 140 - hgt - 20, width: 40, height: hgt, class: 'pencil' }))); },
];
const FILES = ['scenes/opening.js', 'scenes/storyboard.js', 'scenes/timeline.js'];

export default function ({ el, tl, cue }) {
  const code = codeBlock(ENTRY, { lang: 'js', fontSize: 26 });
  Object.assign(code.style, { position: 'absolute', left: '128px', top: '240px', width: '820px', padding: '24px 36px' });
  const heading = h('div', { class: 'h2 abs', style: { left: '128px', top: '150px' } }, 'One storyboard, one module per scene');
  el.append(heading, code);

  const panels = [], sketches = [], files = [];
  SKETCHES.forEach((draw, i) => {
    const x = 128 + i * 570;
    const s = svg('svg', { viewBox: '0 0 300 170', width: 480, height: 272 });
    const g = svg('g'); draw(g); s.appendChild(g);
    const p = h('div', { class: 'card abs', style: { left: x + 'px', top: '540px', padding: '12px' } }, s);
    const cap = h('div', { class: 'small muted abs', style: { left: x + 'px', top: '845px' } }, `Panel ${i + 1}`);
    const file = h('div', { class: 'mono abs', style: { left: x + 160 + 'px', top: '848px', fontSize: '26px', color: 'var(--accent)' } }, FILES[i]);
    el.append(p, cap, file);
    panels.push(p, cap); sketches.push(...g.children); files.push(file);
  });

  reveal(tl, heading, { at: 0.3 });
  const start = cue('a storyboard');
  reveal(tl, code, { at: start, x: -30, y: 0 });
  reveal(tl, panels, { at: start + 0.3, stagger: 0.12, y: 20 });
  drawIn(tl, sketches, { at: start + 0.6, stagger: 0.12, duration: 0.6 });
  highlightLines(tl, code, [4], { at: cue('with its narration'), color: 'rgba(255,216,74,.28)' });
  highlightLines(tl, code, [5], { at: cue('what should be on screen'), color: 'rgba(255,216,74,.28)' });
  highlightLines(tl, code, [1, 2, 3, 4, 5, 6], { at: cue('then writes'), color: 'rgba(0,0,0,0)', dim: 1 });
  pop(tl, files, { at: cue('small JavaScript module'), stagger: 0.15 });
}
