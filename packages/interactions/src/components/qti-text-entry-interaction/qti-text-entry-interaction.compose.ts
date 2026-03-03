import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '../../composer/types.js';
import { interactionComposerMetadataByTagName, TEXT_ENTRY_INTERACTION_TAG } from '../../composer/metadata.js';

function toNonEmptyString(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function composeTextEntryInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = interactionComposerMetadataByTagName[TEXT_ENTRY_INTERACTION_TAG];
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const correctResponse = toNonEmptyString(sourceElement.getAttribute('correct-response'));

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
