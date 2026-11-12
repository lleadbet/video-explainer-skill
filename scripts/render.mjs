#!/usr/bin/env node
// Render a video project to MP4, still frames, or a contact sheet.
//
//   node render.mjs <project> [--out file.mp4] [--workers N] [--from s] [--to s]
//                             [--scale 0.5] [--fps N] [--crf 18]
//                             [--audio file | --no-voice] [--audio-codec mp3|aac]
//   Narration clips (narration.mjs) are mixed in automatically; --audio replaces them with
//   your own track, --no-voice renders silent. Audio is MP3 by default (plays everywhere,
//   including VS Code); use --audio-codec aac for strict MP4 targets.
//   node render.mjs <project> --stills 1.5,4,9.25        -> <project>/out/stills/*.png
//   node render.mjs <project> --contact-sheet [--every 1.5] -> <project>/out/contact-sheet.png
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { parseArgs, readProject, openProject, seek, fail, fmtTime } from './lib/common.mjs';
import { buildNarrationTrack } from './lib/voice.mjs';

const args = parseArgs(process.argv.slice(2), ['contact-sheet', 'no-voice']);
const { projectDir, video } = readProject(args._[0]);
const outDir = path.join(projectDir, 'out');
fs.mkdirSync(outDir, { recursive: true });

try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { fail('ffmpeg not found on PATH'); }

if (args.stills) await stills();
else if (args['contact-sheet']) await contactSheet();
else await renderVideo();

// ------------------------------------------------------------------ video

async function renderVideo() {
  const scale = +(args.scale || 1);
  const proj = await openProject(projectDir);
  const { info } = proj;
  const fps = +(args.fps || info.fps);
  const from = Math.max(0, +(args.from || 0));
  const to = Math.min(info.duration, args.to != null ? +args.to : info.duration);
  const first = Math.round(from * fps);
  const last = Math.round(to * fps); // exclusive
  const total = last - first;
  if (total <= 0) fail(`nothing to render (from ${from}s to ${to}s)`);
  const outW = Math.round(info.width * scale), outH = Math.round(info.height * scale);
  if (outW % 2 || outH % 2) fail(`output size ${outW}x${outH} must be even for H.264; adjust --scale or width/height`);

  const out = path.resolve(args.out || path.join(outDir, 'video.mp4'));
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const workers = Math.max(1, Math.min(+(args.workers || Math.min(4, Math.floor(os.cpus().length / 2) || 1)), Math.ceil(total / fps)));
  const crf = String(args.crf || 18);
  printWarnings(info, proj.errors);
  console.log(`Rendering ${info.title || path.basename(projectDir)}: ${fmtTime(from)}–${fmtTime(to)}, ${total} frames @ ${fps}fps, ${outW}x${outH}, ${workers} worker(s)`);

  const segDir = fs.mkdtempSync(path.join(outDir, '.segments-'));
  const t0 = Date.now();
  let done = 0, nextReport = 0.1;
  const tick = () => {
    done++;
    if (done / total >= nextReport) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  ${Math.round((done / total) * 100)}%  (${done}/${total} frames, ${el.toFixed(1)}s elapsed, ~${((el / done) * (total - done)).toFixed(0)}s left)`);
      nextReport += 0.1;
    }
  };

  const per = Math.ceil(total / workers);
  const ranges = [];
  for (let w = 0; w < workers; w++) {
    const a = first + w * per, b = Math.min(last, a + per);
    if (a < b) ranges.push([a, b, path.join(segDir, `seg-${String(w).padStart(3, '0')}.mp4`)]);
  }
  try {
    await Promise.all(ranges.map(async ([a, b, file], w) => {
      const page = w === 0 ? proj.page : await proj.openPage();
      await renderRange(page, a, b, fps, file, crf, tick, scale === 1 ? null : `scale=${outW}:${outH}:flags=lanczos`);
    }));
  } finally {
    await proj.close();
  }

  const list = path.join(segDir, 'list.txt');
  fs.writeFileSync(list, ranges.map(([, , f]) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  let audio = args.audio ? path.resolve(args.audio) : null;
  if (audio && !fs.existsSync(audio)) fail(`audio file not found: ${audio}`);
  let audioNote = '';
  if (!audio && !args['no-voice']) {
    const voiced = info.scenes.filter((s) => s.voice?.file);
    if (voiced.length) {
      audio = buildNarrationTrack(projectDir, info.scenes, info.duration, path.join(outDir, 'narration.mp3'));
      audioNote = ` (narration for ${voiced.length}/${info.scenes.length} scenes)`;
      const missing = info.scenes.filter((s) => s.narration && !s.voice?.file).map((s) => s.id);
      if (missing.length) console.warn(`warning: no narration audio for: ${missing.join(', ')} — see narration.mjs status`);
    }
  }
  const acodec = args['audio-codec'] || 'mp3';
  if (!['mp3', 'aac'].includes(acodec)) fail('--audio-codec must be mp3 or aac');
  const ffArgs = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
  if (audio) ffArgs.push('-ss', String(from), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', acodec === 'mp3' ? 'libmp3lame' : 'aac', '-b:a', '192k', '-af', 'apad', '-shortest');
  else ffArgs.push('-c', 'copy');
  ffArgs.push('-movflags', '+faststart', out);
  execFileSync('ffmpeg', ffArgs, { stdio: 'inherit' });
  fs.rmSync(segDir, { recursive: true, force: true });

  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height,nb_frames', '-of', 'json', out]).toString());
  const v = probe.streams.find((s) => s.codec_type === 'video');
  console.log(`\nWrote ${out}`);
  console.log(`  ${v.width}x${v.height}, ${(+probe.format.duration).toFixed(2)}s, ${v.nb_frames} frames${probe.streams.some((s) => s.codec_type === 'audio') ? `, ${acodec} audio${audioNote}` : ''}`);
  console.log(`  rendered in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (proj.errors.length) {
    console.warn(`\n${proj.errors.length} browser error(s) during render — check the output:`);
    for (const e of proj.errors) console.warn(`  ${e}`);
    process.exitCode = 2;
  }
}

async function renderRange(page, a, b, fps, file, crf, tick, vf) {
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(vf ? ['-vf', vf] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps), file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const finished = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  const cdp = await page.context().newCDPSession(page);
  for (let i = a; i < b; i++) {
    await seek(page, i / fps);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 95, optimizeForSpeed: true });
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
    tick();
  }
  ff.stdin.end();
  await finished;
}

