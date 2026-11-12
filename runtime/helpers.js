// Scene helpers. Import in a scene with:
//   import { h, svg, reveal, ... } from '/__runtime/helpers.js';
//
// Builders create DOM and return elements. Animators add tweens to a timeline `tl`
// at position `at` (any GSAP position parameter: 1.5, '+=0.3', '<', '<0.2', 'label').
// Every animator returns `tl` so calls can be chained or followed by tl.to(...).

const gsap = window.gsap;
const SVGNS = 'http://www.w3.org/2000/svg';

// ---------------------------------------------------------------- builders

/** h('div', { class: 'card', style: { left: '100px' } }, 'text', childEl) */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  applyProps(el, props);
  append(el, children);
  return el;
}

/** svg('circle', { cx: 10, cy: 10, r: 5, fill: 'var(--accent)' }) */
export function svg(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue;
    if (k === 'text') el.textContent = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  }
  append(el, children);
  return el;
}

/** Parse an HTML string into a single element (or a DocumentFragment if several). */
export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.childElementCount === 1 ? t.content.firstElementChild : t.content;
}

/** Full-stage SVG layer appended to `parent`, in stage pixel coordinates. */
export function svgLayer(parent, { width = 1920, height = 1080, ...attrs } = {}) {
  const s = svg('svg', { viewBox: `0 0 ${width} ${height}`, width, height, class: 'full', ...attrs });
  s.style.overflow = 'visible';
  parent.appendChild(s);
  return s;
}

function applyProps(el, props) {
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style') typeof v === 'string' ? (el.style.cssText = v) : Object.assign(el.style, v);
    else if (k === 'text') el.textContent = v;
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v);
  }
}

