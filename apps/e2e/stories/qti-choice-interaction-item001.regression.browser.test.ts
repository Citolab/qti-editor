import { expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';
import { userEvent } from 'vitest/browser';

import {
  exportAssessmentItemDoc,
  importItem001,
  mountEditor,
} from './qti-choice-interaction-item001.regression.stories';
import { mountQtiRuntime } from './runtime-harness';
import snapshotXml from './__file_snapshots__/ITEM001-editor.xml?raw';

test('exported QTI matches the ITEM001-editor.xml snapshot', async () => {
  // Editor pipeline: import ITEM001 → export → must equal the frozen snapshot.
  const exported = exportAssessmentItemDoc(importItem001());
  const exportedXml = new XMLSerializer().serializeToString(exported);
  await expect(exportedXml).toMatchFileSnapshot('./__file_snapshots__/ITEM001-editor.xml');
});

test('ITEM001 snapshot scores 1 in the runtime when the correct choice is clicked', async () => {
  // Load the frozen snapshot directly — what the editor IS supposed to produce.
  // The previous test catches any pipeline drift; this one proves the
  // authoritative output is actually playable.
  const harness = await mountQtiRuntime(snapshotXml);
  const ai = harness.assessmentItem as any;

  // ITEM001 correct response is choice3 (single cardinality).
  const correct = harness.doc.querySelector('qti-simple-choice[identifier="choice3"]')!;
  correct.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));

  ai.processResponse();
  expect(+ai.getOutcome('SCORE').value).toBe(1);

  harness.destroy();
});

test('clicking a second choice exports cardinality=multiple with both correct values', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = mountEditor(host);

  // Find the second choice by its rendered text (pierces shadow DOM) and click
  // its checkbox/radio control — the same action a user takes to mark a correct
  // response. choice3 is already correct in the fixture; adding choice2 makes
  // the response multiple-cardinality.
  const choice2 = await findByShadowText(host, 'Jodium (I)');
  const control = choice2.closest('qti-simple-choice')!.shadowRoot!.querySelector<HTMLElement>('[part="ch"]')!;
  control.click();

  const responseDeclaration = exportAssessmentItemDoc(view.state.doc).querySelector(
    'qti-response-declaration[identifier="RESPONSE"]',
  );

  expect(responseDeclaration).not.toBeNull();
  expect(responseDeclaration?.getAttribute('cardinality')).toBe('multiple');

  const values = Array.from(
    responseDeclaration!.querySelectorAll('qti-correct-response > qti-value'),
  ).map(value => value.textContent?.trim());
  expect(values).toEqual(['choice2', 'choice3']);

  view.destroy();
  host.remove();
});

test('pressing Enter after the last choice and typing creates a fourth qti-simple-choice', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = mountEditor(host);

  // Place the text cursor at the end of the "Xenon (Xe)" choice, then press
  // Enter and type — exactly like a user adding a new option. Clicking the text
  // focuses the editor and puts the caret inside the last choice; End moves it
  // to the end of that line.
  const xenon = await findByShadowText(host, 'Xenon (Xe)');
  await userEvent.click(xenon);
  await userEvent.keyboard('{End}');
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard('Telluur (Te)');

  // The exported item-body should now carry a fourth choice with that text.
  const choices = Array.from(
    exportAssessmentItemDoc(view.state.doc).querySelectorAll('qti-choice-interaction > qti-simple-choice'),
  );

  expect(choices).toHaveLength(4);
  expect(choices[3].textContent?.trim()).toBe('Telluur (Te)');

  view.destroy();
  host.remove();
});

test('deleting the typed text empties the new choice, then Enter exits into a new paragraph', async () => {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = mountEditor(host);

  // Add a fourth choice and type into it, exactly like the previous test.
  const xenon = await findByShadowText(host, 'Xenon (Xe)');
  await userEvent.click(xenon);
  await userEvent.keyboard('{End}');
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard('Telluur (Te)');

  // Select all text in the choice (Shift+Home) and delete it.
  await userEvent.keyboard('{Shift>}{Home}{/Shift}');
  await userEvent.keyboard('{Backspace}');

  const choices = Array.from(
    exportAssessmentItemDoc(view.state.doc).querySelectorAll('qti-choice-interaction > qti-simple-choice'),
  );

  expect(choices).toHaveLength(4);
  expect(choices[3].textContent?.trim()).toBe('');

  // Pressing Enter on the now-empty last choice exits the interaction: the
  // empty trailing choice is removed and the cursor lands in a fresh paragraph
  // right after the interaction — the same affordance a list offers when you
  // press Enter on an empty trailing item.
  await userEvent.keyboard('{Enter}');

  const choicesAfterEnter = Array.from(
    exportAssessmentItemDoc(view.state.doc).querySelectorAll('qti-choice-interaction > qti-simple-choice'),
  );

  expect(choicesAfterEnter).toHaveLength(3);
  expect(choicesAfterEnter.map(choice => choice.textContent?.trim())).toEqual([
    'Tin (Sn)',
    'Jodium (I)',
    'Xenon (Xe)',
  ]);

  // The cursor jumped out of the interaction into a new empty paragraph that
  // sits as a sibling after the qti-choice-interaction.
  const { doc, selection } = view.state;
  const interactionIndex = doc.content.content.findIndex(node => node.type.name === 'qtiChoiceInteraction');
  const nodeAfterInteraction = doc.content.content[interactionIndex + 1];

  expect(nodeAfterInteraction?.type.name).toBe('paragraph');
  expect(nodeAfterInteraction?.textContent).toBe('');

  // The selection is inside that trailing paragraph.
  expect(selection.$from.parent.type.name).toBe('paragraph');
  expect(selection.empty).toBe(true);

  view.destroy();
  host.remove();
});

