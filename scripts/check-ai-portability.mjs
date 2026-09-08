#!/usr/bin/env node
/**
 * Prove the conversational authoring packages install and typecheck outside this workspace.
 *
 *   node scripts/pack-ai-packages.mjs && node scripts/check-ai-portability.mjs
 *
 * Creates a throwaway project that depends only on the packed tarballs plus the declared peers,
 * installs it with pnpm, and compiles a consumer that touches all three public entry points. No
 * workspace aliases, no tsconfig paths, no copied source: if this passes, a second editor can
 * install the same tarballs and get the same API.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packs = resolve(process.argv[2] ?? resolve(root, 'dist-packs'));
const tgz = name => resolve(packs, `citolab-${name}-${version(name)}.tgz`);
const version = name => JSON.parse(readFileSync(resolve(root, 'packages', name, 'package.json'), 'utf8')).version;

const dir = mkdtempSync(resolve(tmpdir(), 'qti-ai-portability-'));
mkdirSync(resolve(dir, 'src'));
writeFileSync(
  resolve(dir, 'package.json'),
  JSON.stringify(
    {
      name: 'qti-ai-portability',
      private: true,
      type: 'module',
      dependencies: {
        '@citolab/qti-ai-core': `file:${tgz('qti-ai-core')}`,
        '@citolab/qti-ai-prosemirror': `file:${tgz('qti-ai-prosemirror')}`,
        '@citolab/qti-ai-ui': `file:${tgz('qti-ai-ui')}`,
        lit: '^3.3.3',
        'prosemirror-model': '^1.25.8',
        'prosemirror-state': '^1.4.4',
        'prosemirror-view': '^1.41.9',
        typescript: '^5.9.3',
      },
      // The tarballs declare the concrete core version; point that at the local tarball too.
      pnpm: { overrides: { '@citolab/qti-ai-core': `file:${tgz('qti-ai-core')}` } },
    },
    null,
    2
  )
);
writeFileSync(
  resolve(dir, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: { target: 'ES2022', module: 'ESNext', moduleResolution: 'Bundler', strict: true, noEmit: true, skipLibCheck: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'] },
    include: ['src'],
  })
);
writeFileSync(
  resolve(dir, 'src/consumer.ts'),
  `import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { readAuthoringStream, parseAuthoringReply, type AuthoringReply } from '@citolab/qti-ai-core';
import { createAuthoringPlugin, captureAuthoringContext, prepareProposal, acceptProposal } from '@citolab/qti-ai-prosemirror';
import { registerQtiAiElements, QtiAiProposal } from '@citolab/qti-ai-ui';

const schema = new Schema({ nodes: { doc: { content: 'block+' }, text: { group: 'inline' }, paragraph: { group: 'block', content: 'inline*', toDOM: () => ['p', 0] } } });
const view = new EditorView(document.body, { state: EditorState.create({ schema, plugins: [createAuthoringPlugin()] }) });
const context = captureAuthoringContext(view);
const reply: AuthoringReply = parseAuthoringReply({ version: 1, requestId: context.requestId, capabilityId: context.capabilityId, summary: '', operations: [], suggestions: [] });
acceptProposal(view, prepareProposal(view, reply));
registerQtiAiElements();
export const el: QtiAiProposal = new QtiAiProposal();
export const prose = readAuthoringStream('hi').prose;
`
);

try {
  execFileSync('pnpm', ['install', '--silent'], { cwd: dir, stdio: 'inherit' });
  execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: dir, stdio: 'inherit' });
  for (const name of ['qti-ai-core', 'qti-ai-prosemirror', 'qti-ai-ui']) {
    const manifest = readFileSync(resolve(dir, 'node_modules/@citolab', name, 'package.json'), 'utf8');
    if (manifest.includes('workspace:')) throw new Error(`${name} still carries a workspace: dependency`);
  }
  console.log('portability check passed: packed packages install and typecheck without the workspace');
} finally {
  rmSync(dir, { recursive: true, force: true });
}
