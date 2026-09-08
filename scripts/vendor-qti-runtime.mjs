#!/usr/bin/env node
/**
 * Bundle the published `@citolab/qti-components` runtime into the workspace's
 * `public/qti-runtime/` so the editor's dev server and vitest browser tests can
 * serve it at the URL `/qti-runtime/{index.js,item.css}`.
 *
 * Sources from apps/e2e/node_modules first (where the umbrella is added as
 * a devDep + yalc-linked), falling back to the workspace root's node_modules.
 *
 * ## Why this bundles instead of copying
 *
 * It used to copy `dist/*.js` verbatim. That cannot work for the iframe harness:
 * the umbrella's dist is chunked AND leaves Lit external, so the chunks carry
 * BARE specifiers — `import { html } from "lit"`, `@lit/context`,
 * `lit/directives/repeat.js` and friends. `public/` is served as static files
 * with no transform, so the browser resolves those itself and refuses:
 *
 *     Failed to resolve module specifier "lit". Relative references must start
 *     with either "/", "./", or "../".
 *
 * The module then never evaluates, no custom element registers, and every
 * runtime test fails on `qti-runtime did not signal __QTI_READY__`.
 *
 * Bundling resolves Lit at BUILD time and inlines it, exactly as
 * `packages/prose-qti-node/scripts/bundle-node.mjs` does for the same reason.
 * One self-contained ESM file, no bare specifiers, no chunk graph to keep in
 * sync.
 *
 * ## Why the old copy step appeared to work
 *
 * It skipped any file whose destination mtime was already >= the source's.
 * npm-extracted files carry old mtimes, so after the first vendoring the check
 * never fired again and `public/qti-runtime/` silently kept a long-stale copy
 * from before Lit was externalised. The staleness was the only reason the
 * tests passed; the first install that refreshed those mtimes replaced the
 * working copy with an unloadable one. Bundling is regenerated every run, so
 * there is no stale state to depend on.
 */
import { existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));

const candidates = [
  path.join(root, 'apps/e2e/node_modules/@citolab/qti-components/dist'),
  path.join(root, 'node_modules/@citolab/qti-components/dist'),
];

const srcDir = candidates.find(p => existsSync(p));
if (!srcDir) {
  console.error('[vendor-qti-runtime] Could not find @citolab/qti-components/dist in any of:');
  for (const c of candidates) console.error('  -', c);
  console.error('Run `pnpm install` (or `pnpm yalc:add`) first.');
  process.exit(1);
}

const destDir = path.join(root, 'public/qti-runtime');

// Rebuilt from scratch: a partial refresh is what caused the stale-copy bug,
// and leftover chunk-*.js from a previous version only serve to confuse.
rmSync(destDir, { recursive: true, force: true });
mkdirSync(destDir, { recursive: true });

await build({
  entryPoints: [path.join(srcDir, 'index.js')],
  outfile: path.join(destDir, 'index.js'),
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  // Bundled from dist rather than source for the same reason bundle-node.mjs
  // is: Lit's decorators do not survive an arbitrary transpiler, and esbuild
  // only has to resolve and concatenate already-emitted JS.
  logLevel: 'warning',
});

const css = path.join(srcDir, 'item.css');
if (existsSync(css)) copyFileSync(css, path.join(destDir, 'item.css'));

console.log('[vendor-qti-runtime] bundled index.js + item.css into public/qti-runtime/');
