import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const registryDir = join(rootDir, 'dist', 'public', 'r');
const targetDir = join(rootDir, '..', '..', 'apps', 'editor', 'public', 'r');

rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
cpSync(registryDir, targetDir, { recursive: true, force: true });
