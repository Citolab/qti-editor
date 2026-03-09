import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration, QtiAreaMapEntry } from '@qti-editor/interactions-shared/composer/types.js';
import { selectPointInteractionComposerMetadata, SELECT_POINT_INTERACTION_TAG } from '../../composer/metadata.js';

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

function parseAreaMappings(raw: string | null): {
  areaMapping?: InteractionResponseDeclaration['areaMapping'];
  warnings: ComposerWarning[];
} {
  const warnings: ComposerWarning[] = [];
  if (!raw || raw.trim().length === 0) {
    return { warnings };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    warnings.push({
      code: 'INVALID_AREA_MAPPINGS_JSON',
      message: 'qti-select-point-interaction has invalid area-mappings JSON; skipping qti-area-mapping.',
      tagName: SELECT_POINT_INTERACTION_TAG,
    });
    return { warnings };
  }

  if (!Array.isArray(parsed)) {
    warnings.push({
      code: 'INVALID_AREA_MAPPINGS_JSON',
      message: 'qti-select-point-interaction area-mappings is not an array; skipping qti-area-mapping.',
      tagName: SELECT_POINT_INTERACTION_TAG,
    });
    return { warnings };
  }

  const entries: QtiAreaMapEntry[] = [];
  let defaultValue = 0;

  parsed.forEach((entry, index) => {
    const asRecord = typeof entry === 'object' && entry != null ? (entry as Record<string, unknown>) : null;
    const shape = asRecord?.shape;
    const coords = asRecord?.coords;

    if ((shape !== 'circle' && shape !== 'rect') || typeof coords !== 'string' || coords.trim().length === 0) {
      warnings.push({
        code: 'INVALID_AREA_MAPPING_ENTRY',
        message: `Invalid area-mappings entry at index ${index}; expected shape (circle|rect) and coords string.`,
        tagName: SELECT_POINT_INTERACTION_TAG,
      });
      return;
    }

    const mappedValueRaw = asRecord?.mappedValue;
    const mappedValue = Number.isFinite(Number(mappedValueRaw)) ? Number(mappedValueRaw) : 0;
    const defaultValueRaw = asRecord?.defaultValue;
    if (Number.isFinite(Number(defaultValueRaw))) {
      defaultValue = Number(defaultValueRaw);
    }

    entries.push({
      shape,
      coords: coords.trim(),
      mappedValue,
    });
  });

  if (entries.length === 0) {
    return { warnings };
  }

  return {
    areaMapping: {
      defaultValue,
      entries,
    },
    warnings,
  };
}

function removeChildrenByTagName(element: Element, tagName: string): void {
  Array.from(element.children)
    .filter(child => child.tagName.toLowerCase() === tagName)
    .forEach(child => child.remove());
}

export function composeSelectPointInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = selectPointInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const maxChoices = toFiniteNumber(sourceElement.getAttribute('max-choices'), 1);
  const minChoices = toFiniteNumber(sourceElement.getAttribute('min-choices'), 0);

  const promptFromChild = sourceElement.querySelector('qti-prompt')?.textContent;
  const prompt = toNonEmptyString(promptFromChild ?? null);

  const imageElement = sourceElement.querySelector('img');
  const imageSrc = toNonEmptyString(imageElement?.getAttribute('src') ?? null);
  const imageAlt = toNonEmptyString(imageElement?.getAttribute('alt') ?? null);
  const imageWidth = toNonEmptyString(imageElement?.getAttribute('width') ?? null);
  const imageHeight = toNonEmptyString(imageElement?.getAttribute('height') ?? null);

  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;

  const editorOnlyAttributes = [...metadata.editorOnlyAttributes];

  editorOnlyAttributes.forEach(attr => normalizedElement.removeAttribute(attr));

  normalizedElement.setAttribute('max-choices', String(maxChoices > 0 ? maxChoices : 1));
  if (minChoices > 0) {
    normalizedElement.setAttribute('min-choices', String(minChoices));
  } else {
    normalizedElement.removeAttribute('min-choices');
  }

  removeChildrenByTagName(normalizedElement, 'img');
  removeChildrenByTagName(normalizedElement, 'qti-prompt');

  if (prompt) {
    const qtiPrompt = xmlDoc.createElementNS(normalizedElement.namespaceURI || null, 'qti-prompt');
    const paragraph = xmlDoc.createElementNS(normalizedElement.namespaceURI || null, 'p');
    paragraph.textContent = prompt;
    qtiPrompt.appendChild(paragraph);
    normalizedElement.appendChild(qtiPrompt);
  }

  if (imageSrc) {
    const image = xmlDoc.createElementNS(normalizedElement.namespaceURI || null, 'img');
    image.setAttribute('src', imageSrc);
    if (imageAlt) image.setAttribute('alt', imageAlt);
    if (imageWidth) image.setAttribute('width', imageWidth);
    if (imageHeight) image.setAttribute('height', imageHeight);
    normalizedElement.appendChild(image);
  }

  const areaMappingsRaw = sourceElement.getAttribute('area-mappings');
  const areaMappingResult = parseAreaMappings(areaMappingsRaw);
  warnings.push(...areaMappingResult.warnings);

  let responseDeclaration: InteractionResponseDeclaration | undefined;
  if (!responseIdentifier) {
    warnings.push({
      code: 'MISSING_RESPONSE_IDENTIFIER',
      message: 'qti-select-point-interaction is missing response-identifier; declaration will be skipped.',
      tagName: metadata.tagName,
    });
  } else {
    const correctResponse =
      toNonEmptyString(sourceElement.getAttribute('correct-response'));
    responseDeclaration = {
      identifier: responseIdentifier,
      cardinality: maxChoices > 1 ? 'multiple' : 'single',
      baseType: 'point',
      correctResponse: correctResponse ?? undefined,
      areaMapping: areaMappingResult.areaMapping,
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
