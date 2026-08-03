import { rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

/**
 * Bundle the `./node` entry point so plain Node can import it.
 *
 * ## Why this exists
 *
 * `@qti-components/*` dists contain extensionless relative imports
 * (`from './elements/qti-associable-hotspot'`). They compile with
 * `moduleResolution: bundler`, which permits that and emits it verbatim — legal TypeScript, legal
 * for a bundler, and rejected outright by Node's ESM resolver with ERR_UNSUPPORTED_DIR_IMPORT.
 *
 * That is not something this package can fix, and it is not something a consumer should have to
 * work around with a resolve hook. A bundler resolves those specifiers at BUILD time, which is the
 * job bundlers exist for. Everything else in this package stays plain `tsc` output.
 *
 * ## Bundled from dist, not from source
 *
 * Deliberate. Pointing esbuild at `src/node/index.ts` would make it re-compile the whole descriptor
 * graph from TypeScript, including the Lit components those descriptors reach — and Lit's
 * decorators do not survive an arbitrary transpiler's decorator implementation ("Unsupported
 * decorator location: field", which is exactly how the tsx attempt died). Bundling the already
 * emitted JS sidesteps all of it: esbuild only resolves and concatenates.
 *
 * ## What stays external
 *
 * Real, well-formed packages that Node can resolve on its own. Inlining them would bloat the bundle
 * and, worse, give a consumer a second private copy of prosemirror-model — which matters, because
 * ProseMirror compares node types by identity.
 */
const packageRoot = fileURLToPath(new URL('..', import.meta.url));

const EXTERNAL = [
  'linkedom',
  'prosemirror-model',
  'prosemirror-state',
  'prosemirror-schema-basic',
  'prosemirror-schema-list',
  'prosemirror-tables',
  'prosemirror-commands',
  'prosemirror-keymap',
  'prosemirror-history',
  'prosemirror-view',
  'prosemirror-transform'
];

const entry = `${packageRoot}dist/node/index.js`;
const temp = `${packageRoot}dist/node/index.bundled.mjs`;

await build({
  entryPoints: [entry],
  outfile: temp,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: EXTERNAL,
  logLevel: 'warning',
  // Keep the declaration file tsc already wrote; esbuild does not touch .d.ts.
  allowOverwrite: false
});

// Replace the tsc-emitted entry with the bundle. `dist/node/index.d.ts` still describes it.
await rm(entry);
await rename(temp, entry);

console.log('✓ bundled dist/node/index.js for plain Node');
