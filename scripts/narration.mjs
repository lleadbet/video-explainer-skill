#!/usr/bin/env node
// Bookkeeping for voiceover clips. Audio itself is generated with the OpenRouter MCP
// `generate-speech` tool; this script says what to generate and records the results.
//
//   node narration.mjs status <project>                 scenes needing audio + exact tool arguments
//   node narration.mjs add <project> <scene-id> <file>  store a generated clip for a scene
//        [--pcm-rate 24000]                             for raw PCM output (e.g. Gemini TTS)
//
// Clips live in <project>/audio/<scene>.<hash>.mp3 with audio/manifest.json. The hash covers
// model, voice, instructions, speed and text, so a clip goes stale when any of them change.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseArgs, readProject, fail } from './lib/common.mjs';
import { voiceConfig, clipHash, audioDir, readManifest, writeManifest, probeDuration } from './lib/voice.mjs';

const args = parseArgs(process.argv.slice(2));
const [cmd, dir, sceneId, file] = args._;
if (cmd === 'status') status();
else if (cmd === 'add') add();
else fail('usage: narration.mjs status <project> | narration.mjs add <project> <scene-id> <audio-file>');

function load() {
  const { projectDir, video } = readProject(dir);
  const voice = voiceConfig(video);
  if (!voice?.model) {
    fail('video.json has no "voice" block. Add e.g.\n  "voice": { "model": "elevenlabs/eleven-v4", "voice": "george" }\nFind models with the OpenRouter MCP list-models tool (output_modalities: "speech") and voices with get-model.');
  }
  const scenes = video.scenes.map((s, i) => ({ id: s.id || `scene-${i + 1}`, text: (s.narration || '').trim(), duration: s.duration }));
  return { projectDir, video, voice, scenes, manifest: readManifest(projectDir) || { scenes: {} } };
}

function isFresh(projectDir, voice, manifest, s) {
  const m = manifest.scenes?.[s.id];
  return !!(m && m.hash === clipHash(voice, s.text) && fs.existsSync(path.join(projectDir, m.file)));
}

function toolArgs(voice, text) {
  const a = { model: voice.model, input: text };
  if (voice.voice) a.voice = voice.voice;
  if (voice.instructions) a.instructions = voice.instructions;
  if (voice.speed != null) a.speed = voice.speed;
  // Some providers only return raw PCM (Gemini TTS, HeyGen); `add` converts it to MP3.
  const format = voice.responseFormat || (/^(google\/gemini|heygen\/)/.test(voice.model) ? 'pcm' : null);
  if (format) a.response_format = format;
  return a;
}

function status() {
  const { projectDir, voice, scenes, manifest } = load();
  const todo = scenes.filter((s) => s.text && !isFresh(projectDir, voice, manifest, s));

  console.log('scene                   audio   scene duration');
  for (const s of scenes) {
    const m = manifest.scenes?.[s.id];
    const fresh = s.text && isFresh(projectDir, voice, manifest, s);
    const need = fresh ? voice.lead + m.duration + voice.tail : null;
    let dur = s.duration === undefined || s.duration === 'auto' ? `auto${need ? ` → ${need.toFixed(1)}s` : ''}` : `${s.duration}s`;
    if (fresh && typeof s.duration === 'number' && need > s.duration + 0.05) dur += `  ⚠ needs ${need.toFixed(1)}s (use "auto")`;
    const audio = !s.text ? '  none' : fresh ? `${m.duration.toFixed(2).padStart(5)}s` : m ? ' stale' : '  todo';
    console.log(`  ${s.id.padEnd(22)} ${audio}   ${dur}`);
  }

  if (!todo.length) { console.log('\nAll narration clips are up to date.'); return; }
  const chars = todo.reduce((n, s) => n + s.text.length, 0);
  console.log(`\n${todo.length} clip(s) to generate (${chars} characters). For each, call the OpenRouter MCP`);
  console.log('`generate-speech` tool with exactly these arguments, then register the saved file:\n');
  for (const s of todo) {
    console.log(`# ${s.id}`);
    console.log(JSON.stringify(toolArgs(voice, s.text)));
    console.log(`node ${path.relative(process.cwd(), process.argv[1])} add ${path.relative(process.cwd(), projectDir) || '.'} ${s.id} <saved-audio-file>\n`);
  }
}

