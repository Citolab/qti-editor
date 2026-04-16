import { gapMatchInteractionComposerMetadata } from '../../composer/metadata.js';

import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '@qti-editor/interaction-shared/composer/types.js';

function toFiniteNumber(value: string | null, fallback: number): number {
  if (value == null || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonEmptyString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function composeGapMatchInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = gapMatchInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const correctResponse = toNonEmptyString(sourceElement.getAttribute('correct-response'));
  const maxAssociations = toFiniteNumber(sourceElement.getAttribute('max-associations'), 1);
  const minAssociations = toFiniteNumber(sourceElement.getAttribute('min-associations'), 0);

  const editorOnlyAttributes = [...metadata.editorOnlyAttributes];
  editorOnlyAttributes.forEach(attr => normalizedElement.removeAttribute(attr));

  normalizedElement.setAttribute('max-associations', String(maxAssociations > 0 ? maxAssociations : 1));
  if (minAssociations > 0) {
    normalizedElement.setAttribute('min-associations', String(minAssociations));
  } else {
    normalizedElement.removeAttribute('min-associations');
  }

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-gap-match-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: 'multiple',
      baseType: 'directedPair',
      correctResponse: correctResponse ?? undefined,
      sourceTag: metadata.tagName,
    };
  }

  return {
    normalizedElement,
    responseDeclaration,
    responseProcessingTemplate: metadata.responseProcessingTemplate,
    responseProcessingKind: metadata.responseProcessing.internalKind,
    editorOnlyAttributes,
    warnings,
  };
}
