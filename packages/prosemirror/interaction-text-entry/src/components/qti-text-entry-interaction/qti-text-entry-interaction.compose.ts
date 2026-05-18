import { parseCorrectResponseAttribute } from '@qti-editor/interaction-shared';

import { parseTextEntryCaseSensitiveAttribute } from '../../attributes/text-entry-attributes-editor.js';
import { textEntryInteractionComposerMetadata } from '../../composer/metadata.js';

import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '@qti-editor/interaction-shared/composer/types.js';

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
  const correctResponse = parseCorrectResponseAttribute(sourceElement.getAttribute('correct-response'));
  const correctResponses = correctResponse == null
    ? []
    : Array.isArray(correctResponse) ? correctResponse : [correctResponse];
  const primaryCorrectResponse = correctResponses[0] ?? undefined;
  const caseSensitive = parseTextEntryCaseSensitiveAttribute(
    sourceElement.getAttribute('case-sensitive'),
  );
  const scoreAttr = sourceElement.getAttribute('score');
  const score = scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1;

  const editorOnlyAttributes = [...metadata.editorOnlyAttributes];
  editorOnlyAttributes.forEach(attr => normalizedElement.removeAttribute(attr));

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
        correctResponses.length > 0
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
    responseProcessingTemplate: metadata.responseProcessingTemplate,
    responseProcessingKind: metadata.responseProcessing.internalKind,
    editorOnlyAttributes,
    warnings,
  };
}
