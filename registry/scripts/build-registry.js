/**
 * Build script for QTI Editor Registry
 * 
 * Reads registry.json and generates shadcn-compatible registry item JSON files
 * that can be served statically and consumed by `npx shadcn add`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public', 'r');

// Read the registry manifest
const registryPath = join(rootDir, 'registry.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf-8'));

// Ensure output directory exists
mkdirSync(publicDir, { recursive: true });

console.log(`Building registry: ${registry.name}`);
console.log(`Output directory: ${publicDir}`);

// Build each registry item
for (const item of registry.items) {
  console.log(`  Processing: ${item.name}`);
  
  const registryItem = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
    dependencies: item.dependencies || [],
    devDependencies: item.devDependencies || [],
    registryDependencies: item.registryDependencies || [],
    files: [],
  };

  // Read and embed file contents
  for (const file of item.files) {
    const filePath = join(rootDir, file.path);
    
    if (!existsSync(filePath)) {
      console.error(`    ERROR: File not found: ${filePath}`);
      process.exit(1);
    }

    const content = readFileSync(filePath, 'utf-8');
    
    registryItem.files.push({
      path: file.path,
      type: file.type,
      content,
    });
    
    console.log(`    Added: ${file.path} (${content.length} bytes)`);
  }

  // Write the registry item JSON
  const outputPath = join(publicDir, `${item.name}.json`);
  writeFileSync(outputPath, JSON.stringify(registryItem, null, 2));
  console.log(`    Output: ${outputPath}`);
}

// Also copy/generate a styles/index.json for compatibility
const stylesDir = join(rootDir, 'public', 'r', 'styles');
mkdirSync(stylesDir, { recursive: true });

const indexJson = {
  $schema: 'https://ui.shadcn.com/schema/registry.json',
  name: registry.name,
  homepage: registry.homepage,
  items: registry.items.map(item => ({
    name: item.name,
    type: item.type,
    title: item.title,
    description: item.description,
  })),
};

writeFileSync(join(publicDir, 'index.json'), JSON.stringify(indexJson, null, 2));

console.log('\nRegistry build complete!');
console.log(`\nTo serve locally: pnpm --filter @qti-editor/registry serve`);
console.log(`Then add components: npx shadcn add http://localhost:4100/r/qti-attributes-panel.json`);
