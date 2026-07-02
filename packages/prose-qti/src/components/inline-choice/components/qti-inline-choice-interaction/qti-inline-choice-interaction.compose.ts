import { getStrippedAttributeSources, parseResponseAttribute, stripAttributesFromElement } from '../../../shared';
import { inlineChoiceInteractionComposerMetadata } from '../../composer/metadata.js';

import type { InteractionComposeResult, InteractionResponseDeclaration, ComposerWarning } from '@citolab/prose-qti/components/shared/composer/types.js';

function toNonEmptyString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function composeInlineChoiceInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = inlineChoiceInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const correctResponse = parseResponseAttribute(sourceElement.getAttribute('correct-response'));
  const scoreAttr = sourceElement.getAttribute('score');
  const score = scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1;

  stripAttributesFromElement(normalizedElement, metadata);
  const strippedAttributes = getStrippedAttributeSources(metadata);

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-inline-choice-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: 'single',
      baseType: 'identifier',
      correctResponse: correctResponse ?? undefined,
      sourceTag: metadata.tagName,
      score,
    };
  }

  return {
    normalizedElement,
    responseDeclaration,
    responseProcessingTemplate: metadata.responseProcessingTemplate,
    responseProcessingKind: metadata.responseProcessing.internalKind,
    strippedAttributes,
    warnings,
  };
}
