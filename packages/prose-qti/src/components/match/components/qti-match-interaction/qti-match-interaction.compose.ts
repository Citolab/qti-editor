import { getStrippedAttributeSources, stripAttributesFromElement } from '../../../shared';
import { matchInteractionComposerMetadata } from '../../composer/metadata.js';

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

function parseCorrectResponseValues(raw: string | null): string[] | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const tokens = parsed.map(v => String(v).trim()).filter(Boolean);
        return tokens.length > 0 ? tokens : null;
      }
    } catch {
      // fall through to comma-split
    }
  }
  const tokens = trimmed.split(',').map(v => v.trim()).filter(Boolean);
  return tokens.length > 0 ? tokens : null;
}

export function composeMatchInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = matchInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  // correctResponse on the authoring node is stored as a JSON-array string
  // (qti-components shape: '["A 1","B 2"]'). Parse it here so it lands on the
  // declaration as a string[] — otherwise the core composer's split-on-comma
  // would mangle the JSON brackets.
  const correctResponseRaw = sourceElement.getAttribute('correct-response');
  const correctResponse = parseCorrectResponseValues(correctResponseRaw);
  const score = toFiniteNumber(sourceElement.getAttribute('score'), 1);

  stripAttributesFromElement(normalizedElement, metadata);
  const strippedAttributes = getStrippedAttributeSources(metadata);

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-match-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: 'multiple',
      baseType: 'directedPair',
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
