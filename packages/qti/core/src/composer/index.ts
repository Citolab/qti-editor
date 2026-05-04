/**
 * QTI Composer - Core Logic
 *
 * Pure functions for building QTI XML from editor context.
 * No Lit/UI dependencies - these can be used in any environment.
 */

import { getInteractionComposerHandler } from '../interactions/composer.js';

import type { ResponseProcessingKind } from '@qti-editor/interfaces';

export interface ComposerItemContext {
  identifier?: string;
  lang?: string;
  title?: string;
  itemBody?: Document;
}

export interface ResponseDeclaration {
  identifier: string;
  cardinality: 'single' | 'multiple' | 'ordered';
  baseType: 'identifier' | 'directedPair' | 'point' | 'string';
  correctResponse?: string;
  stringMapping?: {
    defaultValue: number;
    entries: Array<{
      mapKey: string;
      mappedValue: number;
      caseSensitive: boolean;
    }>;
  };
  responseProcessingKind?: ResponseProcessingKind;
  areaMapping?: {
    defaultValue: number;
    entries: Array<{
      shape: 'circle' | 'rect';
      coords: string;
      mappedValue: number;
    }>;
  };
  sourceTag: string;
  score?: number;
}

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const SCHEMA_LOCATION =
  'http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd';
const MATCH_CORRECT_TEMPLATE =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';

function parseCorrectResponseValues(
  declaration: Pick<ResponseDeclaration, 'cardinality' | 'correctResponse'>,
): string[] {
  if (!declaration.correctResponse) return [];

  if (declaration.cardinality === 'single') {
    return [declaration.correctResponse];
  }

  if (declaration.cardinality === 'ordered') {
    try {
      const parsed = JSON.parse(declaration.correctResponse);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === 'string')
          .map(value => value.trim())
          .filter(Boolean);
      }
    } catch {
      // Fall back to comma-separated parsing for malformed or legacy values.
    }
  }

  return declaration.correctResponse.split(',').map(v => v.trim()).filter(Boolean);
}

export function extractResponseDeclarations(itemBodyRoot?: Element | null): ResponseDeclaration[] {
  if (!itemBodyRoot) return [];

  const tempDoc = document.implementation.createDocument(QTI_NS, 'qti-item-body', null);
  const tempRoot = tempDoc.importNode(itemBodyRoot, true) as Element;
  const { declarations } = composeAndNormalizeItemBody(tempRoot, tempDoc);
  return declarations;
}

/**
 * Convert qti-item-divider elements to <hr /> elements.
 * Used when composing a single item that should preserve dividers as visual separators.
 */
function convertDividersToHr(itemBodyDoc: Document): Document {
  const itemBodyRoot = 
    itemBodyDoc.querySelector('qti-item-body') ??
    (itemBodyDoc.documentElement?.tagName.toLowerCase() === 'qti-item-body'
      ? itemBodyDoc.documentElement
      : null);

  if (!itemBodyRoot) return itemBodyDoc;

  // Clone the document to avoid mutating the original
  const clonedDoc = document.implementation.createDocument(QTI_NS, 'qti-item-body', null);
  const clonedRoot = clonedDoc.importNode(itemBodyRoot, true) as Element;
  clonedDoc.replaceChild(clonedRoot, clonedDoc.documentElement);

  // Find and replace all dividers with <hr />
  const dividers = Array.from(clonedRoot.querySelectorAll('qti-item-divider'));
  for (const divider of dividers) {
    const hr = clonedDoc.createElementNS(QTI_NS, 'hr');
    divider.parentNode?.replaceChild(hr, divider);
  }

  return clonedDoc;
}

/**
 * Split an item body document at qti-item-divider elements.
 * Returns an array of item body fragments, one for each item.
 */
