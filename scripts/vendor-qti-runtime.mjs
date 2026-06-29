#!/usr/bin/env node
/**
 * Copy the published `@citolab/qti-components` runtime artifacts into the
 * workspace's `public/qti-runtime/` so the editor's dev server and vitest
 * browser tests can serve them at the URL `/qti-runtime/{index.js,item.css}`.
 *
 * Sources from apps/e2e/node_modules first (where the umbrella is added as
 * a devDep + yalc-linked), falling back to the workspace root's node_modules.
 *
 * Idempotent: skips copying if mtimes already match. Re-runs are cheap.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

const candidates = [
  path.join(root, 'apps/e2e/node_modules/@citolab/qti-components/dist'),
  path.join(root, 'node_modules/@citolab/qti-components/dist'),
];

const srcDir = candidates.find(p => fs.existsSync(p));
if (!srcDir) {
  console.error('[vendor-qti-runtime] Could not find @citolab/qti-components/dist in any of:');
  for (const c of candidates) console.error('  -', c);
  console.error('Run `pnpm install` (or `pnpm yalc:add`) first.');
  process.exit(1);
}

const destDir = path.join(root, 'public/qti-runtime');
fs.mkdirSync(destDir, { recursive: true });

// The umbrella's tsup build is chunked: index.js re-exports from hundreds
// of chunk-*.js files. Need to mirror the whole dist/ so dynamic chunk
// imports resolve. .map files are skipped to keep public/ slim.
let copied = 0;
let skipped = 0;
for (const file of fs.readdirSync(srcDir)) {
  if (file.endsWith('.map') || file.endsWith('.d.ts')) continue;
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (!fs.statSync(src).isFile()) continue;
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
    skipped++;
    continue;
  }
  fs.copyFileSync(src, dest);
  copied++;
}
console.log(`[vendor-qti-runtime] ${copied} file(s) copied, ${skipped} already up-to-date`);
