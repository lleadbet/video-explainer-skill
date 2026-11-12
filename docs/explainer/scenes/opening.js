import { h, svgLayer, arrow, drawArrow, reveal, splitReveal } from '/__runtime/helpers.js';

export default function ({ el, tl, cue }) {
  const headline = h('div', { class: 'display abs', style: { left: '128px', top: '300px', width: '1300px' } },
    'Explainer videos,', h('br'), 'written as code.');
  const sub = h('div', { class: 'body abs muted', style: { left: '132px', top: '620px', width: '1000px' } },
    'A Claude skill that storyboards, animates and narrates a topic, then renders it to MP4.');

  // Browser chrome that reveals what each frame really is.
  const url = h('span', { class: 'mono', style: { fontSize: '26px' } }, 'http://127.0.0.1:5173/?render=1');
  const chrome = h('div', { class: 'abs row', style: {
    left: '56px', right: '56px', top: '56px', height: '72px', padding: '0 32px', gap: '28px',
    borderBottom: '2px solid var(--fg)', background: 'var(--surface)',
  } },
  h('div', { class: 'row', style: { gap: '12px' } }, ...[0, 1, 2].map(() =>
    h('div', { style: { width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--fg)' } }))),
  h('div', { style: { flex: 1, padding: '8px 20px', border: '2px solid var(--surface2)', borderRadius: '4px', color: 'var(--muted)' } }, url));

  const note = h('div', { class: 'note abs', style: { left: '1180px', top: '770px', width: '560px', textAlign: 'right' } },
    'every frame is a screenshot, counted here');
  el.append(headline, sub, chrome, note);
  const layer = svgLayer(el);
  const a = arrow(layer, { from: [1640, 850], to: [1700, 1000], curve: -40, color: 'var(--accent)', width: 4, head: 18 });

  splitReveal(tl, headline, { at: 0.3, by: 'lines', stagger: 0.18, y: 60 });
  reveal(tl, sub, { at: 1.1 });
  reveal(tl, note, { at: cue('Every frame'), y: 10 });
  drawArrow(tl, a, { at: cue('Every frame') + 0.3 });
  tl.from(chrome, { yPercent: -100, autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, cue('web page'));
}
