import { hottextInteractionComposerMetadata } from '../../composer/metadata.js';

import type {
  ComposerWarning,
  InteractionComposeResult,
  InteractionResponseDeclaration,
} from '@qti-editor/interaction-shared/composer/types.js';

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

export function composeHottextInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = hottextInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const correctResponse = toNonEmptyString(sourceElement.getAttribute('correct-response'));
  const maxChoices = toFiniteNumber(sourceElement.getAttribute('max-choices'), 1);
  const minChoices = toFiniteNumber(sourceElement.getAttribute('min-choices'), 0);
  const score = toFiniteNumber(sourceElement.getAttribute('score'), 1);

  const editorOnlyAttributes = [...metadata.editorOnlyAttributes];
  editorOnlyAttributes.forEach(attr => normalizedElement.removeAttribute(attr));

  normalizedElement.setAttribute('max-choices', String(maxChoices));
  if (minChoices > 0) {
    normalizedElement.setAttribute('min-choices', String(minChoices));
  } else {
    normalizedElement.removeAttribute('min-choices');
  }

  const isMultiple = maxChoices !== 1;

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-hottext-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: isMultiple ? 'multiple' : 'single',
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
    editorOnlyAttributes,
    warnings,
  };
}
