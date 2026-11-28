import {
  getStrippedAttributeSources,
  parseResponseAttribute,
  reconcileKeptConstraint,
  stripAttributesFromElement,
} from '../../../shared';
import { orderInteractionComposerMetadata } from '../../composer/metadata.js';

import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '../../../shared/composer/types.js';

function toNonEmptyString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function composeOrderInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = orderInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const correctResponse = parseResponseAttribute(sourceElement.getAttribute('correct-response'));
  const scoreAttr = sourceElement.getAttribute('score');
  const score = scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1;

  stripAttributesFromElement(normalizedElement, metadata);
  const strippedAttributes = getStrippedAttributeSources(metadata);

  // An imported `max-choices` must leave room for the correct order the author has since edited
  // (adding a choice lengthens it), and `min-choices` must stay within both.
  const choiceCount = normalizedElement.querySelectorAll(':scope > qti-simple-choice').length;
  const orderedCount = Array.isArray(correctResponse) ? correctResponse.length : correctResponse ? 1 : 0;
  const context = { tagName: metadata.tagName, responseIdentifier };
  const maxChoices = reconcileKeptConstraint(
    normalizedElement,
    'max-choices',
    { min: orderedCount, zeroIsUnlimited: true },
    { ...context, reason: 'allows fewer choices than the correct order uses' },
    warnings,
  );
  reconcileKeptConstraint(
    normalizedElement,
    'min-choices',
    { max: maxChoices ? Math.min(maxChoices, choiceCount) : choiceCount },
    { ...context, reason: 'asks for more choices than can be ordered' },
    warnings,
  );

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-order-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: 'ordered',
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
