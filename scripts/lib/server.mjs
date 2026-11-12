// Static server for a video project.
//   /             -> generated index.html (unless the project ships its own)
//   /__runtime/*  -> <skill>/runtime
//   /__vendor/*   -> <skill>/scripts/node_modules
//   /*            -> project directory (video.json, scenes/, assets/, style.css)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_DIR = path.resolve(here, '..', '..');
const RUNTIME_DIR = path.join(SKILL_DIR, 'runtime');
const VENDOR_DIR = path.join(SKILL_DIR, 'scripts', 'node_modules');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

const GSAP_FILES = [
  'gsap', 'DrawSVGPlugin', 'MotionPathPlugin', 'MorphSVGPlugin', 'SplitText',
  'TextPlugin', 'ScrambleTextPlugin', 'CustomEase',
];

function indexHtml(projectDir) {
  let title = 'Video';
  try { title = JSON.parse(fs.readFileSync(path.join(projectDir, 'video.json'), 'utf8')).title || title; } catch {}
  const extraCss = fs.existsSync(path.join(projectDir, 'style.css'))
    ? '<link rel="stylesheet" href="/style.css">' : '';
  const scripts = GSAP_FILES.map((f) => `<script src="/__vendor/gsap/dist/${f}.min.js"></script>`).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title.replace(/</g, '&lt;')}</title>
<link rel="stylesheet" href="/__vendor/@fontsource-variable/inter/index.css">
<link rel="stylesheet" href="/__vendor/@fontsource-variable/jetbrains-mono/index.css">
<link rel="stylesheet" href="/__runtime/base.css">
${extraCss}
${scripts}
</head>
<body>
<script type="module" src="/__runtime/runtime.js"></script>
</body>
</html>`;
}

function safeJoin(root, rel) {
  const p = path.resolve(root, '.' + path.sep + rel);
  return p === root || p.startsWith(root + path.sep) ? p : null;
}

export function startServer(projectDir, { port = 0, host = '127.0.0.1' } = {}) {
  projectDir = path.resolve(projectDir);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const pathname = decodeURIComponent(url.pathname);
    let file;
    if (pathname === '/' || pathname === '/index.html') {
      const own = path.join(projectDir, 'index.html');
      if (!fs.existsSync(own)) {
        res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' });
        return res.end(indexHtml(projectDir));
      }
      file = own;
    } else if (pathname.startsWith('/__runtime/')) {
      file = safeJoin(RUNTIME_DIR, pathname.slice('/__runtime/'.length));
    } else if (pathname.startsWith('/__vendor/')) {
      file = safeJoin(VENDOR_DIR, pathname.slice('/__vendor/'.length));
    } else {
      file = safeJoin(projectDir, pathname.slice(1));
    }
    // The narration manifest is optional; answer `null` rather than a 404 the renderer would flag.
    if (pathname === '/audio/manifest.json' && file && !fs.existsSync(file)) {
      res.writeHead(200, { 'content-type': MIME['.json'], 'cache-control': 'no-store' });
      return res.end('null');
    }
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end(`Not found: ${pathname}`);
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const { port: actual } = server.address();
      resolve({
        url: `http://${host}:${actual}/`,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}
