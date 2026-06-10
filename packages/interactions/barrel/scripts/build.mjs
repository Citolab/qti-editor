import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, '..');
const workspaceRoot = join(packageRoot, '..');
const distRoot = join(packageRoot, 'dist');

const qtiRoot = join(workspaceRoot, '..', 'qti');

const prerequisitePackages = [
  ['@qti-editor/interfaces', join(workspaceRoot, '..', 'interfaces')],
  ['@qti-editor/interaction-shared', join(workspaceRoot, 'shared')],
  ['@qti-editor/qti-rubric-block', join(qtiRoot, 'rubric-block')],
  ['@qti-editor/interaction-associate', join(workspaceRoot, 'associate')],
  ['@qti-editor/interaction-choice', join(workspaceRoot, 'choice')],
  ['@qti-editor/interaction-gap-match', join(workspaceRoot, 'gap-match')],
  ['@qti-editor/interaction-hottext', join(workspaceRoot, 'hottext')],
  ['@qti-editor/interaction-inline-choice', join(workspaceRoot, 'inline-choice')],
  ['@qti-editor/interaction-match', join(workspaceRoot, 'match')],
  ['@qti-editor/interaction-order', join(workspaceRoot, 'order')],
  ['@qti-editor/interaction-select-point', join(workspaceRoot, 'select-point')],
  ['@qti-editor/interaction-text-entry', join(workspaceRoot, 'text-entry')],
  ['@qti-editor/interaction-extended-text', join(workspaceRoot, 'extended-text')],
];

const packages = [
  ['shared', join(workspaceRoot, 'shared')],
  ['qti-rubric-block', join(qtiRoot, 'rubric-block')],
  ['associate', join(workspaceRoot, 'associate')],
  ['choice', join(workspaceRoot, 'choice')],
  ['gap-match', join(workspaceRoot, 'gap-match')],
  ['hottext', join(workspaceRoot, 'hottext')],
  ['inline-choice', join(workspaceRoot, 'inline-choice')],
  ['match', join(workspaceRoot, 'match')],
  ['order', join(workspaceRoot, 'order')],
  ['select-point', join(workspaceRoot, 'select-point')],
  ['text-entry', join(workspaceRoot, 'text-entry')],
  ['extended-text', join(workspaceRoot, 'extended-text')],
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

function ensureBuilt(packageName, packageRootDir) {
  const sourceDist = join(packageRootDir, 'dist');
  if (existsSync(sourceDist)) {
    return;
  }

  execFileSync('pnpm', ['--filter', packageName, 'build'], {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  if (!existsSync(sourceDist)) {
    throw new Error(`Missing built output for ${packageName}: ${sourceDist}`);
  }
}

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

// Build sibling workspace packages first when their dist folders are absent.
for (const [packageName, packageRootDir] of prerequisitePackages) {
  ensureBuilt(packageName, packageRootDir);
}

for (const [subpath, packageRootDir] of packages) {
  const sourceDist = join(packageRootDir, 'dist');
  const targetDist = join(distRoot, subpath);

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

// Aggregate side-effect register module: registers every interaction custom
// element and the shared sub-elements they depend on. Importing this once
// registers them all (`import '@qti-editor/interactions/register'`).
const interactionRegisterSubpaths = [
  'associate',
  'choice',
  'extended-text',
  'gap-match',
  'hottext',
  'inline-choice',
  'match',
  'order',
  'select-point',
  'text-entry',
];
const sharedRegisterElements = [
  'qti-prompt',
  'qti-simple-choice',
  'qti-simple-associable-choice',
  'qti-simple-match-set',
  'qti-gap',
  'qti-gap-text',
];
const registerModule =
  interactionRegisterSubpaths.map(subpath => `import './${subpath}/register.js';`).join('\n') +
  '\n' +
  sharedRegisterElements
    .map(element => `import './shared/components/${element}/register.js';`)
    .join('\n') +
  '\n';
writeFileSync(join(distRoot, 'register.js'), registerModule);
writeFileSync(join(distRoot, 'register.d.ts'), 'export {};\n');

