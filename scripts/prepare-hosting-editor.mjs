import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const editorHostingDir = join(repoRoot, 'hosting', 'editor');
const appDistDir = join(repoRoot, 'apps', 'editor', 'dist');

if (!existsSync(appDistDir)) {
  throw new Error(`Editor build output not found: ${appDistDir}`);
}

rmSync(editorHostingDir, { recursive: true, force: true });
mkdirSync(editorHostingDir, { recursive: true });
cpSync(appDistDir, editorHostingDir, { recursive: true, force: true });

console.log(`Prepared editor hosting bundle at ${editorHostingDir}`);