// ------------------------------------------------------------------ stills

async function stills() {
  const times = String(args.stills).split(',').map(Number).filter((n) => !Number.isNaN(n));
  if (!times.length) fail('--stills needs comma-separated times in seconds, e.g. --stills 1,4.5');
  const proj = await openProject(projectDir);
  printWarnings(proj.info, proj.errors);
  const dir = path.join(outDir, 'stills');
  fs.mkdirSync(dir, { recursive: true });
  try {
    for (const t of times) {
      await seek(proj.page, t);
      const file = path.join(dir, `t${t.toFixed(2).padStart(7, '0')}.png`);
      await proj.page.screenshot({ path: file });
      console.log(`${fmtTime(t)}  ${sceneAt(proj.info, t)?.id ?? ''}  ${file}`);
    }
  } finally { await proj.close(); }
}

// ------------------------------------------------------------ contact sheet

async function contactSheet() {
  const proj = await openProject(projectDir, { scale: 0.25 });
  const { info } = proj;
  printWarnings(info, proj.errors);
  const every = +(args.every || Math.max(0.75, Math.min(2, info.duration / 30)));
  const samples = [];
  for (const s of info.scenes) {
    const a = s.start + Math.min(0.5, s.duration / 4);
    const b = s.end - Math.min(0.45, s.duration / 4) - 0.01;
    const n = Math.max(2, Math.round((b - a) / every) + 1);
    for (let k = 0; k < n; k++) samples.push({ t: a + ((b - a) * k) / (n - 1), scene: s.id });
  }
  const tiles = [];
  try {
    for (const smp of samples) {
      await seek(proj.page, smp.t);
      const buf = await proj.page.screenshot({ type: 'jpeg', quality: 85 });
      tiles.push({ ...smp, src: 'data:image/jpeg;base64,' + buf.toString('base64') });
    }
    const cols = 4;
    const tw = info.width / 4, th = info.height / 4;
    const sheet = await proj.browser.newPage({ viewport: { width: cols * (tw + 12) + 12, height: 400 } });
    let lastScene = null;
    const cells = tiles.map((t) => {
      const first = t.scene !== lastScene; lastScene = t.scene;
      return `<figure class="${first ? 'first' : ''}"><img src="${t.src}" width="${tw}" height="${th}"><figcaption><b>${t.scene}</b> ${fmtTime(t.t)}</figcaption></figure>`;
    }).join('');
    await sheet.setContent(`<!doctype html><style>
      body{margin:0;padding:12px;background:#111;font:13px system-ui,sans-serif;color:#ccc;display:grid;grid-template-columns:repeat(${cols},${tw}px);gap:12px}
      figure{margin:0} img{display:block;outline:1px solid #333} figure.first img{outline:2px solid #e8b500}
      figcaption{padding-top:4px} b{color:#fff}</style>${cells}`);
    const file = path.join(outDir, 'contact-sheet.png');
    await sheet.screenshot({ path: file, fullPage: true });
    console.log(`Contact sheet: ${file}`);
    console.log(`  ${tiles.length} frames, ~every ${every.toFixed(2)}s; the first frame of each scene has a yellow outline.`);
  } finally { await proj.close(); }
}

// ------------------------------------------------------------------ shared

function sceneAt(info, t) {
  return info.scenes.find((s) => t >= s.start && t < s.end) || info.scenes.at(-1);
}

function printWarnings(info, errors) {
  for (const w of info.warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.warn(`error: ${e}`);
}
