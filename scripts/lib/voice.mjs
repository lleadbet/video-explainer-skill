// Shared voiceover helpers: voice config, clip cache keys, the audio manifest, and
// building one narration track from per-scene clips.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const VOICE_DEFAULTS = { lead: 0.5, tail: 0.8 };

/** Voice settings from video.json, with defaults. Returns null if no voice is configured. */
export function voiceConfig(video) {
  if (!video.voice) return null;
  return { ...VOICE_DEFAULTS, ...video.voice };
}

/** Everything that changes the generated audio goes into the cache key. */
export function clipHash(voice, text) {
  const key = JSON.stringify([voice.model, voice.voice ?? null, voice.instructions ?? null, voice.speed ?? null, voice.options ?? null, text]);
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 10);
}

export function audioDir(projectDir) {
  return path.join(projectDir, 'audio');
}

export function readManifest(projectDir) {
  try {
    return JSON.parse(fs.readFileSync(path.join(audioDir(projectDir), 'manifest.json'), 'utf8'));
  } catch {
    return { scenes: {} };
  }
}

export function writeManifest(projectDir, manifest) {
  fs.mkdirSync(audioDir(projectDir), { recursive: true });
  fs.writeFileSync(path.join(audioDir(projectDir), 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

export function probeDuration(file) {
  return +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim();
}

/**
 * Mix the per-scene clips into one track, each placed at scene start + lead.
 * `scenes` are the runtime's resolved scenes ({ id, start, voice: { file, start } }).
 * Returns the output path, or null if no scene has audio.
 */
export function buildNarrationTrack(projectDir, scenes, totalDuration, outFile) {
  const placed = scenes.filter((s) => s.voice?.file);
  if (!placed.length) return null;
  const args = ['-y', '-loglevel', 'error'];
  placed.forEach((s) => args.push('-i', path.join(projectDir, s.voice.file)));
  const chains = placed.map((s, i) => {
    const ms = Math.round((s.start + s.voice.start) * 1000);
    return `[${i}:a]aformat=sample_rates=44100:channel_layouts=mono,adelay=${ms}:all=1[a${i}]`;
  });
  const inputs = placed.map((_, i) => `[a${i}]`).join('');
  const filter = `${chains.join(';')};${inputs}amix=inputs=${placed.length}:normalize=0:duration=longest,apad,atrim=0:${totalDuration.toFixed(3)}[out]`;
  args.push('-filter_complex', filter, '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '192k', outFile);
  execFileSync('ffmpeg', args, { stdio: 'inherit' });
  return outFile;
}
