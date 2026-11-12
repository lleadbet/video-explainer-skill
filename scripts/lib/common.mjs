import fs from 'node:fs';
import path from 'node:path';
import { SKILL_DIR, startServer } from './server.mjs';

export { SKILL_DIR, startServer };

export const SETUP_HINT =
  `cd ${path.join(SKILL_DIR, 'scripts')} && npm install && npx playwright install chromium`;

export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    fail(`Dependencies are not installed. Run:\n  ${SETUP_HINT}`);
  }
}

export function fail(msg) {
  console.error(`error: ${msg}`);
  process.exit(1);
}

/** Minimal argv parser: positional args + --flag value / --flag (boolean). */
export function parseArgs(argv, booleans = []) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    const [k, inline] = a.slice(2).split('=', 2);
    if (inline !== undefined) out[k] = inline;
    else if (booleans.includes(k)) out[k] = true;
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out[k] = argv[++i];
    else out[k] = true;
  }
  return out;
}

export function readProject(dir) {
  if (!dir) fail('missing project directory argument');
  const projectDir = path.resolve(dir);
  const file = path.join(projectDir, 'video.json');
  if (!fs.existsSync(file)) fail(`no video.json in ${projectDir}`);
  let video;
  try { video = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { fail(`video.json is not valid JSON: ${e.message}`); }
  return { projectDir, video };
}

/**
 * Launch Chromium, serve the project and open it in render mode.
 * Returns { browser, server, page, info, errors, openPage, close }.
 * `info` is what the runtime reports: { width, height, fps, duration, scenes, warnings }.
 */
export async function openProject(projectDir, { scale = 1, workers = 1 } = {}) {
  const { chromium } = await loadPlaywright();
  const server = await startServer(projectDir);
  let browser;
  try {
    browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb', '--hide-scrollbars'] });
  } catch (e) {
    await server.close();
    fail(`could not launch Chromium (${e.message.split('\n')[0]}).\n  Run: ${SETUP_HINT}`);
  }
  const errors = [];

  async function openPage(viewport) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: scale });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
    page.on('requestfailed', (r) => errors.push(`request failed: ${r.url()}`));
    page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
    await page.goto(server.url + '?render=1');
    const info = await page.evaluate(() => window.__ready);
    return { page, info };
  }

  // First page at a provisional size to learn the real video size.
  const probe = await openPage({ width: 1920, height: 1080 });
  let { page, info } = probe;
  if (info.error) {
    await browser.close(); await server.close();
    fail(`project failed to load: ${info.error}${errors.length ? '\n  ' + errors.join('\n  ') : ''}`);
  }
  if (info.width !== 1920 || info.height !== 1080) {
    await page.context().close();
    ({ page, info } = await openPage({ width: info.width, height: info.height }));
  }
  const viewport = { width: info.width, height: info.height };
  return {
    browser, server, page, info, errors,
    openPage: () => openPage(viewport).then((r) => r.page),
    close: async () => { await browser.close(); await server.close(); },
  };
}

/** Seek the page and wait for the frame to paint. */
export async function seek(page, t) {
  await page.evaluate((t) => window.__seek(t), t);
}

export function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = (t - m * 60).toFixed(2).padStart(5, '0');
  return `${m}:${s}`;
}
