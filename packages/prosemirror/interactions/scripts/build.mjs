import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const workspaceRoot = join(packageRoot, '..');
const distRoot = join(packageRoot, 'dist');

const packages = [
  ['associate', 'interaction-associate'],
  ['choice', 'interaction-choice'],
  ['extended-text', 'interaction-extended-text'],
  ['gap-match', 'interaction-gap-match'],
  ['hottext', 'interaction-hottext'],
  ['inline-choice', 'interaction-inline-choice'],
  ['match', 'interaction-match'],
  ['order', 'interaction-order'],
  ['select-point', 'interaction-select-point'],
  ['shared', 'interaction-shared'],
  ['text-entry', 'interaction-text-entry'],
];

const importRewrites = [
  ['@qti-editor/interaction-associate', '@qti-editor/interactions/associate'],
  ['@qti-editor/interaction-choice', '@qti-editor/interactions/choice'],
  ['@qti-editor/interaction-extended-text', '@qti-editor/interactions/extended-text'],
  ['@qti-editor/interaction-gap-match', '@qti-editor/interactions/gap-match'],
  ['@qti-editor/interaction-hottext', '@qti-editor/interactions/hottext'],
  ['@qti-editor/interaction-inline-choice', '@qti-editor/interactions/inline-choice'],
  ['@qti-editor/interaction-match', '@qti-editor/interactions/match'],
  ['@qti-editor/interaction-order', '@qti-editor/interactions/order'],
  ['@qti-editor/interaction-select-point', '@qti-editor/interactions/select-point'],
  ['@qti-editor/interaction-shared', '@qti-editor/interactions/shared'],
  ['@qti-editor/interaction-text-entry', '@qti-editor/interactions/text-entry'],
];

function rewriteImports(content) {
  let rewritten = content;
  for (const [from, to] of importRewrites) {
    rewritten = rewritten.replaceAll(from, to);
  }
  return rewritten;
}

function* walkFiles(rootDir) {
  const entries = readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(entryPath);
    } else if (entry.isFile()) {
      yield entryPath;
    }
  }
}

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

for (const [subpath, packageFolder] of packages) {
  const sourceDist = join(workspaceRoot, packageFolder, 'dist');
  const targetDist = join(distRoot, subpath);

  if (!existsSync(sourceDist)) {
    throw new Error(`Missing built output for ${packageFolder}: ${sourceDist}`);
  }

  cpSync(sourceDist, targetDist, { recursive: true });

  for (const filePath of walkFiles(targetDist)) {
    if (!filePath.endsWith('.js') && !filePath.endsWith('.d.ts')) {
      continue;
    }

    const original = readFileSync(filePath, 'utf8');
    const rewritten = rewriteImports(original);
    if (rewritten !== original) {
      writeFileSync(filePath, rewritten);
    }
  }
}

const rootBarrel = packages.map(([subpath]) => `export * from './${subpath}/index.js';`).join('\n') + '\n';
writeFileSync(join(distRoot, 'index.js'), rootBarrel);
writeFileSync(join(distRoot, 'index.d.ts'), rootBarrel);