function add() {
  if (!sceneId || !file) fail('usage: narration.mjs add <project> <scene-id> <audio-file>');
  const { projectDir, video, voice, scenes, manifest } = load();
  const s = scenes.find((x) => x.id === sceneId);
  if (!s) fail(`no scene "${sceneId}" (scenes: ${scenes.map((x) => x.id).join(', ')})`);
  if (!s.text) fail(`scene "${sceneId}" has no narration text`);
  const src = path.resolve(file);
  if (!fs.existsSync(src)) fail(`audio file not found: ${src}`);

  const hash = clipHash(voice, s.text);
  const rel = path.join('audio', `${s.id}.${hash}.mp3`);
  const dest = path.join(projectDir, rel);
  fs.mkdirSync(audioDir(projectDir), { recursive: true });

  // Does ffmpeg see a real audio stream? Raw PCM (e.g. the MCP tool's .bin output) has none.
  let readable = false;
  try {
    readable = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', src])
      .toString().includes('audio');
  } catch {}
  if (readable && /\.mp3$/i.test(src)) {
    fs.copyFileSync(src, dest);
  } else if (readable) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-c:a', 'libmp3lame', '-b:a', '192k', dest]);
  } else {
    // Not a container ffmpeg recognises: treat as raw 16-bit mono PCM.
    const rate = String(args['pcm-rate'] || 24000);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 's16le', '-ar', rate, '-ac', '1', '-i', src, '-c:a', 'libmp3lame', '-b:a', '192k', dest]);
  }

  // Remove older clips for this scene.
  for (const f of fs.readdirSync(audioDir(projectDir))) {
    if (f.startsWith(s.id + '.') && f.endsWith('.mp3') && path.join(audioDir(projectDir), f) !== dest) fs.rmSync(path.join(audioDir(projectDir), f));
  }
  const duration = +probeDuration(dest).toFixed(3);
  const { speech, pauses } = analyzePauses(dest, duration);
  manifest.scenes ||= {};
  manifest.scenes[s.id] = {
    file: rel, hash, duration, text: s.text, speech, pauses,
    model: voice.model, voice: voice.voice ?? null, instructions: voice.instructions ?? null, speed: voice.speed ?? null,
  };
  // Drop entries for scenes that no longer exist.
  for (const id of Object.keys(manifest.scenes)) if (!scenes.some((x) => x.id === id)) delete manifest.scenes[id];
  writeManifest(projectDir, manifest);

  const words = s.text.split(/\s+/).length;
  let note = '';
  if (typeof s.duration === 'number' && voice.lead + duration + voice.tail > s.duration + 0.05) {
    note = `  ⚠ scene is ${s.duration}s but needs ${(voice.lead + duration + voice.tail).toFixed(1)}s — use "duration": "auto"`;
  }
  console.log(`${s.id}: ${duration.toFixed(2)}s (${Math.round(words / duration * 60)} wpm) → ${rel}${note}`);
  const left = scenes.filter((x) => x.text && !isFresh(projectDir, voice, manifest, x)).length;
  console.log(left ? `${left} scene(s) still need audio.` : 'All narration clips are up to date.');
}

/**
 * Find where speech starts/ends and the pauses inside it. The runtime's cue() anchors
 * clause boundaries in the text to these pauses, so it follows each model's pacing.
 */
function analyzePauses(file, duration) {
  const log = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=n=-35dB:d=0.15', '-f', 'null', '-']).stderr.toString();
  const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]);
  const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  let speechStart = 0, speechEnd = duration;
  const pauses = [];
  starts.forEach((st, i) => {
    const en = ends[i] ?? duration;
    if (st <= 0.02) speechStart = en;
    else if (en >= duration - 0.15) speechEnd = st; // silencedetect ends trailing silence slightly before EOF
    else pauses.push([+st.toFixed(3), +en.toFixed(3)]);
  });
  return { speech: [+speechStart.toFixed(3), +speechEnd.toFixed(3)], pauses };
}
