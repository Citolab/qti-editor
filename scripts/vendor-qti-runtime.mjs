#!/usr/bin/env node
/**
 * Copy the published `@citolab/qti-components` runtime artifacts into the
 * workspace's `public/qti-runtime/` so the editor's dev server and vitest
 * browser tests can serve them at the URL `/qti-runtime/{index.js,item.css}`.
 *
 * Sources from apps/e2e/node_modules first (where the umbrella is added as
 * a devDep + yalc-linked), falling back to the workspace root's node_modules.
 *
 * As of @citolab/qti-components@9, the dist bundle no longer inlines `lit` /
 * `lit-html` / `@lit/context` — they're bare specifiers (e.g. `from 'lit'`,
 * `from 'lit/decorators.js'`) that only a bundler or an import map can
 * resolve. `public/` is served as-is by Vite (no import rewriting), so this
 * script also vendors those runtime dependencies into `vendor/<package>/`
 * and writes an import map (`import-map.json`) the iframe harness injects.
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
const jsFiles = [];
for (const file of fs.readdirSync(srcDir)) {
  if (file.endsWith('.map') || file.endsWith('.d.ts')) continue;
  const src = path.join(srcDir, file);
  const dest = path.join(destDir, file);
  if (!fs.statSync(src).isFile()) continue;
  if (file.endsWith('.js')) jsFiles.push(dest);
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) {
    skipped++;
    continue;
  }
  fs.copyFileSync(src, dest);
  copied++;
}
console.log(`[vendor-qti-runtime] ${copied} file(s) copied, ${skipped} already up-to-date`);

// --- Vendor bare-specifier runtime dependencies (lit, lit-html, @lit/context, ...) ---

/** Matches `from '<spec>'`, `from "<spec>"` and dynamic `import('<spec>')`. */
const SPECIFIER_RE = /(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]/g;

/** Extracts bare (non-relative, non-absolute) module specifiers referenced by a file. */
function bareSpecifiersOf(file) {
  const content = fs.readFileSync(file, 'utf8');
  const specs = new Set();
  for (const match of content.matchAll(SPECIFIER_RE)) {
    const spec = match[1];
    if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('http')) continue;
    // Reject false positives from `from "${...}"` inside template-literal strings
    // (not real import specifiers) and anything else with whitespace.
    if (!/^[\w@][\w@./-]*$/.test(spec)) continue;
    specs.add(spec);
  }
  return specs;
}

/** `lit/decorators.js` -> `lit`, `@lit/context` -> `@lit/context`. */
function packageNameOf(specifier) {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

/** Locates an installed package directory, including pnpm's content-store layout. */
function findPackageDir(pkgName) {
  const direct = [
    path.join(root, 'apps/e2e/node_modules', pkgName),
    path.join(root, 'node_modules', pkgName),
  ];
  const directHit = direct.find(p => fs.existsSync(p));
  if (directHit) return directHit;

  const storeKey = `${pkgName.replace('/', '+')}@`;
  for (const base of [path.join(root, 'apps/e2e/node_modules/.pnpm'), path.join(root, 'node_modules/.pnpm')]) {
    if (!fs.existsSync(base)) continue;
    const entry = fs
      .readdirSync(base)
      .filter(e => e.startsWith(storeKey))
      .sort()
      .at(-1);
    if (!entry) continue;
    const pkgDir = path.join(base, entry, 'node_modules', pkgName);
    if (fs.existsSync(pkgDir)) return pkgDir;
  }
  return null;
}

/** Prefers the browser/default export target, skipping node- and types-only conditions. */
function pickDefaultTarget(exportsNode) {
  if (typeof exportsNode === 'string') return exportsNode;
  if (!exportsNode || typeof exportsNode !== 'object') return null;
  for (const key of ['browser', 'default']) {
    if (key in exportsNode) {
      const resolved = pickDefaultTarget(exportsNode[key]);
      if (resolved) return resolved;
    }
  }
  for (const key of Object.keys(exportsNode)) {
    if (key === 'types' || key === 'node' || key === 'development') continue;
    const resolved = pickDefaultTarget(exportsNode[key]);
    if (resolved) return resolved;
  }
  return null;
}

function mainEntryOf(pkgJson) {
  const fromExports = pkgJson.exports && pickDefaultTarget(pkgJson.exports['.']);
  const entry = fromExports ?? pkgJson.module ?? pkgJson.main ?? 'index.js';
  return entry.replace(/^\.\//, '');
}

/** Copies a package's .js files (and their bare specifiers, collected into `outSpecifiers`). */
function copyPackageJsFiles(srcPkgDir, destPkgDir, outSpecifiers) {
  fs.mkdirSync(destPkgDir, { recursive: true });
  for (const entry of fs.readdirSync(srcPkgDir, { withFileTypes: true })) {
    if (entry.name === 'node' || entry.name === 'test' || entry.name === 'development') continue;
    const srcPath = path.join(srcPkgDir, entry.name);
    const destPath = path.join(destPkgDir, entry.name);
    if (entry.isDirectory()) {
      copyPackageJsFiles(srcPath, destPath, outSpecifiers);
    } else if (entry.name.endsWith('.js')) {
      for (const spec of bareSpecifiersOf(srcPath)) outSpecifiers.add(spec);
      if (fs.existsSync(destPath) && fs.statSync(destPath).mtimeMs >= fs.statSync(srcPath).mtimeMs) continue;
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const vendorDestRoot = path.join(destDir, 'vendor');
const importMap = { imports: {} };
const vendoredPackages = new Set();

// BFS: vendoring a package can introduce its own bare specifiers (e.g. `lit`
// itself imports `@lit/reactive-element` and `lit-element`) — keep resolving
// until no new ones turn up.
const pending = new Set([...jsFiles.flatMap(f => [...bareSpecifiersOf(f)])].map(packageNameOf));

while (pending.size > 0) {
  const pkgName = pending.values().next().value;
  pending.delete(pkgName);
  if (vendoredPackages.has(pkgName)) continue;
  vendoredPackages.add(pkgName);

  const pkgDir = findPackageDir(pkgName);
  if (!pkgDir) {
    console.error(
      `[vendor-qti-runtime] Could not locate installed package for bare specifier "${pkgName}" — skipping.`,
    );
    continue;
  }
  const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));
  const mainEntry = mainEntryOf(pkgJson);
  const destPkgDir = path.join(vendorDestRoot, pkgName);
  const discoveredSpecifiers = new Set();
  copyPackageJsFiles(pkgDir, destPkgDir, discoveredSpecifiers);

  importMap.imports[pkgName] = `/qti-runtime/vendor/${pkgName}/${mainEntry}`;
  importMap.imports[`${pkgName}/`] = `/qti-runtime/vendor/${pkgName}/`;

  for (const spec of discoveredSpecifiers) {
    const dep = packageNameOf(spec);
    if (!vendoredPackages.has(dep)) pending.add(dep);
  }
}

fs.writeFileSync(path.join(destDir, 'import-map.json'), `${JSON.stringify(importMap, null, 2)}\n`);
console.log(
  `[vendor-qti-runtime] import map written for: ${[...vendoredPackages].join(', ') || '(no bare specifiers found)'}`,
);
