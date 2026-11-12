# Animation patterns

Scenes import helpers from `/__runtime/helpers.js` (source: `runtime/helpers.js`; read it if a signature is unclear). Builders create elements; animators add tweens to `tl` at position `at`.

**Time narration beats with `cue()`**: `at: cue('root server')` is the scene time when that phrase is spoken, which follows the real audio automatically. Use offsets for follow-ups within a beat (`cue('root server') + 0.4`). Fixed numbers are fine for intro beats before speech starts (the first ~0.5s) and in videos without narration. Relative positions (`'+=0.3'`, `'<'`) are fine inside a beat.

## Helper reference

| Builder | Returns |
|---|---|
| `h(tag, props, ...children)` | HTML element. `props`: `class`, `style` (object or string), `text`, `html`, any attribute. |
| `svg(tag, attrs, ...children)` | SVG element. |
| `html('<div>…</div>')` | Element parsed from a string. |
| `svgLayer(el)` | Full-stage `<svg>` in stage pixel coordinates (put arrows/lines here). |
| `arrow(layer, { from:[x,y], to:[x,y], curve, color, width, head, dash })` | `{ g, path, head }`. `curve` in px bends it; swapping from/to with the same curve bows to the other side. |
| `barChart(data, { width, height, max, unit, format })` | `{ el, bars, values }`. `data`: `[{ label, value, color? }]`. |
| `codeBlock(code, { lang, fontSize })` | `.code` element with one `.line` per line, lightly highlighted (`js`, `py`, `sh`, `sql`, …). |

| Animator | Does |
|---|---|
| `reveal(tl, targets, { at, y=40, x, scale, stagger, duration })` | Fade + slide in. |
| `hide(tl, targets, { at, y, duration })` | Fade out. |
| `pop(tl, targets, { at, stagger })` | Scale-in with overshoot (nodes, icons, badges). |
| `splitReveal(tl, el, { at, by: 'words'\|'chars'\|'lines', stagger })` | Word/char cascade (SplitText). `el` must already be in the DOM. |
| `typewriter(tl, el, text, { at, cps })` | Typing with a caret. |
| `countUp(tl, el, { to, from, at, duration, format })` | Animated number. |
| `drawIn(tl, svgShapes, { at, duration, stagger })` | Stroke draw-on (solid strokes only). |
| `drawArrow(tl, arrow, { at, duration })` | Draws the line then pops the head; dashed arrows fade in instead. |
| `growBars(tl, chart, { at, stagger })` | Bars grow and values count up. |
| `highlightLines(tl, codeEl, [lines], { at })` | Highlights 1-based lines and dims the rest. |
| `marker(tl, inlineEl, { at, color })` | Highlighter-pen sweep behind text. |
| `moveAlong(tl, target, pathEl, { at, duration })` | Moves along an SVG path (MotionPath). |
| `hold(tl, seconds)` | Appends dead time. |

Raw GSAP works too: `tl.to/from/fromTo/set(targets, vars, at)`.

## Recipes

### Title card
```js
const title = h('div', { class: 'display' }, 'How DNS works');
const sub = h('div', { class: 'h3 muted' }, 'From a name to an address');
el.append(h('div', { class: 'center' }, h('div', { class: 'stack', style: { alignItems: 'center' } }, title, sub)));
splitReveal(tl, title, { at: 0.4, by: 'chars', stagger: 0.03 });
reveal(tl, sub, { at: 1.3 });
```

### Build-up diagram (nodes + arrows + travelling packet)
```js
const layer = svgLayer(el);
const node = (x, y, label) => {
  const n = h('div', { class: 'card abs h3', style: { left: x + 'px', top: y + 'px' } }, label);
  gsap.set(n, { xPercent: -50, yPercent: -50 });   // centre on (x, y)
  el.appendChild(n);
  return n;
};
const a = node(400, 540, 'Client'), b = node(1500, 540, 'Server');
const link = arrow(layer, { from: [560, 540], to: [1320, 540], curve: -80, color: 'var(--accent)' });
const dot = svg('circle', { r: 14, fill: 'var(--accent)' }); layer.appendChild(dot);

pop(tl, [a, b], { at: 0.3, stagger: 0.2 });
drawArrow(tl, link, { at: 1.2 });
tl.set(dot, { autoAlpha: 0 }, 0).set(dot, { autoAlpha: 1 }, 1.8);
moveAlong(tl, dot, link.path, { at: 1.8, duration: 1 });
tl.to(dot, { autoAlpha: 0, duration: 0.15 });
tl.fromTo(b, { borderColor: 'var(--surface2)' }, { borderColor: 'var(--accent3)', duration: 0.3 }, 2.8);
```
A complete version is in `examples/how-dns-works/scenes/the-journey.js`.

