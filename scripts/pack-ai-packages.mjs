#!/usr/bin/env node
/**
 * Build and pack the conversational authoring packages into plain tarballs.
 *
 *   node scripts/pack-ai-packages.mjs [outDir]      default: dist-packs/
 *
 * The tarballs are what a consumer installs — `pnpm pack` substitutes `workspace:*` with the
 * concrete version, so nothing downstream needs this workspace. Coco vendors them under
 * `vendor/`; the portability check installs them into a scratch project. Run this whenever the
 * packages change, then copy the result into the consumer and reinstall there.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? resolve(root, 'dist-packs'));
const packages = ['qti-ai-core', 'qti-ai-prosemirror', 'qti-ai-ui'];

mkdirSync(out, { recursive: true });
for (const file of readdirSync(out)) if (/^citolab-qti-ai-.*\.tgz$/.test(file)) rmSync(resolve(out, file));

for (const name of packages) {
  const dir = resolve(root, 'packages', name);
  rmSync(resolve(dir, 'dist'), { recursive: true, force: true });
  execFileSync('pnpm', ['--filter', `@citolab/${name}`, 'build'], { cwd: root, stdio: 'inherit' });
  execFileSync('pnpm', ['pack', '--pack-destination', out], { cwd: dir, stdio: 'inherit' });
}
console.log(`packed ${packages.length} packages into ${out}`);
