#!/usr/bin/env node
/**
 * Add/remove the root `pnpm.overrides` entries that point @qti-components/*
 * at the yalc copies under packages/prose-qti/.yalc.
 *
 * `yalc add`/`yalc retreat` only rewrite the *consuming* package.json specs.
 * They know nothing about pnpm overrides, so transitive @qti-components deps
 * (pulled in by other packages) would still resolve to the registry version and
 * you'd end up with two copies of the same custom element registry. The
 * overrides force every resolution — direct and transitive — onto the yalc copy.
 *
 * Because nothing reverses them, leaving them behind after `yalc retreat`
 * leaves the lockfile pinned to file:.yalc paths that no longer make sense.
 *
 *   node scripts/yalc-overrides.mjs add     → mirror packages/prose-qti/yalc.lock into overrides
 *   node scripts/yalc-overrides.mjs remove  → drop every override pointing into a .yalc dir
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifestPath = path.join(root, 'package.json');
const linkedDir = 'packages/prose-qti';

const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeJson = (p, v) => fs.writeFileSync(p, `${JSON.stringify(v, null, 2)}\n`);

const isYalcOverride = value => typeof value === 'string' && value.includes('/.yalc/');

function add() {
  const lockPath = path.join(root, linkedDir, 'yalc.lock');
  if (!fs.existsSync(lockPath)) {
    console.log(`No ${linkedDir}/yalc.lock — nothing to override. Run \`pnpm yalc:init\` first.`);
    return;
  }

  const linked = Object.keys(readJson(lockPath).packages || {}).sort();
  if (linked.length === 0) {
    console.log(`${linkedDir}/yalc.lock lists no packages — nothing to override.`);
    return;
  }

  const manifest = readJson(manifestPath);
  manifest.pnpm ??= {};
  manifest.pnpm.overrides ??= {};

  for (const name of linked) {
    manifest.pnpm.overrides[name] = `file:./${linkedDir}/.yalc/${name}`;
  }

  writeJson(manifestPath, manifest);
  console.log(`Added ${linked.length} yalc override(s) to root package.json.`);
}

function remove() {
  const manifest = readJson(manifestPath);
  const overrides = manifest.pnpm?.overrides;
  if (!overrides) {
    console.log('No pnpm.overrides in root package.json — nothing to remove.');
    return;
  }

  const stale = Object.entries(overrides).filter(([, value]) => isYalcOverride(value));
  if (stale.length === 0) {
    console.log('No yalc overrides in root package.json — already clean.');
    return;
  }

  for (const [name] of stale) delete overrides[name];
  if (Object.keys(overrides).length === 0) delete manifest.pnpm.overrides;
  if (manifest.pnpm && Object.keys(manifest.pnpm).length === 0) delete manifest.pnpm;

  writeJson(manifestPath, manifest);
  console.log(`Removed ${stale.length} yalc override(s) from root package.json:`);
  for (const [name] of stale) console.log(`  ${name}`);
}

const command = process.argv[2];

if (command === 'add') {
  add();
} else if (command === 'remove') {
  remove();
} else {
  console.error('Usage: node scripts/yalc-overrides.mjs <add|remove>');
  process.exit(1);
}
