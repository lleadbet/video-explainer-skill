#!/usr/bin/env node
// Live preview of a project in a browser: play/pause, scrub, captions.
//   node serve.mjs <project> [--port 5173]
// Reload the page after editing scenes. Add ?t=12.5 or ?scene=<id> to jump.
import { parseArgs, readProject, startServer } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
const { projectDir } = readProject(args._[0]);
const host = args.host || '127.0.0.1';
const { url } = await startServer(projectDir, { port: +(args.port || 5173), host });
console.log(`Previewing ${projectDir}\n  ${url}\nKeys: space play/pause, ←/→ 1s (shift: 1 frame), c captions. Ctrl+C to stop.`);
