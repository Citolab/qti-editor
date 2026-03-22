import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const registrySourcePath = join(rootDir, 'registry.json');

const registrySource = JSON.parse(readFileSync(registrySourcePath, 'utf-8'));

rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

const aliasPatterns = [
  [/@qti-editor\/ui\/components\//g, '@/components/'],
  [/@qti-editor\/ui\/lib\//g, '@/lib/'],
  [/@qti-editor\/ui\/hooks\//g, '@/hooks/'],
];

function transformImports(content) {
  return aliasPatterns.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    content,
  );
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
    registryDependencies: item.registryDependencies ?? [],
    files: [],
  };

  for (const file of item.files) {
    const sourcePath = join(rootDir, file.source ?? file.path);
    const distPath = join(distDir, file.path);
    const content = transformImports(readFileSync(sourcePath, 'utf-8'));

    mkdirSync(dirname(distPath), { recursive: true });
    writeFileSync(distPath, content);

    distItem.files.push({
      path: file.path,
      type: file.type,
      target: file.target,
    });
  }

  distRegistry.items.push(distItem);
}

const componentsJsonPath = join(rootDir, 'components.json');
cpSync(componentsJsonPath, join(distDir, 'components.json'));
writeFileSync(join(distDir, 'registry.json'), JSON.stringify(distRegistry, null, 2));