function splitItemBodyAtDividers(itemBodyDoc: Document): Element[] {
  const itemBodyRoot = 
    itemBodyDoc.querySelector('qti-item-body') ??
    (itemBodyDoc.documentElement?.tagName.toLowerCase() === 'qti-item-body'
      ? itemBodyDoc.documentElement
      : null);

  if (!itemBodyRoot) return [];

  // Find all dividers
  const dividers = Array.from(itemBodyRoot.querySelectorAll('qti-item-divider'));
  
  // If no dividers, return the whole body as a single item
  if (dividers.length === 0) {
    return [itemBodyRoot];
  }

  const fragments: Element[] = [];
  const children = Array.from(itemBodyRoot.childNodes);
  let currentFragment: Node[] = [];

  for (const child of children) {
    // Check if this child is a divider
    if (child.nodeType === Node.ELEMENT_NODE && 
        (child as Element).tagName.toLowerCase() === 'qti-item-divider') {
      // Save the current fragment if it has content
      if (currentFragment.length > 0) {
        const fragmentBody = itemBodyDoc.createElementNS(QTI_NS, 'qti-item-body');
        currentFragment.forEach(node => fragmentBody.appendChild(node.cloneNode(true)));
        fragments.push(fragmentBody);
        currentFragment = [];
      }
      // Skip the divider itself - it doesn't go into any fragment
    } else {
      currentFragment.push(child);
    }
  }

  // Add the last fragment if it has content
  if (currentFragment.length > 0) {
    const fragmentBody = itemBodyDoc.createElementNS(QTI_NS, 'qti-item-body');
    currentFragment.forEach(node => fragmentBody.appendChild(node.cloneNode(true)));
    fragments.push(fragmentBody);
  }

  return fragments;
}

