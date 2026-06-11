import { render } from 'lit';
import { expect, test } from 'vitest';
import { findByShadowText } from 'shadow-dom-testing-library';

import {
  RoundtripItem001,
  type EditorContainer,
} from './qti-choice-interaction-item001.regression.stories';
import assertedXML from '../../../../public/qti/kennisnet/ITEM001-editor.xml?raw';

test('exported QTI matches the imported ITEM001-editor.xml', () => {
  // Reuse the story: render its template (load → import → mount → export).
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(RoundtripItem001.render!(undefined as never, {} as never), host);

  // The story exposes its exported QTI on the editor container.
  const container = host.querySelector<EditorContainer>('.editor-container');
  const exportedXml = container?.__exportedXml;

  // Exported XML must equal the imported asserted fixture.
  expect(exportedXml).toEqualXml(assertedXML);

  host.remove();
});

test('clicking a second choice exports cardinality=multiple with both correct values', async () => {
  // Render the story (load → import → mount → export).
  const host = document.createElement('div');
  document.body.appendChild(host);
  render(RoundtripItem001.render!(undefined as never, {} as never), host);

  const container = host.querySelector<EditorContainer>('.editor-container')!;

  // Find the second choice by its rendered text (pierces shadow DOM) and click
  // its checkbox/radio control — the same action a user takes to mark a correct
  // response. choice3 is already correct in the fixture; adding choice2 makes
  // the response multiple-cardinality.
  const choice2 = await findByShadowText(container, 'Jodium (I)');
  const control = choice2.closest('qti-simple-choice')!.shadowRoot!.querySelector<HTMLElement>('[part="ch"]')!;
  control.click();

  // The story re-exports on every transaction, so read the fresh QTI.
  const doc = new DOMParser().parseFromString(container.__exportedXml!, 'application/xml');
  const responseDeclaration = doc.querySelector('qti-response-declaration[identifier="RESPONSE"]');

  expect(responseDeclaration).not.toBeNull();
  expect(responseDeclaration?.getAttribute('cardinality')).toBe('multiple');

  const values = Array.from(
    responseDeclaration!.querySelectorAll('qti-correct-response > qti-value'),
  ).map(value => value.textContent?.trim());
  expect(values).toEqual(['choice2', 'choice3']);

  host.remove();
});


