/**
 * The `sideEffects` manifest field, and the convention it depends on.
 *
 * This package registers its custom elements from bare side-effect imports — `import
 * '@citolab/prose-qti/components/register'` pulls in a barrel of `import './match/register.js'`
 * lines, and nothing consumes a binding from any of them. A bundler is free to delete an import like
 * that unless `sideEffects` says otherwise, and when it does the failure is total and silent: every
 * QTI element stays an unupgraded `HTMLElement`, so it has no shadow root, no adopted stylesheets,
 * and every `::part()` rule in the theme matches nothing. No build error, no console error — the
 * editor just renders unstyled.
 *
 * That is not hypothetical. It shipped. The field named only `./dist/**` while the workspace
 * resolves this package through tsconfig paths to `./src/**` (see `tsconfig.base.json`), so no
 * pattern matched the module actually being bundled, every module was treated as side-effect-free,
 * and the deployed editor lost its entire component layer. Dev was unaffected, because the dev
 * server does not tree-shake — which is exactly why this needs a test rather than a look.
 *
 * Two invariants, and the field is only correct while both hold:
 *
 *   1. Both spellings are declared. The package is consumed as `src` inside this workspace and as
 *      `dist` by anyone who installs it, and a pattern for one says nothing about the other.
 *   2. Every side-effectful module is called `register`. The patterns identify side effects BY
 *      FILENAME, so a `customElements.define` anywhere else is invisible to them.
 *
 * Vite reads the field in `loadPackageData`: an entry containing `/` is used as written, resolved
 * against the package directory; an entry without one gets a leading globstar. Matching is picomatch,
 * where a globstar spans zero or more segments — so the `dist/components` pattern covers
 * `dist/components/register.js` as well as `dist/components/match/register.js`. Asserting the
 * convention rather than re-implementing that matcher keeps this test from disagreeing with the
 * bundler about glob semantics.
 */
/* eslint-disable import/no-nodejs-modules -- a *.node.test.ts runs in Node by definition; the rule
   guards the browser-targeted source, which this is not. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const srcRoot = join(packageRoot, 'src');

const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8')) as {
  sideEffects?: unknown;
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap(entry => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walk(full);
    return full.endsWith('.ts') ? [full] : [];
  });
}

const sourceFiles = walk(srcRoot);

/** Modules that register a custom element — the ones a bundler must not drop. */
const definingModules = sourceFiles
  .filter(file => !file.endsWith('.test.ts'))
  .filter(file => readFileSync(file, 'utf8').includes('customElements.define'))
  .map(file => relative(packageRoot, file))
  .sort();

describe('the sideEffects manifest field', () => {
  test('is a pattern list, not a blanket boolean', () => {
    // `true` would work but costs every consumer the whole package; `false` is the bug above.
    expect(Array.isArray(manifest.sideEffects)).toBe(true);
    expect(manifest.sideEffects as string[]).not.toHaveLength(0);
  });

  test('covers the src tree, which is how this workspace resolves the package', () => {
    expect(manifest.sideEffects as string[]).toContain('./src/components/**/register.ts');
  });

  test('covers the dist tree, which is how an installed consumer resolves it', () => {
    expect(manifest.sideEffects as string[]).toContain('./dist/components/**/register.js');
  });
});

describe('the convention the patterns rely on', () => {
  test('every module that registers a custom element is named register.ts', () => {
    const misplaced = definingModules.filter(file => !file.endsWith('/register.ts'));

    // If this fails, either move the `customElements.define` into the sibling `register.ts` or add a
    // pattern for the new location to `sideEffects` — silently doing neither loses the element in
    // production builds only.
    expect(misplaced).toEqual([]);
  });

  test('every such module sits under src/components, where the patterns look', () => {
    const outside = definingModules.filter(file => !file.startsWith('src/components/'));

    expect(outside).toEqual([]);
  });

  test('there is at least one, so the checks above cannot pass by finding nothing', () => {
    expect(definingModules.length).toBeGreaterThan(10);
  });
});