export function buildAssessmentItemXml(itemContext?: ComposerItemContext): string {
  if (!itemContext) return '';

  const xmlDoc = document.implementation.createDocument(QTI_NS, 'qti-assessment-item', null);
  const root = xmlDoc.documentElement;

  root.setAttribute('xmlns', QTI_NS);
  root.setAttributeNS(XSI_NS, 'xsi:schemaLocation', SCHEMA_LOCATION);
  root.setAttribute('identifier', itemContext.identifier?.trim() || 'item-1');
  root.setAttribute('title', itemContext.title?.trim() || 'Untitled Item');
  root.setAttribute('adaptive', 'false');
  root.setAttribute('time-dependent', 'false');
  root.setAttributeNS(XML_NS, 'xml:lang', itemContext.lang?.trim() || 'en');

  const sourceBodyDoc = itemContext.itemBody;
  const sourceBodyRoot =
    sourceBodyDoc?.querySelector('qti-item-body') ??
    (sourceBodyDoc?.documentElement?.tagName.toLowerCase() === 'qti-item-body'
      ? sourceBodyDoc.documentElement
      : null);

  const composedItemBody =
    sourceBodyRoot != null
      ? (xmlDoc.importNode(sourceBodyRoot, true) as Element)
      : xmlDoc.createElementNS(QTI_NS, 'qti-item-body');

  const { declarations, responseTemplate, maxScore } = composeAndNormalizeItemBody(composedItemBody, xmlDoc);

  declarations.forEach(declaration => {
    const responseDeclaration = xmlDoc.createElementNS(QTI_NS, 'qti-response-declaration');
    responseDeclaration.setAttribute('identifier', declaration.identifier);
    responseDeclaration.setAttribute('cardinality', declaration.cardinality);
    responseDeclaration.setAttribute('base-type', declaration.baseType);

    if (declaration.correctResponse) {
      const correctResponse = xmlDoc.createElementNS(QTI_NS, 'qti-correct-response');
      const values = parseCorrectResponseValues(declaration);
      values.forEach(v => {
        const value = xmlDoc.createElementNS(QTI_NS, 'qti-value');
        value.textContent = v;
        correctResponse.appendChild(value);
      });
      responseDeclaration.appendChild(correctResponse);
    }

    if (declaration.stringMapping?.entries.length) {
      const mapping = xmlDoc.createElementNS(QTI_NS, 'qti-mapping');
      mapping.setAttribute('default-value', String(declaration.stringMapping.defaultValue));

      declaration.stringMapping.entries.forEach(entry => {
        const mapEntry = xmlDoc.createElementNS(QTI_NS, 'qti-map-entry');
        mapEntry.setAttribute('map-key', entry.mapKey);
        mapEntry.setAttribute('mapped-value', String(entry.mappedValue));
        mapEntry.setAttribute('case-sensitive', String(entry.caseSensitive));
        mapping.appendChild(mapEntry);
      });

      responseDeclaration.appendChild(mapping);
    }

    if (declaration.areaMapping) {
      const areaMapping = xmlDoc.createElementNS(QTI_NS, 'qti-area-mapping');
      areaMapping.setAttribute('default-value', String(declaration.areaMapping.defaultValue));
      declaration.areaMapping.entries.forEach(entry => {
        const areaMapEntry = xmlDoc.createElementNS(QTI_NS, 'qti-area-map-entry');
        areaMapEntry.setAttribute('shape', entry.shape);
        areaMapEntry.setAttribute('coords', entry.coords);
        areaMapEntry.setAttribute('mapped-value', String(entry.mappedValue));
        areaMapping.appendChild(areaMapEntry);
      });
      responseDeclaration.appendChild(areaMapping);
    }

    root.appendChild(responseDeclaration);
  });

  if (maxScore > 0) {
    const outcomeDeclaration = xmlDoc.createElementNS(QTI_NS, 'qti-outcome-declaration');
    outcomeDeclaration.setAttribute('identifier', 'SCORE');
    outcomeDeclaration.setAttribute('cardinality', 'single');
    outcomeDeclaration.setAttribute('base-type', 'float');

    const scoreDefaultValue = xmlDoc.createElementNS(QTI_NS, 'qti-default-value');
    const scoreValue = xmlDoc.createElementNS(QTI_NS, 'qti-value');
    scoreValue.textContent = '0';
    scoreDefaultValue.appendChild(scoreValue);
    outcomeDeclaration.appendChild(scoreDefaultValue);

    root.appendChild(outcomeDeclaration);

    const maxScoreOutcomeDeclaration = xmlDoc.createElementNS(QTI_NS, 'qti-outcome-declaration');
    maxScoreOutcomeDeclaration.setAttribute('identifier', 'MAX_SCORE');
    maxScoreOutcomeDeclaration.setAttribute('cardinality', 'single');
    maxScoreOutcomeDeclaration.setAttribute('base-type', 'float');

    const maxScoreDefaultValue = xmlDoc.createElementNS(QTI_NS, 'qti-default-value');
    const maxScoreValue = xmlDoc.createElementNS(QTI_NS, 'qti-value');
    maxScoreValue.textContent = String(maxScore);
    maxScoreDefaultValue.appendChild(maxScoreValue);
    maxScoreOutcomeDeclaration.appendChild(maxScoreDefaultValue);

    root.appendChild(maxScoreOutcomeDeclaration);
  }

  root.appendChild(composedItemBody);

  if (maxScore > 0) {
    if (declarations.length === 1) {
      const responseProcessing = xmlDoc.createElementNS(QTI_NS, 'qti-response-processing');
      responseProcessing.setAttribute('template', responseTemplate);
      root.appendChild(responseProcessing);
    } else if (declarations.length > 1) {
      root.appendChild(buildMultiInteractionResponseProcessing(xmlDoc, declarations));
    }
  }

  return new XMLSerializer().serializeToString(xmlDoc);
}

/**
 * Build multiple QTI assessment items from a single editor document.
 * 
 * Splits the item body at qti-item-divider elements and generates
 * a separate <qti-assessment-item> for each segment.
 * 
 * @returns XML string containing multiple assessment items wrapped in a container,
 *          or a single assessment item if no dividers are found.
 */