test('attributes panel renders qti-simple-choice identifier read-only and fixed as a checkbox', async () => {
  const host = document.createElement('div');
  const panel = document.createElement('div');
  document.body.append(host, panel);
  const view = mountEditor(host, { panelEl: panel });

  // Put the cursor inside a choice so the panel shows its qtiSimpleChoice section.
  const choice = await findByShadowText(host, 'Tin (Sn)');
  await userEvent.click(choice);

  const section = panel.querySelector<HTMLElement>('fieldset[data-node-type="qtiSimpleChoice"]');
  expect(section).not.toBeNull();

  // `identifier` is rendered as a disabled text input (read-only).
  const identifierInput = section!.querySelector<HTMLInputElement>('input[data-attr-key="identifier"]');
  expect(identifierInput).not.toBeNull();
  expect(identifierInput!.type).toBe('text');
  expect(identifierInput!.disabled).toBe(true);
  expect(identifierInput!.value).toBe('choice1');

  // `fixed` is a boolean attr → rendered as an editable checkbox, unchecked.
  const fixedInput = section!.querySelector<HTMLInputElement>('input[data-attr-key="fixed"]');
  expect(fixedInput).not.toBeNull();
  expect(fixedInput!.type).toBe('checkbox');
  expect(fixedInput!.disabled).toBe(false);
  expect(fixedInput!.checked).toBe(false);

  // Toggling the checkbox sets the boolean attr and exports `fixed="true"`.
  await userEvent.click(fixedInput!);

  const firstChoice = exportAssessmentItemDoc(view.state.doc).querySelector(
    'qti-choice-interaction > qti-simple-choice[identifier="choice1"]',
  );
  expect(firstChoice?.getAttribute('fixed')).toBe('true');

  // Other choices are unaffected and carry no `fixed` attribute.
  const secondChoice = exportAssessmentItemDoc(view.state.doc).querySelector(
    'qti-choice-interaction > qti-simple-choice[identifier="choice2"]',
  );
  expect(secondChoice?.hasAttribute('fixed')).toBe(false);

  view.destroy();
  host.remove();
  panel.remove();
});

test('attributes panel renders qti-choice-interaction shuffle as a checkbox that exports shuffle="true"', async () => {
  const host = document.createElement('div');
  const panel = document.createElement('div');
  document.body.append(host, panel);
  const view = mountEditor(host, { panelEl: panel });

  // Put the cursor inside the interaction so the panel shows its section.
  const choice = await findByShadowText(host, 'Tin (Sn)');
  await userEvent.click(choice);

  const section = panel.querySelector<HTMLElement>('fieldset[data-node-type="qtiChoiceInteraction"]');
  expect(section).not.toBeNull();

  // `shuffle` is a boolean attr → rendered as an editable checkbox. ITEM001 ships
  // with shuffle="true", so the box is checked and the export carries the attribute.
  const shuffleInput = section!.querySelector<HTMLInputElement>('input[data-attr-key="shuffle"]');
  expect(shuffleInput).not.toBeNull();
  expect(shuffleInput!.type).toBe('checkbox');
  expect(shuffleInput!.disabled).toBe(false);
  expect(shuffleInput!.checked).toBe(true);

  expect(
    exportAssessmentItemDoc(view.state.doc)
      .querySelector('qti-choice-interaction')
      ?.getAttribute('shuffle'),
  ).toBe('true');

  // Toggling the checkbox off clears the boolean attr and drops `shuffle` from export.
  await userEvent.click(shuffleInput!);

  expect(
    exportAssessmentItemDoc(view.state.doc)
      .querySelector('qti-choice-interaction')
      ?.hasAttribute('shuffle'),
  ).toBe(false);

  view.destroy();
  host.remove();
  panel.remove();
});
