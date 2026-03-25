import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const registrySourcePath = join(rootDir, 'registry.json');

const registrySource = JSON.parse(readFileSync(registrySourcePath, 'utf-8'));
const REGISTRY_BASE_URL = process.env.REGISTRY_BASE_URL ?? 'https://qti-editor.citolab.nl/r';

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

function transformContent(content, filePath) {
  // Rewrite internal @qti-editor/ui imports to @/ alias
  content = content.replace(/@qti-editor\/ui\/(components|lib|hooks|types)/g, '@/$1');

  // Strip types via esbuild (preserves decorators, accessor, class fields as-is)
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    const result = esbuild.transformSync(content, {
      loader: filePath.endsWith('.tsx') ? 'tsx' : 'ts',
      format: 'esm',
      target: 'esnext',
    });
    content = result.code;
  }

  return content;
}

const distRegistry = {
  $schema: registrySource.$schema,
  name: registrySource.name,
  homepage: registrySource.homepage,
  items: [],
};

for (const item of registrySource.items) {
  const distItem = {
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies ?? [],
    devDependencies: item.devDependencies ?? [],
    registryDependencies: (item.registryDependencies ?? []).map(dep =>
      dep.startsWith('http') ? dep : `${REGISTRY_BASE_URL}/${dep}.json`
    ),
    files: [],
  };

  for (const file of item.files) {
    const sourcePath = join(rootDir, file.source ?? file.path);
    const originalPath = file.path;
    const jsPath = originalPath.replace(/\.tsx?$/, '.js');
    const distPath = join(distDir, jsPath);
    const content = transformContent(readFileSync(sourcePath, 'utf-8'), originalPath);

    mkdirSync(dirname(distPath), { recursive: true });
    writeFileSync(distPath, content);

    distItem.files.push({
      path: jsPath,
      type: file.type,
      target: file.target,
    });
  }

  distRegistry.items.push(distItem);
}

const componentsJsonPath = join(rootDir, 'components.json');
cpSync(componentsJsonPath, join(distDir, 'components.json'));
writeFileSync(join(distDir, 'registry.json'), JSON.stringify(distRegistry, null, 2));
