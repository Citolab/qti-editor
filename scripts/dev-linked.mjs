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
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const qtiPath = process.env.QTI_COMPONENTS_PATH || '/Users/patrickklein/Projects/Edtech/QTI/QTI-Components';
const editorScript = process.env.EDITOR_APP || 'dev:prosemirror-item';

if (!existsSync(qtiPath)) {
  console.error(`❌ qti-components workspace not found at ${qtiPath}`);
  console.error('   Set QTI_COMPONENTS_PATH to its absolute location.');
  process.exit(1);
}

/**
 * Find every `yalc.lock` in the workspace (skipping `node_modules`, `.yalc`,
 * `.git`). Each lock pairs with a sibling `package.json` whose dep specs must
 * reference `file:.yalc/<name>` for every linked package; otherwise the lock
 * and the manifest have drifted (typically because a hook or pnpm install
 * rewrote the spec back to the registry version).
 */
function findYalcLocks(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.yalc' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) findYalcLocks(full, found);
    else if (entry.name === 'yalc.lock') found.push(full);
  }
  return found;
}

/** Returns the names of packages declared linked in the lock whose sibling
 *  package.json does NOT reference `file:.yalc/<name>` (drift). */
function driftedPackages(lockPath) {
  const pkgJsonPath = join(dirname(lockPath), 'package.json');
  if (!existsSync(pkgJsonPath)) return [];
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}), ...(pkg.peerDependencies ?? {}) };
  const drifted = [];
  for (const [name, entry] of Object.entries(lock.packages ?? {})) {
    if (!entry.file) continue;
    const spec = allDeps[name];
    if (typeof spec !== 'string' || !spec.startsWith('file:.yalc/')) drifted.push(name);
  }
  return drifted;
}

const lockPaths = findYalcLocks(root);

if (lockPaths.length === 0) {
  console.log('⚙️  No yalc state — running pnpm yalc:init (first-time link)...');
  execSync('pnpm yalc:init', { cwd: root, stdio: 'inherit' });
} else {
  const driftReport = lockPaths
    .map(lockPath => ({ lockPath, drifted: driftedPackages(lockPath) }))
    .filter(({ drifted }) => drifted.length > 0);

  if (driftReport.length > 0) {
    console.log('⚙️  yalc state drift detected — running pnpm yalc:add to restore...');
    for (const { lockPath, drifted } of driftReport) {
      console.log(`   ${relative(root, dirname(lockPath))}: ${drifted.join(', ')}`);
    }
    execSync('pnpm yalc:add', { cwd: root, stdio: 'inherit' });
  }
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
