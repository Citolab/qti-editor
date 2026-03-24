import { extendedTextInteractionComposerMetadata } from '../../composer/metadata.js';

import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '@qti-editor/interaction-shared/composer/types.js';

function toFiniteNumber(value: string | null, fallback: number | null): number | null {
  if (value == null || value.trim().length === 0) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toNonEmptyString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function composeExtendedTextInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = extendedTextInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const expectedLength = toFiniteNumber(sourceElement.getAttribute('expected-length'), null);
  const expectedLines = toFiniteNumber(sourceElement.getAttribute('expected-lines'), null);
  const format = toNonEmptyString(sourceElement.getAttribute('format')) || 'plain';

  const editorOnlyAttributes = [...metadata.editorOnlyAttributes];
  editorOnlyAttributes.forEach(attr => normalizedElement.removeAttribute(attr));

  // Set normalized attributes
  if (expectedLength != null) {
    normalizedElement.setAttribute('expected-length', String(expectedLength));
  }
  if (expectedLines != null) {
    normalizedElement.setAttribute('expected-lines', String(expectedLines));
  }
  if (format !== 'plain') {
    normalizedElement.setAttribute('format', format);
  } else {
    normalizedElement.removeAttribute('format');
  }

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-extended-text-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: 'single',
      baseType: 'string',
      sourceTag: metadata.tagName,
    };
  }

  return {
    normalizedElement,
    responseDeclaration,
    responseProcessingTemplate: undefined, // Extended text typically requires manual scoring
    responseProcessingKind: undefined,
    editorOnlyAttributes,
    warnings,
  };
}
