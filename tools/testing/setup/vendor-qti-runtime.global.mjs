/**
 * Vitest globalSetup — runs once before any browser-project test session.
 * Copies the @citolab/qti-components runtime dist files into public/qti-runtime/
 * so the iframe-based runtime harness can serve them at /qti-runtime/...
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../..', import.meta.url));

export default function setup() {
  const result = spawnSync('node', [path.join(root, 'scripts/vendor-qti-runtime.mjs')], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.status !== 0) {
    throw new Error('[vendor-qti-runtime] global setup failed — see output above');
  }
}