export function buildMultipleAssessmentItemsXml(itemContext?: ComposerItemContext): string {
  if (!itemContext?.itemBody) return '';

  const fragments = splitItemBodyAtDividers(itemContext.itemBody);
  
  // If only one fragment (no dividers), use the regular single-item builder
  if (fragments.length <= 1) {
    return buildAssessmentItemXml(itemContext);
  }

  // Build multiple items
  const baseIdentifier = itemContext.identifier?.trim() || 'item';
  const baseTitle = itemContext.title?.trim() || 'Untitled Item';
  const lang = itemContext.lang?.trim() || 'en';

  const itemXmls = fragments.map((fragmentBody, index) => {
    const itemNumber = index + 1;
    const fragmentDoc = document.implementation.createDocument(QTI_NS, 'qti-item-body', null);
    const importedFragment = fragmentDoc.importNode(fragmentBody, true);
    fragmentDoc.replaceChild(importedFragment, fragmentDoc.documentElement);

    const fragmentContext: ComposerItemContext = {
      identifier: `${baseIdentifier}-${itemNumber}`,
      title: `${baseTitle} ${itemNumber}`,
      lang,
      itemBody: fragmentDoc,
    };

    return buildAssessmentItemXml(fragmentContext);
  });

  // Join multiple items with a comment separator for clarity
  const separator = '\n\n<!-- Next Assessment Item -->\n\n';
  return itemXmls.join(separator);
}

/**
 * Build a single QTI assessment item, converting any dividers to <hr /> elements.
 * Use this when you want to export the entire editor content as one item.
 */
export function buildSingleAssessmentItemXml(itemContext?: ComposerItemContext): string {
  if (!itemContext?.itemBody) return '';

  // Convert dividers to <hr /> elements
  const convertedDoc = convertDividersToHr(itemContext.itemBody);

  return buildAssessmentItemXml({
    ...itemContext,
    itemBody: convertedDoc,
  });
}

/**
 * Count how many items would be generated from an item body document.
 * Returns 1 if no dividers, or dividers.length + 1 otherwise.
 */
export function countItemFragments(itemContext?: ComposerItemContext): number {
  if (!itemContext?.itemBody) return 0;

  const fragments = splitItemBodyAtDividers(itemContext.itemBody);
  return fragments.length;
}

/**
 * Get an array of individual assessment item XMLs.
 * Each item is generated from a segment between dividers.
 * Returns an array with identifier and XML for each item.
 */
export function getItemFragmentXmls(itemContext?: ComposerItemContext): Array<{ identifier: string; title: string; xml: string }> {
  if (!itemContext?.itemBody) return [];

  const fragments = splitItemBodyAtDividers(itemContext.itemBody);
  
  // If only one fragment (no dividers), return single item
  if (fragments.length <= 1) {
    const xml = buildAssessmentItemXml(itemContext);
    return [{
      identifier: itemContext.identifier?.trim() || 'item-1',
      title: itemContext.title?.trim() || 'Untitled Item',
      xml,
    }];
  }

  const baseIdentifier = itemContext.identifier?.trim() || 'item';
  const baseTitle = itemContext.title?.trim() || 'Untitled Item';
  const lang = itemContext.lang?.trim() || 'en';

  return fragments.map((fragmentBody, index) => {
    const itemNumber = index + 1;
    const fragmentDoc = document.implementation.createDocument(QTI_NS, 'qti-item-body', null);
    const importedFragment = fragmentDoc.importNode(fragmentBody, true);
    fragmentDoc.replaceChild(importedFragment, fragmentDoc.documentElement);

    const identifier = `${baseIdentifier}-${itemNumber}`;
    const title = `${baseTitle} ${itemNumber}`;

    const fragmentContext: ComposerItemContext = {
      identifier,
      title,
      lang,
      itemBody: fragmentDoc,
    };

    return {
      identifier,
      title,
      xml: buildAssessmentItemXml(fragmentContext),
    };
  });
}

