import { getStrippedAttributeSources, stripAttributesFromElement } from '../../../shared/composer/stripped-attributes.js';
import { iterResponseValues, parseResponseAttribute } from '../../../shared/response/codec.js';
import { removeEmptyPrompts } from '../../../shared/components/qti-prompt/qti-prompt.compose.js';
import { hotspotInteractionComposerMetadata } from '../../composer/metadata.js';

import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '@citolab/prose-qti/components/shared/composer/types.js';

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

/**
 * Fold the authoring attributes into an `identifier` response declaration — the same shape choice
 * produces. The element itself is kept as authored: picture, choices and every choice attribute pass
 * through untouched, since the roundtrip format already is standard QTI for them.
 *
 * The answer key never holds more values than `max-choices` allows. Marking areas in the editor
 * keeps the two in step, but `max-choices` is also editable in the attributes panel, and lowering it
 * there under the number of marked areas would otherwise export a `single` declaration with two
 * values — invalid QTI. The key is cut to the first `max-choices` values instead, with a
 * `CORRECT_RESPONSE_EXCEEDS_MAX_CHOICES` warning.
 */
export function composeHotspotInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = hotspotInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  let correctResponse = parseResponseAttribute(sourceElement.getAttribute('correct-response'));
  const maxChoices = toFiniteNumber(sourceElement.getAttribute('max-choices'), 1);
  const minChoices = toFiniteNumber(sourceElement.getAttribute('min-choices'), 0);
  const score = toFiniteNumber(sourceElement.getAttribute('score'), 1);

  stripAttributesFromElement(normalizedElement, metadata);
  removeEmptyPrompts(normalizedElement);
  const strippedAttributes = getStrippedAttributeSources(metadata);

  normalizedElement.setAttribute('max-choices', String(maxChoices));
  if (minChoices > 0) {
    normalizedElement.setAttribute('min-choices', String(minChoices));
  } else {
    normalizedElement.removeAttribute('min-choices');
  }

  const correctValues = Array.from(iterResponseValues(correctResponse));
  if (maxChoices > 0 && correctValues.length > maxChoices) {
    const kept = correctValues.slice(0, maxChoices);
    warnings.push({
      code: 'CORRECT_RESPONSE_EXCEEDS_MAX_CHOICES',
      message:
        `qti-hotspot-interaction marks ${correctValues.length} correct areas but max-choices is ${maxChoices}; ` +
        `exporting only ${kept.join(', ')}.`,
      tagName: metadata.tagName,
      ...(responseIdentifier ? { responseIdentifier } : {}),
    });
    correctResponse = kept.length === 1 ? kept[0] : kept;
  }

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-hotspot-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      // QTI: max-choices 1 is a single selection, anything else (0 = unlimited) is multiple.
      cardinality: maxChoices === 1 ? 'single' : 'multiple',
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
