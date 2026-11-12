#!/usr/bin/env node
// Check a video project before rendering.
//   node lint.mjs <project> [--static]
// Static checks: video.json shape, scene files, narration pacing.
// Browser checks (skipped with --static): scenes load without errors, animations fit in
// their durations, nothing sits outside the frame or overflows its box.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readProject, openProject, seek, fmtTime } from './lib/common.mjs';
import { voiceConfig, readManifest, clipHash } from './lib/voice.mjs';

const args = parseArgs(process.argv.slice(2), ['static']);
const { projectDir, video } = readProject(args._[0]);
const errors = [], warnings = [], notes = [];

// ------------------------------------------------------------------ static
const W = video.width ?? 1920, H = video.height ?? 1080, FPS = video.fps ?? 30;
if (W % 2 || H % 2) errors.push(`width/height must be even (got ${W}x${H})`);
if (FPS < 12 || FPS > 60) warnings.push(`fps ${FPS} is unusual; use 30 (or 60 for fast motion)`);
if (!Array.isArray(video.scenes) || !video.scenes.length) errors.push('video.json needs a non-empty "scenes" array');

const ids = new Set();
const WPM = 150; // comfortable narration pace
const voice = voiceConfig(video);
const manifest = voice ? readManifest(projectDir) : { scenes: {} };
if (voice && !voice.model) errors.push('"voice" needs a "model" (an OpenRouter TTS model slug)');
for (const [i, s] of (video.scenes || []).entries()) {
  const id = s.id || `scene-${i + 1}`;
  if (ids.has(id)) errors.push(`duplicate scene id "${id}"`);
  ids.add(id);
  const file = s.file || `scenes/${id}.js`;
  if (!fs.existsSync(path.join(projectDir, file))) errors.push(`scene "${id}": file ${file} not found`);
  if (s.duration !== undefined && s.duration !== 'auto' && !(typeof s.duration === 'number' && s.duration > 0)) {
    errors.push(`scene "${id}": duration must be a positive number of seconds`);
  }
  const hasAudio = voice?.model && manifest.scenes?.[id]?.hash === clipHash(voice, (s.narration || '').trim());
  if (!s.narration) warnings.push(`scene "${id}": no narration text (needed for voiceover and captions)`);
  else if (typeof s.duration === 'number' && !hasAudio) { // with real audio the runtime checks the clip length
    const words = s.narration.trim().split(/\s+/).length;
    const need = (words / WPM) * 60 + 0.8;
    if (need > s.duration + 0.25) {
      warnings.push(`scene "${id}": ${words} words of narration need ~${need.toFixed(1)}s at ${WPM}wpm but duration is ${s.duration}s — lengthen the scene or trim the narration`);
    }
  }
}

// ------------------------------------------------------------------ browser
if (!errors.length && !args.static) {
  const proj = await openProject(projectDir, { scale: 0.5 });
  const { info, page } = proj;
  try {
    warnings.push(...info.warnings);
    for (const s of info.scenes) {
      // Sample the scene: after the intro, middle, and just before the outro fade.
      const times = [s.start + Math.min(1, s.duration / 3), s.start + s.duration / 2, s.end - 0.5];
      const seen = new Set();
      for (const t of times) {
        await seek(page, t);
        for (const r of await page.evaluate(() => window.__layoutReport())) {
          const key = r.element + r.text;
          if (seen.has(key)) continue;
          seen.add(key);
          const b = r.box;
          warnings.push(`scene "${s.id}" @${fmtTime(t)}: ${r.issue}: <${r.element}> "${r.text}" box [${b.left},${b.top} → ${b.right},${b.bottom}] (frame ${info.width}x${info.height})`);
        }
      }
    }
    errors.push(...proj.errors);
    notes.push(`total ${fmtTime(info.duration)} — ` + info.scenes.map((s) => `${s.id} ${s.duration.toFixed(1)}s`).join(', '));
  } finally {
    await proj.close();
  }
}

for (const e of errors) console.log(`error: ${e}`);
for (const w of warnings) console.log(`warning: ${w}`);
for (const n of notes) console.log(n);
console.log(errors.length ? `\n${errors.length} error(s), ${warnings.length} warning(s)` : `\nOK (${warnings.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
