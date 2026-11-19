import { getStrippedAttributeSources, parseResponseAttribute, stripAttributesFromElement } from '@citolab/prose-qti/components/shared';

import { parseTextEntryCaseSensitiveAttribute } from '../../attributes/text-entry-attributes-editor.js';
import { textEntryInteractionComposerMetadata } from '../../composer/metadata.js';

import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '@citolab/prose-qti/components/shared/composer/types.js';

function toNonEmptyString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function composeTextEntryInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = textEntryInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const correctResponse = parseResponseAttribute(sourceElement.getAttribute('correct-response'));
  const correctResponses = correctResponse == null
    ? []
    : Array.isArray(correctResponse) ? correctResponse : [correctResponse];
  const primaryCorrectResponse = correctResponses[0] ?? undefined;
  // map_response scores through the declaration's qti-mapping, and the mapping is built from the
  // accepted answers. With none there is nothing to map through: the template would be invented
  // scoring, and invalid QTI. Contribute no automated processing, as extended text does; the
  // declaration and its `score` (MAXSCORE) stay, so the points are a human's to award.
  const isScored = correctResponses.length > 0;

  const caseSensitive = parseTextEntryCaseSensitiveAttribute(
    sourceElement.getAttribute('case-sensitive'),
  );
  const scoreAttr = sourceElement.getAttribute('score');
  const score = scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1;

  stripAttributesFromElement(normalizedElement, metadata);
  const strippedAttributes = getStrippedAttributeSources(metadata);

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-text-entry-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: 'single',
      baseType: 'string',
      correctResponse: primaryCorrectResponse,
      stringMapping:
        isScored
          ? {
              defaultValue: 0,
              entries: correctResponses.map(mapKey => ({
                mapKey,
                mappedValue: score,
                caseSensitive,
              })),
            }
          : undefined,
      sourceTag: metadata.tagName,
      score,
    };
  }

  return {
    normalizedElement,
    responseDeclaration,
    responseProcessingTemplate: isScored ? metadata.responseProcessingTemplate : undefined,
    responseProcessingKind: isScored ? metadata.responseProcessing.internalKind : undefined,
    strippedAttributes,
    warnings,
  };
}
