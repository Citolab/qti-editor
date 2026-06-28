#!/usr/bin/env node
/**
 * Self-heal step run before every `pnpm install`. If the committed
 * pnpm-local-overrides.json has `enabled: true` and any of the .tgz
 * tarballs it points at don't exist locally yet (fresh clone, switched
 * branches, deleted the cache), run the sync to generate them. After that
 * the install proceeds normally — pnpm reads the overrides via
 * .pnpmfile.cjs and resolves to the now-present tarballs.
 *
 * No-op when overrides are disabled. Safe to run repeatedly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const configPath = path.join(rootDir, 'pnpm-local-overrides.json');

if (!fs.existsSync(configPath)) process.exit(0);

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
if (config.enabled !== true) process.exit(0);

const overrides = config.overrides && typeof config.overrides === 'object' ? config.overrides : {};
const fileOverrides = Object.values(overrides).filter(v => typeof v === 'string' && v.startsWith('file:'));

const missing = fileOverrides.filter(spec => {
  const localPart = spec.replace(/^file:/, '');
  const resolved = path.isAbsolute(localPart) ? localPart : path.join(rootDir, localPart);
  return !fs.existsSync(resolved);
});

if (missing.length === 0) process.exit(0);

console.log(`[qti-overrides] ${missing.length} pinned tarball(s) missing — running sync...`);
const result = spawnSync('node', [path.join(rootDir, 'scripts/qti-local-overrides-sync.mjs'), 'sync'], {
  cwd: rootDir,
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
