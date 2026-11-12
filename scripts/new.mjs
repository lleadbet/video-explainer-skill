#!/usr/bin/env node
// Scaffold a new video project.
//   node new.mjs <dir> [--title "How DNS works"]
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, fail, SKILL_DIR } from './lib/common.mjs';

const args = parseArgs(process.argv.slice(2));
const dir = args._[0];
if (!dir) fail('usage: node new.mjs <dir> [--title "..."]');
const target = path.resolve(dir);
if (fs.existsSync(target) && fs.readdirSync(target).length) fail(`${target} already exists and is not empty`);

fs.cpSync(path.join(SKILL_DIR, 'templates', 'project'), target, { recursive: true });
if (args.title) {
  const f = path.join(target, 'video.json');
  const v = JSON.parse(fs.readFileSync(f, 'utf8'));
  v.title = args.title;
  fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n');
}
console.log(`Created ${target}`);
for (const f of fs.readdirSync(target, { recursive: true })) console.log(`  ${f}`);
