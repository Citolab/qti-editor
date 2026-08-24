/**
 * Startup recovery, end to end, in the real app element.
 *
 * The unit tests in `packages/prose-qti/src/schema-recovery/` prove the rules. This proves the wiring
 * — the part that has burned this feature before: a report published into an empty room, markers
 * resolved against the wrong document, an original cleared before its copy was made. Every assertion
 * below is about something crossing a boundary.
 *
 * The seeded document is stamped at the CURRENT version deliberately. That is what a schema change
 * outrunning the migration ladder looks like from the inside: the ladder sees nothing to do, and the
 * failure lands on the load.
 */
import { CURRENT_SCHEMA_VERSION } from '@citolab/prose-qti/interfaces';
import { expect, test } from 'vitest';

import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
import './components/qti-editor-app.js';

import { consumePendingCompatibilityReport } from './lib/compatibility/report-channel.js';
import { subscribeRecoveryMarkers } from './lib/compatibility/recovery-channel.js';
import { getAutoSaveKey, getQuarantineKey, readQuarantinedDoc } from './lib/fileStore.js';

import type { QtiEditorApp } from './components/qti-editor-app.js';

/** The locked prefix every document must start with, so `ensureLockedHeader` is a no-op. */
const LOCKED_PREFIX = [
  { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Rekenen' }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'Groep 8' }] },
  { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
];

/** A document using a node type the schema does not have, wrapped around content that is fine. */
const DOC_WITH_UNKNOWN_NODE = {
  type: 'doc',
  schemaVersion: CURRENT_SCHEMA_VERSION,
  content: [
    ...LOCKED_PREFIX,
    { type: 'paragraph', content: [{ type: 'text', text: 'Before the interaction' }] },
    {
      type: 'qtiRetiredInteraction',
      attrs: { identifier: 'RESPONSE' },
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Drag each city to its province' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Amsterdam' }] },
      ],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'After the interaction' }] },
  ],
};

async function mountApp(): Promise<QtiEditorApp> {
  const app = document.createElement('qti-editor-app') as QtiEditorApp;
  document.body.appendChild(app);
  await app.updateComplete;
  // The startup report is published a macrotask after mount, to clear React's effect-registration
  // window. Wait for it here rather than in every assertion.
  await new Promise(resolve => setTimeout(resolve, 0));
  return app;
}

function cleanStorage(): void {
  window.localStorage.removeItem(getAutoSaveKey());
  window.localStorage.removeItem(getQuarantineKey());
}

test('a document the schema rejects is recovered, quarantined, reported and marked', async () => {
  cleanStorage();
  consumePendingCompatibilityReport(); // discard anything an earlier test left behind
  window.localStorage.setItem(getAutoSaveKey(), JSON.stringify(DOC_WITH_UNKNOWN_NODE));

  let markedSiteIds: string[] = [];
  const unsubscribe = subscribeRecoveryMarkers(ids => { markedSiteIds = ids; });

  const app = await mountApp();
  const editor = (app as unknown as { editor: { view: { state: any; dom: HTMLElement } } }).editor;

  // 1. The document opened, and everything the schema *can* hold survived — including the two
  //    paragraphs that were inside the node it cannot.
  const text = editor.view.state.doc.textContent;
  expect(text).toContain('Before the interaction');
  expect(text).toContain('Drag each city to its province');
  expect(text).toContain('After the interaction');

  // 2. The pre-salvage original is on disk. Salvage is lossy, so this copy is the only thing a future
  //    migration step could ever be run against.
  const quarantined = readQuarantinedDoc();
  expect(quarantined?.doc).toContain('qtiRetiredInteraction');
  expect(quarantined?.reason).toBeTruthy();

  // 3. The news reached the channel, named the node, and quoted the user's own text.
  const report = consumePendingCompatibilityReport();
  expect(report?.hasWarnings).toBe(true);
  const change = report?.items.flatMap(item => item.changes)
    .find(candidate => candidate.nodeType === 'qtiRetiredInteraction');
  expect(change?.data?.excerpt).toContain('Drag each city to its province');
  expect(change?.data?.unwrappedChildren).toBe(2);
  expect(change?.data?.siteId).toBeTruthy();

  // 4. The place it happened is marked in the document, and the notice was told which site it can
  //    offer to navigate to.
  expect(markedSiteIds).toEqual([change?.data?.siteId]);
  expect(editor.view.dom.querySelector('.qti-recovery-mark')).not.toBeNull();

  unsubscribe();
  app.remove();
  await new Promise(resolve => setTimeout(resolve, 0));
  cleanStorage();
});

test('a document that loads cleanly is left alone — no quarantine, no report, no markers', async () => {
  cleanStorage();
  consumePendingCompatibilityReport();
  window.localStorage.setItem(getAutoSaveKey(), JSON.stringify({
    type: 'doc',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    content: [...LOCKED_PREFIX, { type: 'paragraph', content: [{ type: 'text', text: 'Fine' }] }],
  }));

  const app = await mountApp();
  const editor = (app as unknown as { editor: { view: { state: any; dom: HTMLElement } } }).editor;

  expect(editor.view.state.doc.textContent).toContain('Fine');
  expect(readQuarantinedDoc()).toBeNull();
  expect(consumePendingCompatibilityReport()).toBeUndefined();
  expect(editor.view.dom.querySelector('.qti-recovery-mark')).toBeNull();

  app.remove();
  await new Promise(resolve => setTimeout(resolve, 0));
  cleanStorage();
});