### Step captions that change during a scene
```js
const caption = h('div', { class: 'h2 abs', style: { left: '128px', top: '96px' } });
el.appendChild(caption);
const step = (text, at) => {
  tl.set(caption, { textContent: text }, at);
  tl.fromTo(caption, { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 }, at);
};
step('1. Ask a resolver', 0.4);
step('2. Follow the referrals', 5.0);
```

### Big number
```js
const n = h('div', { class: 'display accent' }, '0');
el.append(h('div', { class: 'center' }, h('div', { class: 'stack', style: { alignItems: 'center' } }, n, h('div', { class: 'h3 muted' }, 'requests per second'))));
countUp(tl, n, { to: 1200000, at: 0.5, duration: 2, format: (v) => (v / 1e6).toFixed(1) + 'M' });
```

### Chart
```js
const chart = barChart([{ label: 'Cold', value: 120 }, { label: 'Warm', value: 18 }], { width: 1000, height: 560, unit: ' ms' });
el.append(h('div', { class: 'safe stack' }, h('div', { class: 'h2' }, 'Latency'), chart.el));
growBars(tl, chart, { at: 1, stagger: 0.4 });
```
For line charts, draw an SVG `<path>` in `svgLayer` and use `drawIn`; pop the points in afterwards.

### Code walkthrough
```js
const code = codeBlock(`const x = await fetch(url);\nconst data = await x.json();\nrender(data);`, { lang: 'js' });
el.append(h('div', { class: 'safe stack' }, h('div', { class: 'h2' }, 'Fetching data'), code));
reveal(tl, code.querySelectorAll('.line'), { at: 0.5, y: 10, stagger: 0.08 });
highlightLines(tl, code, [1], { at: 2 });
highlightLines(tl, code, [2], { at: 4 });
```

### Comparison (before / after, A vs B)
Use two `.card`s in a `.row`, each with `flex: 1`. Reveal the left card, then the right, then emphasise the winner (scale 1.05 and accent border) while dimming the loser (`opacity: 0.45`).

### Process / sequence
Place numbered cards left to right and connect them with `arrow`s. Pop each card as the narration reaches it, and draw the arrow just before the next card (`examples/how-dns-works/scenes/recap.js`).

### Morphing shapes
`tl.to(shapeA, { morphSVG: shapeB, duration: 1 }, at)`, where both are SVG `<path>` elements (hide `shapeB` with `visibility: hidden`).

### Canvas or procedural drawing
```js
const c = h('canvas', { width: 1920, height: 1080, class: 'full' }); el.append(c);
const g = c.getContext('2d');
onFrame((t) => { g.clearRect(0, 0, 1920, 1080); /* draw using t (scene seconds) */ });
```
Derive everything from `t`. Don't accumulate state between calls, because frames may be rendered out of order or in parallel.

### Images and icons
Put SVG/PNG files in `assets/` and use `h('img', { src: '/assets/server.svg', style: { width: '160px' } })`. For simple glyphs, prefer inline SVG built with `svg()`. Avoid emoji: the headless Chromium has no colour emoji font.

## Gotchas

- **Everything on `tl`.** `gsap.to()` outside `tl`, CSS animations or timers won't render. Lint warns about stray GSAP animations, but not about CSS ones.
- **Don't set a CSS `transform` on elements you animate.** Use `gsap.set(el, { xPercent: -50, yPercent: -50, rotation: 10 })` instead.
- **`from()` tweens hide elements immediately** (from the moment the scene is built). That's usually what you want. For a later `from()` on an element that should be visible before it, use `fromTo` with `immediateRender: false`.
- **Set initial hidden states at time 0:** `tl.set(x, { autoAlpha: 0 }, 0)`, not CSS `display: none`. Then reveal at the right time.
- **DrawSVG doesn't work on dashed strokes.** `drawArrow` handles this; for your own dashed paths, fade them in.
- **SplitText needs the element in the DOM** and fonts loaded (the runtime loads fonts first). Call `splitReveal` after `el.append(...)`.
- **Animations past the scene `duration` are cut off.** Lint reports them; extend `duration` or tighten the tweens.
- **`cue()` throws if the phrase isn't in the narration.** That's deliberate, so a narration edit can't silently break sync. Fix the phrase to match the new text.
- **`yoyo`/`repeat`** are fine (they're deterministic), but `repeat: -1` makes a scene's animations infinitely long. Use a finite repeat count.
