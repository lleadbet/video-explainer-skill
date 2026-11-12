// Persistent chrome: the storyboard panel border, panel name, a progress rule along the
// bottom edge, and the running timecode (the one bold element).
import { h, svg, svgLayer } from '/__runtime/helpers.js';

const B = { left: 56, top: 56, right: 1864, bottom: 1000 };

export default function ({ el, video, scenes, duration, fps, onFrame }) {
  const layer = svgLayer(el);
  layer.appendChild(svg('rect', {
    x: B.left, y: B.top, width: B.right - B.left, height: B.bottom - B.top,
    fill: 'none', stroke: 'var(--fg)', 'stroke-width': 2, opacity: 0.85,
  }));
  const progress = svg('line', { x1: B.left, y1: B.bottom, x2: B.left, y2: B.bottom, stroke: 'var(--accent)', 'stroke-width': 6 });
  layer.appendChild(progress);

  const panel = h('div', { class: 'abs', style: { left: B.left + 'px', top: B.bottom + 18 + 'px', fontSize: '28px', fontWeight: 500, color: 'var(--muted)' } });
  const tc = h('div', { class: 'abs mono', style: { right: 1920 - B.right + 'px', top: B.bottom + 14 + 'px', fontSize: '30px', fontWeight: 600, color: 'var(--fg)', fontVariantNumeric: 'tabular-nums' } });
  el.append(panel, tc);

  const labels = video.scenes.map((s, i) => s.label || s.id);
  const pad = (n, w = 2) => String(n).padStart(w, '0');

  onFrame((t) => {
    const frame = Math.min(Math.round(t * fps), Math.round(duration * fps));
    const secs = Math.floor(frame / fps);
    tc.textContent = `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}:${pad(frame % fps)}   frame ${pad(frame, 4)}`;
    const i = Math.max(0, scenes.findIndex((s) => t >= s.start && t < s.end));
    const idx = t >= duration ? scenes.length - 1 : i;
    panel.textContent = `Panel ${idx + 1} of ${scenes.length}   ${labels[idx]}`;
    progress.setAttribute('x2', B.left + (B.right - B.left) * Math.min(1, t / duration));
  });
}
