import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const siteHostingDir = join(repoRoot, 'hosting', 'site');
const siteDistDir = join(repoRoot, 'apps', 'site', 'dist');
const storybookDistDir = join(repoRoot, 'storybook-static');
const registryDistDir = join(repoRoot, 'packages', 'ui', 'dist', 'public', 'r');

function assertExists(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} not found: ${path}`);
  }
}

assertExists(siteDistDir, 'Site build output');
assertExists(storybookDistDir, 'Storybook build output');
assertExists(registryDistDir, 'Registry build output');

rmSync(siteHostingDir, { recursive: true, force: true });
mkdirSync(siteHostingDir, { recursive: true });

cpSync(siteDistDir, siteHostingDir, { recursive: true, force: true });
cpSync(storybookDistDir, join(siteHostingDir, 'storybook'), {
  recursive: true,
  force: true,
});
cpSync(registryDistDir, join(siteHostingDir, 'r'), { recursive: true, force: true });

console.log(`Prepared site hosting bundle at ${siteHostingDir}`);
