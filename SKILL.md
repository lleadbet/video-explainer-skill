---
name: video-explainer
description: Create informational explainer videos (MP4) by writing animated 2D scenes in HTML/SVG/CSS with GSAP and rendering them frame-by-frame with headless Chromium + ffmpeg. Use when the user asks for an explainer video, animated walkthrough, motion-graphics clip, or an animated diagram/chart exported as video. Not for generative/AI video or editing existing footage.
---

# Video explainer

You make videos the way a motion designer would, but in code: each scene is a small JS module that builds DOM/SVG and adds tweens to a **paused GSAP timeline**. The renderer seeks that timeline frame by frame (`t = frame / fps`), screenshots each frame, and pipes the frames to ffmpeg. Output is deterministic: the same project always renders the same frames.

`SKILL_DIR` below means this skill's base directory (the folder containing this file).

## Setup (once per machine)

```bash
cd SKILL_DIR/scripts && npm install && npx playwright install chromium
```
You also need `ffmpeg` on PATH. Every script prints this command if the dependencies are missing.

## Workflow

1. **Storyboard first.** Agree on the topic, audience, target length and whether it should have a voiceover, then write the scene list in `video.json`. Each scene gets `narration` (what the voiceover says) and `visual` (what's on screen). Read `reference/storyboard.md`. Don't write scene code until the storyboard makes sense on its own.
2. **Scaffold:** `node SKILL_DIR/scripts/new.mjs <project-dir> --title "..."`, then edit `video.json` and write one module per scene in `scenes/<id>.js`. Use `reference/animation-patterns.md` for recipes and `reference/design.md` for layout, type and colour. With a voiceover, set scene durations to `"auto"` and time animations with `cue('phrase')`. Both examples are complete voiced videos: `examples/kubernetes-overview/` (ElevenLabs) and `examples/how-dns-works/` (Gemini).
3. **Voiceover (if wanted):** follow `reference/voiceover.md`. In short: add a `"voice"` block to `video.json`, run `node SKILL_DIR/scripts/narration.mjs status <project-dir>`, call the OpenRouter MCP `generate-speech` tool once per listed scene with exactly the arguments it prints, and register each saved file with `narration.mjs add`. Do this before checking (step 4), because real audio changes scene lengths and `cue()` timings.
4. **Check:** `node SKILL_DIR/scripts/lint.mjs <project-dir>`. It loads every scene in Chromium and reports load errors, animations longer than their scene, animations created outside `tl`, elements outside the frame, clipped text, and narration too long for its scene. Fix every warning unless it's deliberate.
5. **Look at it:** `node SKILL_DIR/scripts/render.mjs <project-dir> --contact-sheet`, then **Read the PNG** (`<project-dir>/out/contact-sheet.png`). Check hierarchy, overlap, legibility, empty frames, timing. For detail, render specific moments: `--stills 12.5,30`. Iterate until it looks right, then do one more contact-sheet pass after your last edit.
6. **Render:** `node SKILL_DIR/scripts/render.mjs <project-dir>` → `<project-dir>/out/video.mp4`. Narration clips are mixed in automatically. Give the user the path, the duration, and the scene list. They can preview interactively with `node SKILL_DIR/scripts/serve.mjs <project-dir>` (scrubber, play/pause, narration playback, `c` toggles captions, `m` mutes).

Useful render flags: `--out file.mp4`, `--from 10 --to 20` (partial), `--scale 0.5` (fast draft), `--workers N`, `--crf 18`, `--audio track.mp3` (use your own audio track instead of the narration), `--no-voice` (silent), `--audio-codec aac` (default is MP3, which also plays in VS Code).

## Project layout

```
my-video/
  video.json          # title, width, height, fps, seed, transition, theme, scenes[]
  scenes/<id>.js      # one module per scene
  assets/             # images/SVGs, referenced as '/assets/x.svg'
  audio/              # narration clips + manifest.json (from narration.mjs; keep them, they cost money)
  style.css           # optional, auto-loaded if present
  out/                # renders (contact-sheet.png, stills/, video.mp4)
```

`video.json` scene fields: `id` (required, also the default filename `scenes/<id>.js`), `duration` (seconds, or `"auto"`: fit the narration audio, or a reading-speed estimate before audio exists, and never shorter than the animations), `narration`, `visual`, optional `file`, and optional `transition` (`"fade"`, the default, or `"cut"`). The top-level `"voice"` block is described in `reference/voiceover.md`.

## Scene contract

```js
import { h, reveal, pop } from '/__runtime/helpers.js';

export default function ({ el, tl, gsap, theme, width, height, random, onFrame, cue, voice }) {
  const title = h('div', { class: 'h1' }, 'Hello');
  el.append(h('div', { class: 'center' }, title));
  reveal(tl, title, { at: 0.3 });                       // tl time 0 = start of this scene
  tl.to(title, { color: 'var(--accent)', duration: 0.5 }, cue('the key idea'));  // when that phrase is spoken
}
```

- `el`: this scene's container. It covers the full 1920×1080 stage and is shown and hidden for you.
- `tl`: this scene's timeline. **All motion must be on `tl`** (or another timeline added to it). Never use `gsap.to(...)` directly, CSS `animation`/`transition`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `<video>`, or anything that depends on wall-clock time. The renderer only moves the timeline playhead, so anything else ends up frozen or out of sync in the MP4.
- `cue(phrase, offset = -0.15)` returns the scene time when `phrase` (case-insensitive, must appear in this scene's narration) is spoken. Once audio exists, it's aligned to the clip's measured pauses, so phrases that start a clause land on the spoken word. It throws if the phrase isn't found. Use it for every narration-synced `at`. `voice` gives `{ start, duration, end, estimated }` for the speech in this scene (e.g. to keep a looping effect running until `voice.end`).
- For per-frame drawing (canvas, procedural motion), use `onFrame((sceneTime) => draw(sceneTime))`. It's called on every frame while the scene is visible.
- **Overlay (optional):** `"overlay": "scenes/_overlay.js"` in `video.json` adds a module drawn above every scene for the whole video, for a timecode, progress bar, logo or frame border. It gets `{ el, tl, onFrame, scenes, duration, ... }`, where `onFrame((t) => ...)` receives the global time and `scenes` lists each scene's `start`/`end`.
- `random()` is seeded per scene, and `Math.random` is seeded too, so random layouts are reproducible.
- The function may be `async` (e.g. to `fetch('/assets/data.json')`). Fonts are loaded before scenes run, so measuring text works.
- Theme colours are CSS variables: `var(--bg) --surface --surface2 --fg --muted --accent --accent2 --accent3 --accent4 --danger`, plus `--font` and `--mono`. Override them in `video.json` → `"theme": { "accent": "#ff3366" }`.
- GSAP plugins are registered globally: DrawSVG, MotionPath, MorphSVG, SplitText, Text, ScrambleText, CustomEase.

## Quality bar

- One idea per scene. Something on screen should move or change at least every 2–3 seconds, and every animation should land in sync with the narration line it illustrates (use `cue()`; narration runs ~2.5 words/second).
- Text is big: body ≥ 40px and labels ≥ 26px on the 1920×1080 stage. Keep it inside the safe area (`.safe`, 96/128px margins).
- Build diagrams up piece by piece rather than showing a finished diagram.
- Leave a short hold at the end of each scene before the fade, so the final state can be read.

## Voiceover

Audio comes from the OpenRouter MCP server (`generate-speech`); this skill only plans and records it. If those tools aren't available, tell the user the voiceover needs the OpenRouter MCP server connected, and render without voice in the meantime. `reference/voiceover.md` has the full procedure, model and voice choices, and costs.
