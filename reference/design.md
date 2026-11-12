# Visual design for explainer video

The stage is **1920×1080 px**. All sizes below are stage pixels. The viewer can't pause to read, so everything is bigger, sparser and higher-contrast than on a web page.

## Layout

- **Safe area:** keep text inside `.safe` (96px top/bottom, 128px left/right). Lint flags anything outside the frame.
- **Grid:** a common pattern is a headline at top-left (`top: 96px`), with content in the middle band (y 300–900). Centre compositions (`.center`) suit titles and single big statements.
- **Density:** at most ~3 text blocks and ~6 diagram nodes visible at once. If you need more, build up and dim the old parts (`opacity: 0.35`) or clear the stage between beats.
- **Positioning:** `.abs` + `left/top` in px is fine and predictable. To centre an element on a point, use `gsap.set(el, { xPercent: -50, yPercent: -50 })`, **not** a CSS `transform` (GSAP would overwrite it when you animate `scale`, `x` or `y`).
- Flex helpers: `.stack` (column, 32px gap), `.row` (row, 48px gap, centred).

## Type

| Class | Size | Use |
|---|---|---|
| `.display` | 120 / 800 | Title card only |
| `.h1` | 88 / 800 | Big statements, numbers |
| `.h2` | 64 / 700 | Scene headline |
| `.h3` | 48 / 600 | Node titles, card titles |
| `.body` | 40 / 400 | Short sentences (≤ 12 words) |
| `.small` | 30 / 500 | Labels on diagrams, chart values |
| `.label` | 26 / 600 caps | Kickers, axis titles, legends |

The fonts are Inter (`--font`) and JetBrains Mono (`--mono`, class `.mono`), bundled locally. Don't load web fonts from the network. To use a custom font, put it in `assets/` and add an `@font-face` in `style.css`.

## Colour

The default theme is dark (it reads well on video and in compressed renders). Tokens:

- `--bg` background, `--surface`/`--surface2` cards and borders, `--fg` text, `--muted` secondary text
- `--accent` (blue), `--accent2` (orange), `--accent3` (green), `--accent4` (yellow), `--danger` (red)

Give each accent one meaning per video (e.g. blue = request, green = success). Use `--muted` for de-emphasis instead of extra colours. For a light theme, override `bg`, `surface`, `surface2`, `fg` and `muted` together in `video.json` → `theme`.

## Motion

- **Easing:** entrances use `power3.out` / `back.out(2)` (pop); exits use `power2.in`. Use `none` only for constant motion (progress bars, packets).
- **Durations:** 0.4–0.8s for entrances; 0.3–0.5s for emphasis; 0.8–1.5s for moving objects across the stage.
- **Stagger** lists at 0.08–0.15s per item.
- **Emphasis without clutter:** scale to 1.04–1.1, change the border colour, dim the siblings, or use `marker()`. Avoid shaking or spinning.
- **Holds matter.** After the last change in a scene, hold for ≥ 1s (plus the 0.4s fade) so the final state can be read.
- **Continuity:** if the next scene reuses an element (e.g. the same diagram), place it identically, so the fade reads as continuity rather than a new layout.
