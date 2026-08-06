import { expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';
import { page } from 'vitest/browser';
import { createEditor, union } from 'prosekit/core';
import { createQtiSchema } from '@citolab/prose-qti/schema';

import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';
import './components/qti-editor-app.js';

import { defineBasicExtension } from './extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from './extensions/qti-interactions-extension.js';
import { ensureLockedHeader } from './extensions/locked-header-extension.js';
import { getAutoSaveKey } from './lib/fileStore.js';
import { importXmlFromText } from './lib/importXml.js';
import item001 from '../../e2e/stories/fixtures/ITEM001.xml?raw';

import type { QtiEditorApp } from './components/qti-editor-app.js';

test('uses the same ProseMirror list nodes and strong/em marks as the minimal app', () => {
  const editor = createEditor({ extension: defineBasicExtension() });
  const proseMirrorSchema = createQtiSchema();

  for (const name of ['bullet_list', 'ordered_list', 'list_item'] as const) {
    expect(editor.schema.nodes[name].spec.content).toBe(proseMirrorSchema.nodes[name].spec.content);
    expect(editor.schema.nodes[name].spec.group).toBe(proseMirrorSchema.nodes[name].spec.group);
  }

  expect(editor.schema.marks.strong).toBeDefined();
  expect(editor.schema.marks.em).toBeDefined();
  expect(editor.schema.marks.bold).toBeUndefined();
  expect(editor.schema.marks.italic).toBeUndefined();
});

test('imports QTI XML through the standard roundtrip transforms', () => {
  const editor = createEditor({
    extension: union(defineBasicExtension(), defineQtiInteractionsExtension()),
  });
  const result = importXmlFromText(item001);
  const doc = editor.schema.nodeFromJSON(result.json);

  expect(doc.attrs.identifier).toBe('ITEM001');
  expect(doc.firstChild?.type.name).toBe('qtiLayoutDiv');

  let choiceInteraction = doc.firstChild;
  doc.descendants(node => {
    if (node.type.name === 'qtiChoiceInteraction') {
      choiceInteraction = node;
      return false;
    }
    return true;
  });
  expect(choiceInteraction?.attrs.correctResponse).toBe('choice3');
});

test('the complete app keeps a click inside an imported qti-simple-choice', async () => {
  window.localStorage.removeItem(getAutoSaveKey());
  const app = document.createElement('qti-editor-app') as QtiEditorApp;
  document.body.appendChild(app);
  await app.updateComplete;

  const editor = (app as unknown as { editor: ReturnType<typeof createEditor> }).editor;
  const result = importXmlFromText(item001);
  editor.setContent(ensureLockedHeader(result.json));
  expect(editor.view.state.doc.textContent).toContain('Xenon (Xe)');
  expect(editor.view.dom.isConnected).toBe(true);
  expect(editor.view.dom.innerHTML).toContain('qti-choice-interaction');

  await findByShadowText(app, 'Xenon (Xe)');
  await page.getByText('Xenon (Xe)').click();

  expect(editor.view.state.selection.$from.parent.type.name).toBe('qtiSimpleChoiceParagraph');
  expect(editor.view.state.selection.$from.parent.textContent).toBe('Xenon (Xe)');

  app.remove();
  await new Promise(resolve => setTimeout(resolve, 0));
  window.localStorage.removeItem(getAutoSaveKey());
});
