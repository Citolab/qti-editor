import { extendedTextInteractionComposerMetadata } from '../../composer/metadata.js';

import type { ComposerWarning, InteractionComposeResult, InteractionResponseDeclaration } from '@qti-editor/interaction-shared/composer/types.js';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';

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

function createRubricBlock(xmlDoc: Document, correctResponse: string, responseIdentifier: string): Element {
  const rubricBlock = xmlDoc.createElementNS(QTI_NS, 'qti-rubric-block');
  rubricBlock.setAttribute('view', 'scorer');
  rubricBlock.setAttribute('use', 'instructions');
  
  const contentBlock = xmlDoc.createElementNS(QTI_NS, 'qti-content-body');
  const div = xmlDoc.createElementNS(QTI_NS, 'div');
  
  const heading = xmlDoc.createElementNS(QTI_NS, 'p');
  const strong = xmlDoc.createElementNS(QTI_NS, 'strong');
  strong.textContent = `Model answer for ${responseIdentifier}:`;
  heading.appendChild(strong);
  div.appendChild(heading);
  
  // Split by newlines and create paragraphs
  const lines = correctResponse.split('\n');
  for (const line of lines) {
    const p = xmlDoc.createElementNS(QTI_NS, 'p');
    p.textContent = line || '\u00A0'; // Use non-breaking space for empty lines
    div.appendChild(p);
  }
  
  contentBlock.appendChild(div);
  rubricBlock.appendChild(contentBlock);
  
  return rubricBlock;
}

export function composeExtendedTextInteractionElement(sourceElement: Element, xmlDoc: Document): InteractionComposeResult {
  const metadata = extendedTextInteractionComposerMetadata;
  const warnings: ComposerWarning[] = [];
  const normalizedElement = xmlDoc.importNode(sourceElement, true) as Element;
  const additionalElements: Element[] = [];

  const responseIdentifier = toNonEmptyString(sourceElement.getAttribute('response-identifier'));
  const expectedLength = toFiniteNumber(sourceElement.getAttribute('expected-length'), null);
  const expectedLines = toFiniteNumber(sourceElement.getAttribute('expected-lines'), null);
  const format = toNonEmptyString(sourceElement.getAttribute('format')) || 'plain';
  const correctResponse = toNonEmptyString(sourceElement.getAttribute('correct-response'));

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

  // Create rubric block if correctResponse is present
  if (correctResponse && responseIdentifier) {
    const rubricBlock = createRubricBlock(xmlDoc, correctResponse, responseIdentifier);
    additionalElements.push(rubricBlock);
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
    additionalElements: additionalElements.length > 0 ? additionalElements : undefined,
  };
}
