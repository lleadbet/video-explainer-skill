import { h, codeBlock, reveal, pop, highlightLines } from '/__runtime/helpers.js';

const LINT = `$ node scripts/lint.mjs my-video
warning: scene "cluster" @0:06: outside frame: <div.card> "Pod"
warning: scene "intro": animations run 7.2s but duration is 6s
OK (2 warning(s))`;

export default function ({ el, tl, cue, random }) {
  const heading = h('div', { class: 'h2 abs', style: { left: '128px', top: '130px' } }, 'Claude checks its own work');
  const lint = codeBlock(LINT, { lang: 'sh', fontSize: 26 });
  Object.assign(lint.style, { position: 'absolute', left: '128px', top: '240px', width: '1664px', padding: '24px 36px' });

  // Contact sheet: 4 x 3 tiles of sketched frames.
  const tiles = [];
  const COLS = 6, W = 262, H = 147, G = 18, X = 128, Y = 500;
  for (let i = 0; i < 12; i++) {
    const tile = h('div', { class: 'abs', style: {
      left: X + (i % COLS) * (W + G) + 'px', top: Y + Math.floor(i / COLS) * (H + G) + 'px', width: W + 'px', height: H + 'px',
      background: 'var(--surface)', border: '2px solid var(--surface2)', borderRadius: '2px', padding: '20px',
    } },
    h('div', { style: { width: 60 + random() * 120 + 'px', height: '12px', background: 'var(--muted)', marginBottom: '16px' } }),
    h('div', { style: { width: 30 + random() * 90 + 'px', height: '34px', background: i % 3 === 1 ? 'var(--accent)' : 'var(--surface2)' } }));
    tiles.push(tile);
  }
  const bad = tiles[8];
  const tagPos = { left: X + 2 * (W + G) + 'px', top: Y + 2 * H + G + 12 + 'px', color: 'var(--danger)', fontWeight: 600 };
  const badTag = h('div', { class: 'small abs', style: tagPos }, 'label covers a node');
  const fixedTag = h('div', { class: 'small abs', style: { ...tagPos, color: 'var(--accent)' } }, 'fixed');
  const sheetLbl = h('div', { class: 'mono abs muted', style: { left: X + 'px', top: Y + 2 * H + G + 12 + 'px', fontSize: '24px' } }, 'out/contact-sheet.png');
  el.append(heading, lint, ...tiles, badTag, fixedTag, sheetLbl);

  reveal(tl, heading, { at: 0.3 });
  reveal(tl, lint.querySelectorAll('.line'), { at: cue('A linter'), y: 8, stagger: 0.15, duration: 0.3 });
  highlightLines(tl, lint, [2, 3], { at: cue('layout and timing'), color: 'rgba(255,216,74,.22)' });
  pop(tl, tiles, { at: cue('a contact sheet'), stagger: { each: 0.05, from: 'start' } });
  reveal(tl, sheetLbl, { at: cue('a contact sheet') + 0.5, y: 8 });
  tl.set(fixedTag, { autoAlpha: 0 }, 0);
  const glance = cue('at a glance');
  tl.to(bad, { borderColor: 'var(--danger)', borderWidth: '4px', duration: 0.2 }, glance);
  reveal(tl, badTag, { at: glance, y: 8 });
  tl.to(bad, { borderColor: 'var(--accent)', duration: 0.3 }, glance + 1.4);
  tl.to(badTag, { autoAlpha: 0, duration: 0.2 }, glance + 1.4);
  tl.to(fixedTag, { autoAlpha: 1, duration: 0.3 }, glance + 1.5);
}
