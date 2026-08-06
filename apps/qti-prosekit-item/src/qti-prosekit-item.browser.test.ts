import { expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';
import { page, userEvent } from 'vitest/browser';
import { createEditor, union } from 'prosekit/core';
import { blockSelectExtension, nodeAttrsSyncExtension } from '@citolab/prose-extensions/prosekit-extensions';
import { importItemFromString } from '@citolab/prose-qti/item-roundtrip';
import { createQtiSchema } from '@citolab/prose-qti/schema';

import '@citolab/prose-qti/components/choice/register.js';
import '@qti-components/theme/item.css';
import '@citolab/prose-qti/core-css.css';

import { defineBasicExtension } from './extensions/basic-extension.js';
import { defineQtiInteractionsExtension } from './extensions/qti-extension.js';
import item001 from '../../e2e/stories/fixtures/ITEM001.xml?raw';
import './qti-prosekit-item.js';

const choiceDocument = {
  type: 'doc',
  attrs: { identifier: 'cursor-test', title: 'Cursor test' },
  content: [
    {
      type: 'qtiChoiceInteraction',
      attrs: { responseIdentifier: 'RESPONSE', maxChoices: 1 },
      content: [
        {
          type: 'qtiPrompt',
          content: [
            { type: 'qtiPromptParagraph', content: [{ type: 'text', text: 'Choose an answer' }] },
          ],
        },
        {
          type: 'qtiSimpleChoice',
          attrs: { identifier: 'choice-a' },
          content: [
            { type: 'qtiSimpleChoiceParagraph', content: [{ type: 'text', text: 'First answer' }] },
          ],
        },
        {
          type: 'qtiSimpleChoice',
          attrs: { identifier: 'choice-b' },
          content: [
            { type: 'qtiSimpleChoiceParagraph', content: [{ type: 'text', text: 'Second answer' }] },
          ],
        },
      ],
    },
  ],
};

function createQtiProseKitEditor() {
  return createEditor({
    extension: union(
      defineBasicExtension(),
      defineQtiInteractionsExtension(),
      blockSelectExtension,
      nodeAttrsSyncExtension,
    ),
  });
}

test('uses ProseMirror list nodes and strong/em mark names', () => {
  const editor = createQtiProseKitEditor();
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

test('clicking choice text keeps the cursor inside that qti-simple-choice', async () => {
  const editor = createEditor({
    extension: union(
      defineBasicExtension(),
      defineQtiInteractionsExtension({ include: ['qti-choice-interaction'] }),
      blockSelectExtension,
      nodeAttrsSyncExtension,
    ),
    defaultContent: choiceDocument,
  });
  const host = document.createElement('div');
  document.body.appendChild(host);
  editor.mount(host);

  const choiceText = await findByShadowText(host, 'Second answer');
  await userEvent.click(choiceText);

  expect(editor.view.state.selection.$from.parent.type.name).toBe('qtiSimpleChoiceParagraph');
  expect(editor.view.state.selection.$from.parent.textContent).toBe('Second answer');

  editor.unmount();
  host.remove();
});

test('choice controls update the interaction answer without attributes-panel glue', async () => {
  const editor = createEditor({
    extension: union(
      defineBasicExtension(),
      defineQtiInteractionsExtension({ include: ['qti-choice-interaction'] }),
      nodeAttrsSyncExtension,
    ),
    defaultContent: choiceDocument,
  });
  const host = document.createElement('div');
  document.body.appendChild(host);
  editor.mount(host);

  const choiceText = await findByShadowText(host, 'Second answer');
  const choice = choiceText.closest('qti-simple-choice');
  // qti-simple-choice exposes no semantic role/name for its authoring control,
  // so the shadow part is the only stable way to drive this control.
  const control = choice?.shadowRoot?.querySelector<HTMLElement>('[part="control"]');
  expect(control).toBeDefined();
  await page.elementLocator(control!).click();

  const interaction = editor.view.state.doc.firstChild;
  expect(interaction?.attrs.correctResponse).toBe('choice-b');
  expect(interaction?.attrs.maxChoices).toBe(1);

  editor.unmount();
  host.remove();
});

test('clicking choice text inside imported QTI layout keeps the cursor inside that choice', async () => {
  const editor = createQtiProseKitEditor();
  editor.setContent(importItemFromString(item001, editor.schema).toJSON());
  const host = document.createElement('div');
  document.body.appendChild(host);
  editor.mount(host);

  await findByShadowText(host, 'Xenon (Xe)');
  await page.getByText('Xenon (Xe)').click();

  expect(editor.view.state.selection.$from.parent.type.name).toBe('qtiSimpleChoiceParagraph');
  expect(editor.view.state.selection.$from.parent.textContent).toBe('Xenon (Xe)');

  editor.unmount();
  host.remove();
});

test('the complete ProseKit example keeps a click inside qti-simple-choice', async () => {
  const app = document.createElement('qti-prosekit-item');
  document.body.appendChild(app);

  await findByShadowText(app, 'Xenon (Xe)');
  await page.getByText('Xenon (Xe)').click();

  const editor = (app as unknown as { editor: ReturnType<typeof createEditor> }).editor;
  expect(editor.view.state.selection.$from.parent.type.name).toBe('qtiSimpleChoiceParagraph');
  expect(editor.view.state.selection.$from.parent.textContent).toBe('Xenon (Xe)');

  app.remove();
});

test('the complete ProseKit example loads pasted QTI through the roundtrip transforms', async () => {
  const app = document.createElement('qti-prosekit-item');
  document.body.appendChild(app);

  await findByShadowText(app, 'Xenon (Xe)');

  const textarea = app.querySelector('textarea');
  expect(textarea).not.toBeNull();
  const pastedItem = item001.replace('Xenon (Xe)', 'Loaded through qti-transform');
  await page.elementLocator(textarea!).fill(pastedItem);
  await page.getByText('Load XML').click();

  await findByShadowText(app, 'Loaded through qti-transform');

  const editor = (app as unknown as { editor: ReturnType<typeof createEditor> }).editor;
  let choiceInteraction = editor.view.state.doc.firstChild;
  editor.view.state.doc.descendants(node => {
    if (node.type.name === 'qtiChoiceInteraction') {
      choiceInteraction = node;
      return false;
    }
    return true;
  });
  expect(choiceInteraction?.attrs.correctResponse).toBe('choice3');

  app.remove();
});
