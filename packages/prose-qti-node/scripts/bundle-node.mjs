import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

/**
 * Bundle this package's single entry point so plain Node can import it.
 *
 * ## Why this package exists at all
 *
 * The conversion functions are dependency-light — the bundle below imports only linkedom and
 * prosemirror-*. Everything else, including all 13 `@qti-components/*` packages and Lit, is INLINED.
 * But they used to ship inside @citolab/prose-qti, whose manifest carries 19 dependencies and 6
 * peers sized for BROWSER consumers. A Node-only consumer installing it therefore paid for a
 * component graph the code it calls never touches, and collected `lit` / `@lit/context` peer
 * warnings on the way. Reported from a Node-only MCP server integration; the functions worked, the
 * install was the problem.
 *
 * Splitting the manifest is the whole fix. The bundle itself did not need to change.
 *
 * ## Why bundling is needed
 *
 * `@qti-components/*` dists contain extensionless relative imports
 * (`from './elements/qti-associable-hotspot'`). They compile with
 * `moduleResolution: bundler`, which permits that and emits it verbatim — legal TypeScript, legal
 * for a bundler, and rejected outright by Node's ESM resolver with ERR_UNSUPPORTED_DIR_IMPORT.
 *
 * That is not something this package can fix, and it is not something a consumer should have to
 * work around with a resolve hook. A bundler resolves those specifiers at BUILD time, which is the
 * job bundlers exist for. (In prose-qti, where this script used to live, everything OTHER than the
 * node entry stays plain `tsc` output — bundling is only ever applied here.)
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
const proseQtiDist = fileURLToPath(new URL('../../prose-qti/dist/', import.meta.url));

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

/*
 * Read prose-qti's dist, write ours. The workspace devDependency on @citolab/prose-qti is what
 * orders `pnpm -r --sort` so that dist exists by the time this runs; if it does not, esbuild fails
 * loudly on a missing entry point rather than emitting something half-formed.
 */
const entry = `${proseQtiDist}node/index.js`;
const outfile = `${packageRoot}dist/index.js`;

await build({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  external: EXTERNAL,
  logLevel: 'warning'
});

// Types are produced separately by scripts/bundle-types.mjs — esbuild does not touch .d.ts.
console.log('✓ bundled dist/index.js for plain Node');
