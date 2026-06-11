import { expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';

import {
  exportAssessmentItemDoc,
  importItem001,
  mountEditor,
} from './qti-choice-interaction-item001.regression.stories';
import assertedXML from '../../../../public/qti/kennisnet/ITEM001-editor.xml?raw';

test('exported QTI matches the imported ITEM001-editor.xml', () => {
  // Pure pipeline — no rendering needed: import ITEM001 → export → compare.
  const exported = exportAssessmentItemDoc(importItem001());
  const expected = new DOMParser().parseFromString(assertedXML, 'application/xml');

  expect(exported).toEqualXmlDoc(expected);
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