function composeAndNormalizeItemBody(itemBody: Element, xmlDoc: Document): {
  declarations: ResponseDeclaration[];
  responseTemplate: string;
  maxScore: number;
} {
  const declarations: ResponseDeclaration[] = [];
  const seenIdentifiers = new Set<string>();
  const templateCandidates = new Set<string>();
  let maxScore = 0;

  const elements = Array.from(itemBody.querySelectorAll('*'));
  elements.forEach(element => {
    const tagName = element.tagName.toLowerCase();
    const handler = getInteractionComposerHandler(tagName);
    const isInteractionCandidate = tagName.endsWith('-interaction') || element.hasAttribute('response-identifier');

    if (handler) {
      const composeResult = handler.compose(element, xmlDoc);

      composeResult.warnings.forEach(warning => {
        console.warn(`[QTI Composer] ${warning.message}`);
      });

      const parent = element.parentNode;
      if (parent) {
        parent.replaceChild(composeResult.normalizedElement, element);
        
        // Insert any additional elements (like rubric blocks) after the interaction
        if (composeResult.additionalElements?.length) {
          const nextSibling = composeResult.normalizedElement.nextSibling;
          for (const additionalElement of composeResult.additionalElements) {
            if (nextSibling) {
              parent.insertBefore(additionalElement, nextSibling);
            } else {
              parent.appendChild(additionalElement);
            }
          }
        }
      }

      if (composeResult.responseDeclaration) {
        maxScore += composeResult.responseDeclaration.score ?? 1;
      }

      if (composeResult.responseDeclaration && !seenIdentifiers.has(composeResult.responseDeclaration.identifier)) {
        const responseProcessingKind = (composeResult as { responseProcessingKind?: ResponseProcessingKind })
          .responseProcessingKind;
        declarations.push({
          ...composeResult.responseDeclaration,
          responseProcessingKind,
        });
        seenIdentifiers.add(composeResult.responseDeclaration.identifier);
      }

      if (composeResult.responseProcessingTemplate && composeResult.responseDeclaration) {
        templateCandidates.add(composeResult.responseProcessingTemplate);
      }
      return;
    }

    if (isInteractionCandidate) {
      console.warn(
        `[QTI Composer] Missing interaction composer handler for ${tagName}; keeping element as-is during compose.`
      );
    }
  });

  itemBody.querySelectorAll('[correct-response]').forEach(interaction => {
    interaction.removeAttribute('correct-response');
  });

  itemBody.querySelectorAll('[score]').forEach(element => {
    element.removeAttribute('score');
  });

  normalizeResponseIdentifiers(itemBody, declarations);

  if (declarations.length === 1 && templateCandidates.size === 1) {
    return { declarations, responseTemplate: Array.from(templateCandidates)[0], maxScore };
  }

  return { declarations, responseTemplate: MATCH_CORRECT_TEMPLATE, maxScore };
}

function buildMultiInteractionResponseProcessing(xmlDoc: Document, declarations: ResponseDeclaration[]): Element {
  const responseProcessing = xmlDoc.createElementNS(QTI_NS, 'qti-response-processing');

  declarations.forEach(declaration => {
    const kind = declaration.responseProcessingKind ?? 'match_correct';

    if (kind === 'match_correct') {
      responseProcessing.appendChild(createMatchCorrectContribution(xmlDoc, declaration.identifier, declaration.score ?? 1));
      return;
    }

    if (kind === 'map_response') {
      responseProcessing.appendChild(createMapResponseContribution(xmlDoc, declaration.identifier));
      return;
    }

    responseProcessing.appendChild(createMapResponsePointContribution(xmlDoc, declaration.identifier));
  });

  return responseProcessing;
}

function createMatchCorrectContribution(xmlDoc: Document, responseIdentifier: string, score = 1): Element {
  const responseCondition = xmlDoc.createElementNS(QTI_NS, 'qti-response-condition');
  const responseIf = xmlDoc.createElementNS(QTI_NS, 'qti-response-if');
  const match = xmlDoc.createElementNS(QTI_NS, 'qti-match');

  const variable = xmlDoc.createElementNS(QTI_NS, 'qti-variable');
  variable.setAttribute('identifier', responseIdentifier);
  match.appendChild(variable);

  const correct = xmlDoc.createElementNS(QTI_NS, 'qti-correct');
  correct.setAttribute('identifier', responseIdentifier);
  match.appendChild(correct);

  responseIf.appendChild(match);
  const incrementValue = xmlDoc.createElementNS(QTI_NS, 'qti-base-value');
  incrementValue.setAttribute('base-type', 'float');
  incrementValue.textContent = String(score);
  responseIf.appendChild(createScoreIncrement(xmlDoc, incrementValue));

  responseCondition.appendChild(responseIf);
  return responseCondition;
}

