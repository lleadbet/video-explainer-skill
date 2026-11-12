import { h, svg, svgLayer, arrow, drawArrow, reveal, pop } from '/__runtime/helpers.js';

const STRIP = { x0: 640, x1: 1240, y: 488, w: 150, h: 85, gap: 20 };

export default function ({ el, tl, cue, onFrame, random }) {
  const heading = h('div', { class: 'h2 abs', style: { left: '128px', top: '130px' } }, 'Seek, screenshot, encode');

  const workers = [0, 1, 2, 3].map((i) => h('div', { class: 'card abs', style: {
    left: '160px', top: 410 + 'px', width: '420px', padding: '24px 30px',
  } }, h('div', { class: 'h3' }, 'Headless Chromium'), h('div', { class: 'small muted' }, i === 0 ? 'driven by Playwright' : `worker ${i + 1}`)));
  const flash = h('div', { class: 'abs', style: { left: '160px', top: '410px', width: '420px', height: '140px', background: '#fff', opacity: 0 } });
  const seekTag = h('div', { class: 'mono abs', style: { left: '200px', top: '350px', fontSize: '26px', color: 'var(--accent)' } }, 'seek(t)  screenshot()');
  const ff = h('div', { class: 'card abs', style: { left: '1300px', top: '430px', width: '230px', padding: '24px 30px', textAlign: 'center' } }, h('div', { class: 'h3' }, 'ffmpeg'));
  const mp4 = h('div', { class: 'abs mono', style: { left: '1640px', top: '458px', fontSize: '30px', fontWeight: 600, padding: '10px 18px', border: '2px solid var(--fg)', borderRadius: '4px' } }, 'video.mp4');
  const stat = h('div', { class: 'h3 abs', style: { left: '640px', top: '740px', width: '1100px' } },
    '1,950 frames of 1080p rendered in 49 seconds');
  el.append(heading, ...workers.slice().reverse(), flash, seekTag, ff, mp4, stat);

  // Film strip: frames slide right continuously (driven by the clock, so it's deterministic).
  const clip = svg('svg', { x: STRIP.x0, y: STRIP.y - 20, width: STRIP.x1 - STRIP.x0, height: STRIP.h + 40, viewBox: `0 0 ${STRIP.x1 - STRIP.x0} ${STRIP.h + 40}`, overflow: 'hidden' });
  const reel = svg('g');
  const n = 7, pitch = STRIP.w + STRIP.gap; // enough frames to fill the 600px window while scrolling
  for (let i = 0; i < n; i++) {
    const fg = svg('g', { transform: `translate(${i * pitch} 20)` });
    fg.append(
      svg('rect', { width: STRIP.w, height: STRIP.h, fill: 'var(--surface)', stroke: 'var(--fg)', 'stroke-width': 2 }),
      svg('rect', { x: 14, y: 16, width: 30 + random() * 60, height: 8, fill: 'var(--muted)' }),
      svg('rect', { x: 14, y: 34, width: 20 + random() * 40, height: 8, fill: 'var(--accent)' }),
    );
    reel.appendChild(fg);
  }
  clip.appendChild(reel);
  const layer = svgLayer(el);
  layer.appendChild(clip);
  const a1 = arrow(layer, { from: [1540, 504], to: [1625, 504], color: 'var(--fg)', width: 4, head: 16 });

  // Strip position is a pure function of scene time (120 px/s, then 480 px/s with four
  // workers), so any frame can be rendered on its own.
  const runAt = cue('pipes it into ffmpeg'), fastAt = cue('Four browsers');
  const stripOffset = (t) => t < runAt ? 0 : t < fastAt ? (t - runAt) * 120 : (fastAt - runAt) * 120 + (t - fastAt) * 480;
  onFrame((t) => reel.setAttribute('transform', `translate(${(stripOffset(t) % pitch) - pitch} 0)`));

  reveal(tl, heading, { at: 0.3 });
  pop(tl, workers[0], { at: cue('headless Chromium') - 0.4 });
  reveal(tl, seekTag, { at: cue('seeks one frame'), y: 10 });
  tl.to(flash, { opacity: 0.9, duration: 0.08, yoyo: true, repeat: 1 }, cue('takes a screenshot'));
  tl.from(clip, { autoAlpha: 0, duration: 0.4 }, cue('takes a screenshot') + 0.2);
  pop(tl, ff, { at: runAt });
  drawArrow(tl, a1, { at: runAt + 0.4, duration: 0.3 });
  pop(tl, mp4, { at: runAt + 0.6 });
  // Four workers fan out into a stack.
  workers.slice(1).forEach((w, i) => {
    tl.fromTo(w, { autoAlpha: 0, x: 0, y: 0 }, { autoAlpha: 1, x: (i + 1) * 14, y: (i + 1) * 14, duration: 0.4, ease: 'power2.out', immediateRender: true }, fastAt + i * 0.1);
  });
  reveal(tl, stat, { at: cue('about a minute') });
}
