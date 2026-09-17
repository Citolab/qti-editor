/**
 * `qtiPromptParagraph` is shared and now accepts an image, so a select-point prompt can hold one.
 * An unscoped `querySelector('img')` would then return it instead of the select-point graphic.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../../integration/interactions/prosekit.js';
import { composeSelectPointInteractionElement } from './qti-select-point-interaction.compose.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const BACKGROUND = 'resources/europe.svg';
const IN_THE_PROMPT = 'resources/legenda.png';

/** A select-point whose prompt carries its own picture, ahead of the graphic in document order. */
function interactionWithPictureInPrompt(): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML =
    '<qti-select-point-interaction response-identifier="RESPONSE" max-choices="1">' +
    `<qti-prompt><p>Klik op de kaart<img src="${IN_THE_PROMPT}" alt="Legenda"></p></qti-prompt>` +
    `<img src="${BACKGROUND}" width="600" height="513" alt="Kaart van Europa">` +
    '</qti-select-point-interaction>';
  return host;
}

function imgSelectPointOf(doc: PmNode): PmNode {
  let found: PmNode | null = null;
  doc.descendants(node => {
    if (!found && node.type === schema.nodes.imgSelectPoint) found = node;
  });
  if (!found) throw new Error('no imgSelectPoint in the parsed document');
  return found;
}

describe('a picture inside a select-point prompt', () => {
  test('does not become the select-point graphic on import', () => {
    const parsed = PmDOMParser.fromSchema(schema).parse(interactionWithPictureInPrompt());

    expect(imgSelectPointOf(parsed).attrs.imageSrc).toBe(BACKGROUND);
  });

  test('does not become the select-point graphic on compose', () => {
    const source = interactionWithPictureInPrompt().firstElementChild as Element;
    const xmlDoc = document.implementation.createDocument(null, null, null);

    const { normalizedElement } = composeSelectPointInteractionElement(source, xmlDoc);

    expect(normalizedElement.querySelector(':scope > img')?.getAttribute('src')).toBe(BACKGROUND);
  });
});
