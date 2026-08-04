import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

/**
 * Flatten prose-qti's node declarations into one self-contained `dist/index.d.ts`.
 *
 * ## Why this is bundled rather than copied
 *
 * `prose-qti/dist/node/index.d.ts` is plain tsc output, so it re-exports from siblings:
 * `../item-roundtrip/convert.js`, `../schema/create-qti-schema.js`, `./dom.js` and so on, which
 * re-export further. Shipping the entry alone gives a consumer a declaration pointing at files that
 * are not in this package; shipping "the files it needs" means maintaining that closure by hand, and
 * the closure changes silently the first time someone adds an import.
 *
 * A declaration bundler computes it instead. Measured today the closure is about ten files across
 * `node/`, `item-roundtrip/` and `schema/`.
 *
 * ## Why this can be dependency-light when the browser package is not
 *
 * The closure reaches `prosemirror-model` and nothing else external — no `@qti-components`, no
 * `lit`. That is what makes this package possible: the TYPES are as free of the component graph as
 * the bundled JS is. `prosemirror-model` stays external and is declared as a peer, so a consumer
 * resolves one copy of it and ProseMirror's identity comparisons keep working.
 */
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const entry = fileURLToPath(new URL('../../prose-qti/dist/node/index.d.ts', import.meta.url));

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'dts-bundle-generator',
    '--out-file',
    `${packageRoot}dist/index.d.ts`,
    // The bundle inlines everything; only genuinely external packages stay as imports.
    '--external-imports=prosemirror-model',
    '--external-imports=prosemirror-state',
    '--external-imports=prosemirror-commands',
    '--no-banner',
    // See tsconfig.dts.json for why this is not the base config.
    '--project',
    `${packageRoot}tsconfig.dts.json`,
    entry
  ],
  { cwd: packageRoot, stdio: 'inherit' }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('✓ bundled dist/index.d.ts');
