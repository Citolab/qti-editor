import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '../../composer/types.js';

const CHOICE_TAG = 'qti-choice-interaction';

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

export function composeChoiceInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const correctResponse = toNonEmptyString(sourceElement.getAttribute('correct-response'));
  const maxChoices = toFiniteNumber(sourceElement.getAttribute('max-choices'), 1);
  const minChoices = toFiniteNumber(sourceElement.getAttribute('min-choices'), 0);

  const editorOnlyAttributes = ['class', 'correct-response'];
  editorOnlyAttributes.forEach(attr => normalizedElement.removeAttribute(attr));

  normalizedElement.setAttribute('max-choices', String(maxChoices > 0 ? maxChoices : 1));
  if (minChoices > 0) {
    normalizedElement.setAttribute('min-choices', String(minChoices));
  } else {
    normalizedElement.removeAttribute('min-choices');
  }

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-choice-interaction is missing response-identifier; declaration will be skipped.',
      tagName: CHOICE_TAG,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: maxChoices > 1 ? 'multiple' : 'single',
      baseType: 'identifier',
      correctResponse: correctResponse ?? undefined,
      sourceTag: CHOICE_TAG,
    };
  }

  return {
    normalizedElement,
    responseDeclaration,
    editorOnlyAttributes,
    warnings,
  };
}
