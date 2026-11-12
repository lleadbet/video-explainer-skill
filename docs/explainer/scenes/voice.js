import { h, svg, svgLayer, reveal, pop, marker } from '/__runtime/helpers.js';

const WAVE = { x0: 128, x1: 1792, mid: 560, h: 200, bars: 180 };

// Peak level per bar from the real narration clip of this scene; synthetic if there's no audio yet.
async function peaks(file, n, random) {
  if (file) {
    try {
      const buf = await (await fetch('/' + file)).arrayBuffer();
      const audio = await new OfflineAudioContext(1, 44100, 44100).decodeAudioData(buf);
      const data = audio.getChannelData(0), step = Math.floor(data.length / n), out = [];
      for (let i = 0; i < n; i++) {
        let m = 0;
        for (let j = i * step; j < (i + 1) * step; j += 16) m = Math.max(m, Math.abs(data[j]));
        out.push(m);
      }
      const max = Math.max(...out) || 1;
      return { levels: out.map((v) => v / max), duration: audio.duration };
    } catch {}
  }
  return { levels: Array.from({ length: n }, () => 0.2 + random() * 0.8), duration: null };
}

async function pauses(sceneId) {
  try { return (await (await fetch('/audio/manifest.json')).json())?.scenes?.[sceneId]?.pauses || []; } catch { return []; }
}

export default async function ({ el, tl, cue, voice, scene, onFrame, random }) {
  const heading = h('div', { class: 'h2 abs', style: { left: '128px', top: '130px' } }, 'A voice, aligned to the picture');
  const chip = (text, filled) => h('div', { class: 'h3', style: { padding: '6px 20px', borderRadius: '4px', border: '2px solid var(--fg)', ...(filled ? { background: 'var(--fg)', color: 'var(--bg)' } : {}) } }, text);
  const chips = [chip('OpenRouter', true), chip('ElevenLabs'), chip('Gemini'), h('div', { class: 'body muted' }, 'and about 40 other speech models')];
  const chipRow = h('div', { class: 'abs row', style: { left: '128px', top: '250px', gap: '24px' } }, ...chips);
  const caption = h('div', { class: 'h3 abs', style: { left: '128px', top: '820px', width: '1660px', fontWeight: 500 } },
    'Each animation lands on the word it shows, ', h('span', {}, 'like this one.'));
  el.append(heading, chipRow, caption);

  const { levels, duration } = await peaks(voice.file, WAVE.bars, random);
  const clipLen = duration || voice.duration;
  const layer = svgLayer(el);
  const xOf = (clipT) => WAVE.x0 + (clipT / clipLen) * (WAVE.x1 - WAVE.x0);

  // Measured pauses, highlighted behind the waveform.
  const gaps = (await pauses(scene.id)).map(([a, b]) => {
    const r = svg('rect', { x: xOf(a), y: WAVE.mid - WAVE.h / 2 - 20, width: Math.max(6, xOf(b) - xOf(a)), height: WAVE.h + 40, fill: 'var(--accent2)', opacity: 0.55 });
    layer.appendChild(r);
    return r;
  });

  const bw = (WAVE.x1 - WAVE.x0) / WAVE.bars;
  const bars = levels.map((v, i) => {
    const hgt = Math.max(4, v * WAVE.h);
    const b = svg('rect', { x: WAVE.x0 + i * bw + 1, y: WAVE.mid - hgt / 2, width: Math.max(2, bw - 3), height: hgt, fill: 'var(--fg)' });
    layer.appendChild(b);
    return b;
  });
  const playhead = svg('line', { x1: 0, y1: WAVE.mid - WAVE.h / 2 - 30, x2: 0, y2: WAVE.mid + WAVE.h / 2 + 30, stroke: 'var(--accent)', 'stroke-width': 5 });
  layer.appendChild(playhead);
  onFrame((t) => {
    const clipT = Math.min(Math.max(0, t - voice.start), clipLen);
    playhead.setAttribute('transform', `translate(${xOf(clipT)} 0)`);
  });

  reveal(tl, heading, { at: 0.2 });
  tl.from(bars, { scaleY: 0, transformOrigin: '50% 50%', duration: 0.4, stagger: 0.004, ease: 'power2.out' }, 0.3);
  pop(tl, chips[0], { at: cue('from OpenRouter') });
  pop(tl, chips[1], { at: cue('ElevenLabs') });
  pop(tl, chips[2], { at: cue('Gemini') });
  reveal(tl, chips[3], { at: cue('Gemini') + 0.4, x: -20, y: 0 });
  tl.set(gaps, { autoAlpha: 0 }, 0);
  tl.to(gaps, { autoAlpha: 1, duration: 0.3, stagger: 0.1 }, cue('Pauses measured'));
  reveal(tl, caption, { at: cue('let each animation'), y: 10 });
  marker(tl, caption.lastChild, { at: cue('like this one', 0), color: 'var(--accent2)', opacity: 0.9, duration: 0.35 });
}