function createMapResponseContribution(xmlDoc: Document, responseIdentifier: string): Element {
  const mapResponse = xmlDoc.createElementNS(QTI_NS, 'qti-map-response');
  const variable = xmlDoc.createElementNS(QTI_NS, 'qti-variable');
  variable.setAttribute('identifier', responseIdentifier);
  mapResponse.appendChild(variable);
  return createScoreIncrement(xmlDoc, mapResponse);
}

function createMapResponsePointContribution(xmlDoc: Document, responseIdentifier: string): Element {
  const mapResponsePoint = xmlDoc.createElementNS(QTI_NS, 'qti-map-response-point');
  const variable = xmlDoc.createElementNS(QTI_NS, 'qti-variable');
  variable.setAttribute('identifier', responseIdentifier);
  mapResponsePoint.appendChild(variable);
  return createScoreIncrement(xmlDoc, mapResponsePoint);
}

function createScoreIncrement(xmlDoc: Document, contribution: Element): Element {
  const setOutcomeValue = xmlDoc.createElementNS(QTI_NS, 'qti-set-outcome-value');
  setOutcomeValue.setAttribute('identifier', 'SCORE');

  const sum = xmlDoc.createElementNS(QTI_NS, 'qti-sum');
  const currentScore = xmlDoc.createElementNS(QTI_NS, 'qti-variable');
  currentScore.setAttribute('identifier', 'SCORE');

  sum.appendChild(currentScore);
  sum.appendChild(contribution);
  setOutcomeValue.appendChild(sum);

  return setOutcomeValue;
}

function normalizeResponseIdentifiers(itemBody: Element, declarations: ResponseDeclaration[]): void {
  if (declarations.length === 0) return;

  const identifierMap = new Map<string, string>();
  if (declarations.length === 1) {
    identifierMap.set(declarations[0].identifier, 'RESPONSE');
  } else {
    declarations.forEach((declaration, index) => {
      identifierMap.set(declaration.identifier, `RESPONSE${index + 1}`);
    });
  }

  itemBody.querySelectorAll('[response-identifier]').forEach(interaction => {
    const currentIdentifier = interaction.getAttribute('response-identifier')?.trim();
    if (!currentIdentifier) return;

    const mappedIdentifier = identifierMap.get(currentIdentifier);
    if (mappedIdentifier) {
      interaction.setAttribute('response-identifier', mappedIdentifier);
    }
  });

  declarations.forEach(declaration => {
    const mappedIdentifier = identifierMap.get(declaration.identifier);
    if (mappedIdentifier) {
      declaration.identifier = mappedIdentifier;
    }
  });
}

export function formatXml(xml: string): string {
  const PADDING = '  ';
  const reg = /(>)(<)(\/*)/g;
  let pad = 0;

  xml = xml.replace(reg, '$1\n$2$3');
  return xml
    .split('\n')
    .map(node => {
      const trimmed = node.trim();
      const isClosingTag = /^<\//.test(trimmed);
      const isSelfClosingTag = /\/>$/.test(trimmed);
      const isDeclarationOrDirective = /^<\?/.test(trimmed) || /^<!/.test(trimmed);
      const isOpeningTag = /^<[^!?/][^>]*>$/.test(trimmed) && !isSelfClosingTag;

      if (isClosingTag) {
        pad = Math.max(pad - 1, 0);
      }

      const indent = Math.max(pad, 0);

      if (isOpeningTag && !isDeclarationOrDirective) {
        pad += 1;
      }

      return PADDING.repeat(indent) + node;
    })
    .join('\n');
}
