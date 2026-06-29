#!/usr/bin/env node
/**
 * First-time link of the locally-yalc-published @qti-components/* packages
 * into each consuming workspace package. Run once on a fresh checkout to
 * establish yalc state. Afterwards the daily retreat/restore cycle
 * (`pnpm yalc:remove-all` / `pnpm yalc:add`) is enough.
 *
 * Daily counterparts (yalc builtins, wired in root package.json):
 *   pnpm yalc:add         → pnpm -r exec yalc restore
 *   pnpm yalc:remove-all  → pnpm -r exec yalc retreat --all
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const consumers = [
  {
    dir: 'packages/prose-qti',
    packages: [
      '@qti-components/associate-interaction',
      '@qti-components/base',
      '@qti-components/choice-interaction',
      '@qti-components/extended-text-interaction',
      '@qti-components/hottext-interaction',
      '@qti-components/inline-choice-interaction',
      '@qti-components/interactions-core',
      '@qti-components/match-interaction',
      '@qti-components/order-interaction',
      '@qti-components/text-entry-interaction',
      '@qti-components/transformers',
      '@qti-components/utilities',
    ],
  },
  { dir: 'apps/e2e', packages: ['@qti-components/theme', '@citolab/qti-components'] },
  { dir: 'apps/qti-prosemirror-item', packages: ['@qti-components/theme', '@qti-components/transformers'] },
  { dir: 'apps/qti-prosekit-item', packages: ['@qti-components/theme'] },
  { dir: 'apps/qti-prosekit-app', packages: ['@qti-components/theme'] },
  { dir: 'apps/site', packages: ['@qti-components/theme'] },
];

const root = fileURLToPath(new URL('..', import.meta.url));

for (const { dir, packages } of consumers) {
  const cwd = resolve(root, dir);
  console.log(`yalc add  ${packages.length} package(s) in ${dir}`);
  execSync(`yalc add ${packages.join(' ')}`, { cwd, stdio: 'inherit' });
}

console.log('\nResolving file: deps via pnpm install...');
execSync('pnpm install', { cwd: root, stdio: 'inherit' });

console.log('\n✅ yalc dev mode restored.');
