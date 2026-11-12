// Video runtime: loads video.json, builds one paused GSAP master timeline from the
// scene modules, and exposes a seekable clock to the renderer.
//
//   window.__ready   Promise<{ width, height, fps, duration, scenes, warnings } | { error }>
//   window.__seek(t) Promise — renders the frame at time t (seconds) and waits for paint
//   window.__layoutReport()  elements that sit outside the stage at the current time
//
// Voiceover: if video.json has a "voice" block and audio/manifest.json exists (written by
// narration.mjs), each scene's narration clip is placed at scene start + voice.lead, "auto"
// durations fit the clip, and scenes get ctx.voice / ctx.cue() for syncing to speech.
//
// Preview mode (no ?render=1): adds play/pause, a scrubber, scene markers, captions and
// narration playback.

const gsap = window.gsap;
const params = new URLSearchParams(location.search);
const RENDER = params.has('render');

const DEFAULT_THEME = {
  bg: '#0f1117',
  surface: '#1a1d27',
  surface2: '#252a38',
  fg: '#f5f6fa',
  muted: '#9aa0b4',
  accent: '#5b8cff',
  accent2: '#ff7a59',
  accent3: '#3ddc97',
  accent4: '#ffc857',
  danger: '#ff5c6c',
  font: "'Inter Variable', Inter, system-ui, sans-serif",
  mono: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace",
};
const FADE = 0.4; // seconds, for transition: "fade"
const VOICE_DEFAULTS = { lead: 0.5, tail: 0.8 };
const WORDS_PER_SEC = 2.5; // narration estimate when there is no audio yet

// Relative speaking time of a piece of text: characters, plus pauses at punctuation.
function speechWeight(text) {
  let w = 0;
  for (const ch of text) w += /[.!?]/.test(ch) ? 10 : /[,;:\u2014]/.test(ch) ? 5 : 1;
  return w;
}

/**
 * Map a character position in the narration to seconds into the clip.
 * With measured pauses (from narration.mjs add): speech start/end are anchored, each
 * pause is matched to the nearest clause boundary in the text, and positions between
 * anchors are interpolated by speech weight. Without them: linear over the whole clip.
 */
function makeAligner(text, totalLen, clip) {
  const weightTo = (a, b) => speechWeight(text.slice(a, b));
  if (!clip?.speech) {
    const W = Math.max(1, weightTo(0, text.length));
    return (pos) => (weightTo(0, pos) / W) * totalLen;
  }
  const [s0, s1] = clip.speech;
  const W = Math.max(1, weightTo(0, text.length));
  const linear = (pos) => s0 + (weightTo(0, pos) / W) * (s1 - s0);
  const bounds = [];
  for (const m of text.matchAll(/[.,!?;:\u2014]+\s+/g)) bounds.push(m.index + m[0].length);
  const anchors = [[0, s0]];
  let used = -1;
  for (const [, pauseEnd] of clip.pauses || []) {
    let best = -1, bestD = Infinity;
    for (let b = used + 1; b < bounds.length; b++) {
      const d = Math.abs(linear(bounds[b]) - pauseEnd);
      if (d < bestD) { bestD = d; best = b; }
    }
    if (best >= 0 && bestD < 1.2 && pauseEnd > anchors.at(-1)[1]) { anchors.push([bounds[best], pauseEnd]); used = best; }
  }
  anchors.push([text.length, s1]);
  return (pos) => {
    let k = 0;
    while (k < anchors.length - 2 && pos >= anchors[k + 1][0]) k++;
    const [p0, t0] = anchors[k], [p1, t1] = anchors[k + 1];
    const f = p1 > p0 ? weightTo(p0, Math.min(pos, p1)) / Math.max(1, weightTo(p0, p1)) : 0;
    return t0 + f * (t1 - t0);
  };
}

