import { h, svgLayer, arrow, drawArrow, pop, reveal } from '/__runtime/helpers.js';

const STEPS = [
  ['1', 'Write the storyboard'],
  ['2', 'Render the frames'],
  ['3', 'Add a voice'],
];

export default function ({ el, tl, cue }) {
  const steps = STEPS.map(([n, t], i) => h('div', { class: 'abs', style: { left: 128 + i * 590 + 'px', top: '280px', width: '480px' } },
    h('div', { class: 'display', style: { color: 'var(--accent)', fontSize: '130px' } }, n),
    h('div', { class: 'h2', style: { marginTop: '10px' } }, t)));
  const layer = svgLayer(el);
  const arrows = [0, 1].map((i) => arrow(layer, { from: [470 + i * 590, 360], to: [640 + i * 590, 360], color: 'var(--fg)', width: 4, head: 18 }));
  const closing = h('div', { class: 'display abs', style: { left: '128px', top: '640px', fontSize: '120px' } }, 'Ask Claude for an explainer.');
  const repo = h('div', { class: 'mono abs muted', style: { left: '132px', top: '800px', fontSize: '30px' } }, 'video-explainer-skill');
  el.append(...steps, closing, repo);

  pop(tl, steps[0], { at: cue('Write the storyboard') });
  drawArrow(tl, arrows[0], { at: cue('render the frames') - 0.3, duration: 0.3 });
  pop(tl, steps[1], { at: cue('render the frames') });
  drawArrow(tl, arrows[1], { at: cue('add a voice') - 0.3, duration: 0.3 });
  pop(tl, steps[2], { at: cue('add a voice') });
  reveal(tl, closing, { at: cue('Ask Claude') });
  reveal(tl, repo, { at: cue('this is what you get'), y: 10 });
}
