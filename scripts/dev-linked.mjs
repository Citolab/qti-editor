#!/usr/bin/env node
/**
 * Linked dev mode — runs the qti-components build watcher and the editor
 * (qti-prosemirror-item) in parallel so changes in qti-components rebuild and
 * propagate into the editor via yalc.
 *
 * Defaults to the prosemirror-item app on port 5175. Override the editor app
 * with `EDITOR_APP=dev:prosekit-app pnpm dev:linked` (uses the package script
 * names). Override the qti-components path with `QTI_COMPONENTS_PATH=...`.
 *
 * Preflight:
 *   - Verifies the qti-components workspace exists.
 *   - If yalc state is missing (no yalc.lock in packages/prose-qti), runs
 *     `pnpm yalc:add` to restore it.
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const qtiPath = process.env.QTI_COMPONENTS_PATH || '/Users/patrickklein/Projects/Edtech/QTI/QTI-Components';
const editorScript = process.env.EDITOR_APP || 'dev:prosemirror-item';

if (!existsSync(qtiPath)) {
  console.error(`❌ qti-components workspace not found at ${qtiPath}`);
  console.error('   Set QTI_COMPONENTS_PATH to its absolute location.');
  process.exit(1);
}

const yalcLock = resolve(root, 'packages/prose-qti/yalc.lock');
const pkgJson = resolve(root, 'packages/prose-qti/package.json');
const hasLock = existsSync(yalcLock);
const hasYalcLink = hasLock && /"file:\.yalc\//.test(execSync(`cat ${JSON.stringify(pkgJson)}`).toString());

if (!hasLock) {
  console.log('⚙️  No yalc state — running pnpm yalc:init (first-time link)...');
  execSync('pnpm yalc:init', { cwd: root, stdio: 'inherit' });
} else if (!hasYalcLink) {
  console.log('⚙️  yalc state retreated (e.g. by pre-commit) — running pnpm yalc:add to restore...');
  execSync('pnpm yalc:add', { cwd: root, stdio: 'inherit' });
}

console.log(`🚀 Starting linked dev mode`);
console.log(`   components watcher: ${qtiPath}`);
console.log(`   editor:             pnpm ${editorScript}\n`);

const child = spawn(
  'pnpm',
  [
    'exec',
    'concurrently',
    '--kill-others',
    '--names',
    'components,editor',
    '--prefix-colors',
    'cyan,magenta',
    `pnpm --dir ${JSON.stringify(qtiPath)} watch`,
    `pnpm ${editorScript}`,
  ],
  { cwd: root, stdio: 'inherit' },
);

const forward = sig => () => child.kill(sig);
process.on('SIGINT', forward('SIGINT'));
process.on('SIGTERM', forward('SIGTERM'));
child.on('exit', code => process.exit(code ?? 0));