async function loadManifest() {
  try {
    const r = await fetch('/audio/manifest.json', { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const kebab = (s) => s.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

async function waitForAssets(root) {
  const imgs = [...root.querySelectorAll('img')].filter((i) => !i.complete);
  await Promise.all(imgs.map((i) => new Promise((r) => { i.onload = i.onerror = r; })));
  await document.fonts.ready;
}

async function build() {
  const res = await fetch('/video.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`video.json: HTTP ${res.status}`);
  const video = await res.json();
  const width = video.width || 1920;
  const height = video.height || 1080;
  const fps = video.fps || 30;
  const theme = { ...DEFAULT_THEME, ...(video.theme || {}) };
  const scenesCfg = video.scenes || [];
  if (!scenesCfg.length) throw new Error('video.json has no scenes');
  const voiceCfg = video.voice ? { ...VOICE_DEFAULTS, ...video.voice } : null;
  const manifest = voiceCfg ? await loadManifest() : null;

  gsap.registerPlugin(
    ...['DrawSVGPlugin', 'MotionPathPlugin', 'MorphSVGPlugin', 'SplitText', 'TextPlugin',
      'ScrambleTextPlugin', 'CustomEase'].map((n) => window[n]).filter(Boolean),
  );
  gsap.config({ nullTargetWarn: true });
  gsap.ticker.lagSmoothing(0);

  // Theme -> CSS custom properties (--bg, --accent2, --font, ...)
  const rootStyle = document.documentElement.style;
  for (const [k, v] of Object.entries(theme)) rootStyle.setProperty('--' + kebab(k), v);
  rootStyle.setProperty('--w', width + 'px');
  rootStyle.setProperty('--h', height + 'px');

  // Determinism: seeded Math.random during build.
  Math.random = mulberry32(video.seed ?? 1);

  // Make sure the theme fonts are loaded before any scene measures text.
  await Promise.all(
    ['400', '600', '800'].flatMap((w) => [
      document.fonts.load(`${w} 40px ${theme.font}`),
      document.fonts.load(`${w} 40px ${theme.mono}`),
    ]),
  ).catch(() => {});

  const stage = document.createElement('div');
  stage.id = 'stage';
  document.body.appendChild(stage);

  const master = gsap.timeline({ paused: true });
  const scenes = [];
  const warnings = [];
  const frameFns = [];
  const cueFns = {};
  let cursor = 0;
  if (voiceCfg && !manifest) warnings.push('no narration audio yet (see narration.mjs status); "auto" durations and cue() use reading-speed estimates');

  for (let i = 0; i < scenesCfg.length; i++) {
    const cfg = scenesCfg[i];
    const id = cfg.id || `scene-${i + 1}`;
    const el = document.createElement('section');
    el.className = 'scene';
    el.dataset.scene = id;
    stage.appendChild(el);

    // Attach to the paused master right away so the real-time ticker never drives it.
    const tl = gsap.timeline();
    master.add(tl, cursor);
    const sceneFrameFns = [];

    // Narration timing: the real clip if it matches the current text and voice, else an estimate.
    const narration = (cfg.narration || '').trim();
    let clip = manifest?.scenes?.[id];
    const stale = clip && (clip.text !== narration ||
      ['model', 'voice', 'instructions', 'speed'].some((k) => (clip[k] ?? null) !== (voiceCfg[k] ?? null)));
    if (stale) {
      warnings.push(`scene "${id}": narration audio is out of date (text or voice changed) — see narration.mjs status`);
      clip = null;
    }
    if (manifest && narration && !clip && !manifest.scenes?.[id]) warnings.push(`scene "${id}": no narration audio — see narration.mjs status`);
    const lead = voiceCfg?.lead ?? VOICE_DEFAULTS.lead;
    const tail = voiceCfg?.tail ?? VOICE_DEFAULTS.tail;
    const speechLen = clip ? clip.duration : narration ? narration.split(/\s+/).length / WORDS_PER_SEC : 0;
    const voice = { start: lead, duration: speechLen, end: lead + speechLen, estimated: !clip, file: clip?.file ?? null };

    /** Scene time (s) at which `phrase` is spoken, aligned to the clip's measured pauses. */
    const align = makeAligner(narration, speechLen, clip);
    const cue = (phrase, offset = -0.15) => {
      const idx = narration.toLowerCase().indexOf(phrase.toLowerCase());
      if (idx < 0) throw new Error(`cue("${phrase}"): phrase not found in the narration of scene "${id}"`);
      return Math.max(0, lead + align(idx) + offset);
    };
    cueFns[id] = cue;

    const ctx = {
      el, tl, gsap, theme, video, scene: cfg, index: i, width, height, fps,
      duration: typeof cfg.duration === 'number' ? cfg.duration : undefined,
      voice, cue,
      random: mulberry32((video.seed ?? 1) * 1000 + i + 1),
      onFrame: (fn) => sceneFrameFns.push(fn),
      $: (sel) => el.querySelector(sel),
      $$: (sel) => [...el.querySelectorAll(sel)],
    };

    const file = cfg.file || `scenes/${id}.js`;
    let mod;
    try {
      mod = await import('/' + file.replace(/^\.?\//, ''));
    } catch (e) {
      throw new Error(`scene "${id}": could not load ${file}: ${e.message}`);
    }
    if (typeof mod.default !== 'function') throw new Error(`scene "${id}": ${file} has no default export function`);
    try {
      await mod.default(ctx);
    } catch (e) {
      throw new Error(`scene "${id}": ${e.stack || e.message}`);
    }
    await waitForAssets(el);

    const animLen = tl.duration();
    let duration = ctx.duration;
    if (duration === undefined) {
      // "auto" (or omitted): fit the narration, and never cut animations short.
      duration = narration ? Math.max(voice.end + tail, animLen + 0.5) : Math.max(animLen + 1, 1);
      duration = Math.round(duration * fps) / fps;
    }
    if (animLen > duration + 0.01) {
      warnings.push(`scene "${id}": animations run ${animLen.toFixed(2)}s but duration is ${duration}s — the end is cut off`);
    }
    if (clip && voice.end > duration - 0.2) {
      warnings.push(`scene "${id}": narration audio ends at ${voice.end.toFixed(2)}s but the scene is ${duration}s — use "duration": "auto" or lengthen it`);
    }

    const start = cursor;
    const end = start + duration;
    const transition = cfg.transition || video.transition || 'fade';
    const f = Math.min(FADE, duration / 4);

    if (transition === 'fade') {
      master.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: f, ease: 'none', immediateRender: false }, start);
      master.fromTo(el, { autoAlpha: 1 }, { autoAlpha: 0, duration: f, ease: 'none', immediateRender: false }, end - f);
    } else {
      master.set(el, { autoAlpha: 1 }, start);
      master.set(el, { autoAlpha: 0 }, end);
    }
    if (sceneFrameFns.length) frameFns.push({ start, end, fns: sceneFrameFns });
    scenes.push({ id, start, duration, end, narration, animDuration: animLen, voice: { start: voice.start, duration: voice.duration, file: voice.file, estimated: voice.estimated } });
    cursor = end;
  }

  const total = cursor;

  // Optional overlay: one module drawn above every scene for the whole video
  // (timecode, progress bar, logo, frame). It gets the global clock, not a scene clock.
  if (video.overlay) {
    const el = document.createElement('div');
    el.className = 'overlay';
    stage.appendChild(el);
    const tl = gsap.timeline();
    master.add(tl, 0);
    const fns = [];
    let mod;
    try {
      mod = await import('/' + video.overlay.replace(/^\.?\//, ''));
      await mod.default({ el, tl, gsap, theme, video, width, height, fps, duration: total, scenes, onFrame: (fn) => fns.push(fn) });
    } catch (e) {
      throw new Error(`overlay ${video.overlay}: ${e.stack || e.message}`);
    }
    await waitForAssets(el);
    if (tl.duration() > total + 0.01) warnings.push(`overlay animations run ${tl.duration().toFixed(2)}s, longer than the video (${total.toFixed(2)}s)`);
    if (fns.length) frameFns.push({ start: 0, end: total, fns: fns.map((fn) => (_local, t) => fn(t)) });
  }

  // Pad the master timeline to the exact total length.
  master.set({}, {}, total);

  // Anything animating outside a scene's tl will not follow the clock.
  const strays = gsap.globalTimeline.getChildren(false, true, true).filter((c) => c !== master);
  if (strays.length) {
    warnings.push(`${strays.length} animation(s) were created outside a scene's \`tl\` (e.g. gsap.to(...) instead of tl.to(...)); they will not render correctly`);
    strays.forEach((s) => s.pause(0));
  }

  let lastT = -1;
  function renderAt(t) {
    t = Math.max(0, Math.min(total, t));
    master.time(t, false);
    for (const s of frameFns) {
      if (t >= s.start && t <= s.end) for (const fn of s.fns) fn(t - s.start, t);
    }
    lastT = t;
    return t;
  }
  renderAt(0);

  window.__master = master;
  window.__seek = (t) => {
    renderAt(t);
    return new Promise((r) => requestAnimationFrame(() => r(lastT)));
  };
  window.__layoutReport = () => layoutReport(stage, width, height);
  window.__cue = (sceneId, phrase, offset = 0) => cueFns[sceneId](phrase, offset); // debugging aid

  const info = { title: video.title || '', width, height, fps, duration: total, scenes, warnings };
  if (!RENDER) setupPreview({ stage, info, renderAt });
  else document.body.classList.add('render');
  return info;
}

function layoutReport(stage, width, height) {
  const out = [];
  const sr = stage.getBoundingClientRect();
  const scale = sr.width / width;
  for (const sceneEl of stage.querySelectorAll('.scene')) {
    if (getComputedStyle(sceneEl).visibility === 'hidden') continue;
    for (const el of sceneEl.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
      if (el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const box = {
        left: (r.left - sr.left) / scale, top: (r.top - sr.top) / scale,
        right: (r.right - sr.left) / scale, bottom: (r.bottom - sr.top) / scale,
      };
      const over = box.left < -2 || box.top < -2 || box.right > width + 2 || box.bottom > height + 2;
      // Text that has overflowed its own box (e.g. fixed-width card).
      const clipped = el.children.length === 0 && el.textContent.trim() &&
        (el.scrollWidth > el.clientWidth + 2) && cs.overflow !== 'visible';
      if (over || clipped) {
        const label = el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') +
          (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : '');
        out.push({
          el,
          scene: sceneEl.dataset.scene,
          element: label,
          text: el.textContent.trim().replace(/\s+/g, ' ').slice(0, 50),
          issue: over ? 'outside frame' : 'text clipped',
          box: Object.fromEntries(Object.entries(box).map(([k, v]) => [k, Math.round(v)])),
        });
      }
    }
  }
  // Report only the outermost offender of each subtree.
  const set = new Set(out.map((o) => o.el));
  return out
    .filter((o) => { for (let p = o.el.parentElement; p; p = p.parentElement) if (set.has(p)) return false; return true; })
    .map(({ el, ...rest }) => rest);
}

function fmt(t) {
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(1).padStart(4, '0')}`;
}

function setupPreview({ stage, info, renderAt }) {
  document.body.classList.add('preview');
  const bar = document.createElement('div');
  bar.id = 'controls';
  bar.innerHTML = `
    <button id="play" title="Play/pause (space)">▶</button>
    <span id="time">0:00.0 / ${fmt(info.duration)}</span>
    <div id="track"><div id="markers"></div><input id="scrub" type="range" min="0" max="${info.duration}" step="${1 / info.fps}" value="0"></div>
    <span id="scene-name"></span>
    <button id="cc" title="Toggle narration captions (c)">CC</button>
    <button id="mute" title="Mute narration (m)" style="display:none">🔊</button>`;
  document.body.appendChild(bar);
  const caption = document.createElement('div');
  caption.id = 'caption';
  stage.appendChild(caption);

  const markers = bar.querySelector('#markers');
  for (const s of info.scenes) {
    const m = document.createElement('div');
    m.className = 'marker';
    m.style.left = (s.start / info.duration) * 100 + '%';
    m.style.width = (s.duration / info.duration) * 100 + '%';
    m.title = s.id;
    markers.appendChild(m);
  }
  const $ = (s) => bar.querySelector(s);
  let t = 0, playing = false, last = 0, captions = false, muted = false;

  // Narration playback: one <audio> per scene clip, kept in sync with the clock while playing.
  const clips = info.scenes.filter((s) => s.voice?.file).map((s) => {
    const a = new Audio('/' + s.voice.file);
    a.preload = 'auto';
    return { s, a, from: s.start + s.voice.start };
  });
  if (clips.length) $('#mute').style.display = '';
  function syncAudio() {
    for (const { a, from } of clips) {
      const pos = t - from;
      const active = playing && !muted && pos >= 0 && pos < (a.duration || Infinity);
      if (!active) { if (!a.paused) a.pause(); continue; }
      if (a.paused || Math.abs(a.currentTime - pos) > 0.2) a.currentTime = pos;
      if (a.paused) a.play().catch(() => {});
    }
  }

  function fit() {
    const availH = window.innerHeight - bar.offsetHeight;
    const s = Math.min(window.innerWidth / info.width, availH / info.height);
    stage.style.transform = `translate(${(window.innerWidth - info.width * s) / 2}px, ${(availH - info.height * s) / 2}px) scale(${s})`;
  }
  function show(nt) {
    t = renderAt(nt);
    $('#scrub').value = t;
    $('#time').textContent = `${fmt(t)} / ${fmt(info.duration)}`;
    const cur = info.scenes.find((s) => t >= s.start && t < s.end) || info.scenes.at(-1);
    $('#scene-name').textContent = cur.id;
    caption.textContent = captions ? cur.narration : '';
    caption.style.display = captions && cur.narration ? 'block' : 'none';
    history.replaceState(null, '', `?t=${t.toFixed(2)}`);
    syncAudio();
  }
  function loop(now) {
    if (!playing) return;
    const dt = (now - last) / 1000;
    last = now;
    if (t + dt >= info.duration) { show(info.duration); toggle(false); return; }
    show(t + dt);
    requestAnimationFrame(loop);
  }
  function toggle(on = !playing) {
    playing = on;
    $('#play').textContent = playing ? '❚❚' : '▶';
    syncAudio();
    if (playing) {
      if (t >= info.duration) show(0);
      last = performance.now();
      requestAnimationFrame(loop);
    }
  }
  $('#play').onclick = () => toggle();
  $('#cc').onclick = () => { captions = !captions; show(t); };
  $('#mute').onclick = () => { muted = !muted; $('#mute').textContent = muted ? '🔇' : '🔊'; syncAudio(); };
  $('#scrub').oninput = (e) => { toggle(false); show(+e.target.value); };
  window.addEventListener('resize', fit);
  window.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 1 / info.fps : 1;
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight') show(t + step);
    else if (e.key === 'ArrowLeft') show(t - step);
    else if (e.key === 'Home') show(0);
    else if (e.key === 'End') show(info.duration);
    else if (e.key === 'c') $('#cc').click();
    else if (e.key === 'm') $('#mute').click();
  });
  fit();
  const start = params.has('scene')
    ? info.scenes.find((s) => s.id === params.get('scene'))?.start ?? 0
    : +params.get('t') || 0;
  show(start);
  if (info.warnings.length) console.warn('[video] ' + info.warnings.join('\n[video] '));
}

window.__ready = build().catch((e) => {
  console.error(e);
  const pre = document.createElement('pre');
  pre.id = 'fatal';
  pre.textContent = String(e.message || e);
  document.body.appendChild(pre);
  return { error: String(e.message || e) };
});
