import { h, codeBlock, typewriter, reveal, highlightLines, arrow, svgLayer, drawArrow } from '/__runtime/helpers.js';

const OUTPUT = `
;; QUESTION SECTION:
;example.com.            IN   A

;; ANSWER SECTION:
example.com.     3600    IN   A    93.184.216.34

;; Query time: 18 msec`;

export default function ({ el, tl, cue }) {
  const heading = h('div', { class: 'h2' }, 'Try it yourself');
  const cmd = h('span');
  const prompt = h('div', { class: 'code', style: { paddingBottom: '0', borderRadius: '20px 20px 0 0' } },
    h('span', { class: 'tok-k' }, '$ '), cmd);
  const out = codeBlock(OUTPUT, { lang: 'txt' });
  out.style.borderRadius = '0 0 20px 20px';
  out.style.paddingTop = '24px';
  const term = h('div', { style: { width: '1240px' } }, prompt, out);
  const ttl = h('div', { class: 'card abs', style: { left: '1420px', top: '380px', width: '380px', borderColor: 'var(--accent4)' } },
    h('div', { class: 'label', style: { color: 'var(--accent4)' } }, 'TTL = 3600'),
    h('div', { class: 'body' }, 'cache for one hour'));
  el.append(h('div', { class: 'safe stack', style: { gap: '48px' } }, heading, term), ttl);
  const layer = svgLayer(el);
  const a = arrow(layer, { from: [1420, 470], to: [580, 545], curve: 60, color: 'var(--accent4)', width: 5 });

  reveal(tl, [heading, term], { at: 0.3, stagger: 0.15 });
  typewriter(tl, cmd, 'dig example.com', { at: 0.7, cps: 12 });
  reveal(tl, out.querySelectorAll('.line'), { at: cue('dig command') + 0.3, y: 10, stagger: 0.06, duration: 0.3 });
  highlightLines(tl, out, [4, 5], { at: cue('The answer section') });
  reveal(tl, ttl, { at: cue('the TTL'), x: 30, y: 0 });
  drawArrow(tl, a, { at: cue('the TTL') + 0.3 });
}
