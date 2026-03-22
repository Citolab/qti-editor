import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const hostingDistDir = join(repoRoot, 'hosting', 'dist');
const appDistDir = join(repoRoot, 'apps', 'editor', 'dist');
const storybookDistDir = join(repoRoot, 'storybook-static');
const registryDistDir = join(repoRoot, 'packages', 'ui', 'dist', 'public', 'r');

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} not found: ${path}`);
  }
}

assertExists(appDistDir, 'Editor build output');
assertExists(storybookDistDir, 'Storybook build output');
assertExists(registryDistDir, 'Registry build output');

rmSync(hostingDistDir, { recursive: true, force: true });
mkdirSync(hostingDistDir, { recursive: true });

cpSync(appDistDir, hostingDistDir, { recursive: true, force: true });
cpSync(storybookDistDir, join(hostingDistDir, 'storybook'), {
  recursive: true,
  force: true,
});
cpSync(registryDistDir, join(hostingDistDir, 'r'), { recursive: true, force: true });

console.log(`Prepared Firebase hosting bundle at ${hostingDistDir}`);