function append(el, children) {
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

/**
 * SVG arrow from [x1,y1] to [x2,y2]. `curve` bends it (pixels, +/- for side).
 * Returns { g, path, head } — animate with drawArrow().
 */
export function arrow(parent, { from, to, curve = 0, color = 'var(--fg)', width = 6, head = 22, dash } = {}) {
  const [x1, y1] = from, [x2, y2] = to;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
  const cx = mx + nx * curve, cy = my + ny * curve;
  // Stop the line short so it doesn't poke through the head.
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const ex = x2 - Math.cos(ang) * head * 0.6, ey = y2 - Math.sin(ang) * head * 0.6;
  const g = svg('g', { class: 'arrow' });
  const path = svg('path', {
    d: `M${x1},${y1} Q${cx},${cy} ${ex},${ey}`, fill: 'none', stroke: color,
    'stroke-width': width, 'stroke-linecap': 'round', 'stroke-dasharray': dash,
  });
  g.appendChild(path);
  let headEl = null;
  if (head) {
    const a = 0.45;
    const p1 = [x2 - head * Math.cos(ang - a), y2 - head * Math.sin(ang - a)];
    const p2 = [x2 - head * Math.cos(ang + a), y2 - head * Math.sin(ang + a)];
    headEl = svg('path', { d: `M${p1} L${x2},${y2} L${p2} Z`, fill: color, stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round' });
    g.appendChild(headEl);
  }
  parent.appendChild(g);
  return { g, path, head: headEl };
}

/**
 * Horizontal-baseline bar chart (HTML). data: [{ label, value, color? }]
 * Returns { el, bars, values } — animate with growBars().
 */
export function barChart(data, { width = 1200, height = 600, max, unit = '', gap = 32, format } = {}) {
  max = max ?? Math.max(...data.map((d) => d.value));
  const fmt = format || ((v) => Math.round(v).toLocaleString('en-US') + unit);
  const el = h('div', { class: 'bar-chart', style: { position: 'relative', width: width + 'px', height: height + 'px', display: 'flex', alignItems: 'flex-end', gap: gap + 'px' } });
  const bars = [], values = [];
  data.forEach((d, i) => {
    const col = h('div', { style: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' } });
    const val = h('div', { class: 'small', style: { fontWeight: 700 } }, fmt(d.value));
    val.dataset.value = d.value;
    const bar = h('div', { style: { width: '100%', height: (d.value / max) * (height - 120) + 'px', background: d.color || `var(--${['accent', 'accent2', 'accent3', 'accent4'][i % 4]})`, borderRadius: '14px 14px 4px 4px', transformOrigin: '50% 100%' } });
    const lab = h('div', { class: 'small muted', style: { height: '40px', whiteSpace: 'nowrap' } }, d.label);
    col.append(val, bar, lab);
    el.appendChild(col);
    bars.push(bar); values.push(val);
  });
  el._fmt = fmt;
  return { el, bars, values };
}

/** Code block with one span.line per line and light syntax colouring. */
export function codeBlock(code, { lang = 'js', fontSize } = {}) {
  const lines = code.replace(/^\n+|\s+$/g, '').split('\n');
  const el = h('div', { class: 'code' });
  if (fontSize) el.style.fontSize = fontSize + 'px';
  el.innerHTML = lines.map((l) => `<span class="line">${tokenize(l, lang) || ' '}</span>`).join('');
  return el;
}

const KEYWORDS = new Set(('const let var function return if else for while do switch case break continue new class extends ' +
  'import from export default async await try catch finally throw typeof instanceof in of yield def lambda pass ' +
  'with as elif not and or is None True False null undefined true false self this fn pub struct impl use mut match ' +
  'enum type interface package func go defer select chan map range SELECT FROM WHERE JOIN ON GROUP BY ORDER INSERT INTO VALUES UPDATE SET').split(' '));

function tokenize(line, lang) {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const commentRe = lang === 'py' || lang === 'sh' || lang === 'yaml' ? /#.*$/ : lang === 'sql' ? /--.*$/ : /\/\/.*$/;
  const re = new RegExp(`(${commentRe.source})|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`[^\`]*\`)|(\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_][A-Za-z0-9_]*)`, 'g');
  let out = '', last = 0, m;
  while ((m = re.exec(line))) {
    out += esc(line.slice(last, m.index));
    const [tok, c, s, n, w] = m;
    if (c) out += `<span class="tok-c">${esc(tok)}</span>`;
    else if (s) out += `<span class="tok-s">${esc(tok)}</span>`;
    else if (n) out += `<span class="tok-n">${esc(tok)}</span>`;
    else if (w && KEYWORDS.has(w)) out += `<span class="tok-k">${esc(tok)}</span>`;
    else out += esc(tok);
    last = m.index + tok.length;
  }
  return out + esc(line.slice(last));
}

// ---------------------------------------------------------------- animators

/** Fade + slide targets in, staggered. */
export function reveal(tl, targets, { at, y = 40, x = 0, scale, stagger = 0.12, duration = 0.7, ease = 'power3.out' } = {}) {
  const from = { autoAlpha: 0, y, x };
  if (scale != null) from.scale = scale;
  return tl.from(targets, { ...from, duration, ease, stagger }, at);
}

/** Fade targets out. */
export function hide(tl, targets, { at, y = 0, duration = 0.4, stagger = 0, ease = 'power2.in' } = {}) {
  return tl.to(targets, { autoAlpha: 0, y, duration, ease, stagger }, at);
}

/** Pop in with a little overshoot (icons, badges, nodes). */
export function pop(tl, targets, { at, stagger = 0.08, duration = 0.5 } = {}) {
  return tl.from(targets, { autoAlpha: 0, scale: 0.4, duration, ease: 'back.out(2)', stagger, transformOrigin: '50% 50%' }, at);
}

/** Hold: advance the timeline without animating (gives the viewer reading time). */
export function hold(tl, seconds) {
  return tl.to({}, { duration: seconds });
}

/** Reveal words (or chars/lines) of an element one by one. Requires fonts loaded (runtime does this). */
export function splitReveal(tl, el, { at, by = 'words', y = 30, stagger = 0.06, duration = 0.5, ease = 'power3.out' } = {}) {
  const split = window.SplitText.create(el, { type: by === 'chars' ? 'words,chars' : by, mask: by === 'lines' ? 'lines' : undefined });
  const parts = split[by];
  tl.set(el, { autoAlpha: 1 }, at);
  return tl.from(parts, { autoAlpha: 0, y, duration, ease, stagger }, at === undefined ? undefined : '<');
}

/** Typewriter: text appears character by character at `cps` chars/second. */
export function typewriter(tl, el, text, { at, cps = 28, cursor = true } = {}) {
  const proxy = { n: 0 };
  const caret = cursor ? '<span style="opacity:.7">▍</span>' : '';
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  el.innerHTML = '';
  return tl.to(proxy, {
    n: text.length, duration: text.length / cps, ease: 'none',
    onUpdate: () => {
      const k = Math.round(proxy.n);
      el.innerHTML = esc(text.slice(0, k)) + (k < text.length ? caret : '');
    },
  }, at);
}

/** Animate a number from → to inside `el`. */
export function countUp(tl, el, { to, from = 0, at, duration = 1.2, ease = 'power2.out', format = (n) => Math.round(n).toLocaleString('en-US') } = {}) {
  const proxy = { v: from };
  el.textContent = format(from);
  return tl.to(proxy, { v: to, duration, ease, onUpdate: () => { el.textContent = format(proxy.v); } }, at);
}

/** Draw SVG strokes (paths, lines, circles, rects) from 0 to 100%. */
export function drawIn(tl, targets, { at, duration = 1, stagger = 0.1, ease = 'power2.inOut' } = {}) {
  tl.set(targets, { autoAlpha: 1 }, at);
  return tl.from(targets, { drawSVG: '0%', duration, stagger, ease }, at === undefined ? undefined : '<');
}

/**
 * Draw an arrow made by arrow(): line draws, then head pops.
 * Dashed arrows can't be stroke-drawn (DrawSVG owns stroke-dasharray), so they fade in with moving dashes.
 */
export function drawArrow(tl, a, { at, duration = 0.6 } = {}) {
  tl.set(a.g, { autoAlpha: 1 }, at);
  if (a.path.getAttribute('stroke-dasharray')) {
    tl.from(a.path, { autoAlpha: 0, strokeDashoffset: 48, duration, ease: 'power1.out' }, '<');
  } else {
    tl.from(a.path, { drawSVG: '0%', duration, ease: 'power2.inOut' }, '<');
  }
  if (a.head) tl.from(a.head, { autoAlpha: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.25, ease: 'back.out(3)' }, '>-0.1');
  return tl;
}

/** Grow bars from a barChart() and count their values up. */
let labelId = 0;
export function growBars(tl, chart, { at, stagger = 0.15, duration = 0.9, ease = 'power3.out' } = {}) {
  const lbl = `__bars${labelId++}`;
  tl.addLabel(lbl, at);
  chart.bars.forEach((bar, i) => {
    const v = chart.values[i], proxy = { n: 0 }, target = +v.dataset.value;
    v.textContent = chart.el._fmt(0);
    const pos = `${lbl}+=${i * stagger}`;
    tl.from(bar, { scaleY: 0, duration, ease }, pos);
    tl.to(proxy, { n: target, duration, ease, onUpdate: () => { v.textContent = chart.el._fmt(proxy.n); } }, pos);
  });
  return tl;
}

/** Highlight lines of a codeBlock() (1-based). Other lines dim. */
export function highlightLines(tl, block, lines, { at, color = 'rgba(91,140,255,.18)', dim = 0.35, duration = 0.4 } = {}) {
  const all = [...block.querySelectorAll('.line')];
  const on = lines.map((n) => all[n - 1]).filter(Boolean);
  const off = all.filter((l) => !on.includes(l));
  tl.to(off, { opacity: dim, backgroundColor: 'rgba(0,0,0,0)', duration }, at);
  return tl.to(on, { opacity: 1, backgroundColor: color, duration }, '<');
}

/** Marker-pen highlight sweeping behind an inline element. */
export function marker(tl, el, { at, color = 'var(--accent)', opacity = 0.35, duration = 0.5 } = {}) {
  el.style.position = 'relative';
  el.style.zIndex = '0';
  const bar = h('span', { style: { position: 'absolute', left: '-0.1em', right: '-0.1em', bottom: '0.05em', height: '0.45em', background: color, opacity, zIndex: '-1', borderRadius: '4px', transformOrigin: '0 50%' } });
  el.appendChild(bar);
  return tl.from(bar, { scaleX: 0, duration, ease: 'power2.out' }, at);
}

/** Move a target along an SVG path element (or path data string). */
export function moveAlong(tl, target, path, { at, duration = 1.2, ease = 'power1.inOut', autoRotate = false } = {}) {
  return tl.to(target, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5], autoRotate }, duration, ease, immediateRender: true }, at);
}
