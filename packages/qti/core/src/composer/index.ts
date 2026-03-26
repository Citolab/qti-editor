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
  title?: string;
  itemBody?: Document;
}

export interface ResponseDeclaration {
  identifier: string;
  cardinality: 'single' | 'multiple';
  baseType: 'identifier' | 'point' | 'string';
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
}

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const SCHEMA_LOCATION =
  'http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd';
const MATCH_CORRECT_TEMPLATE =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';

export function extractResponseDeclarations(itemBodyRoot?: Element | null): ResponseDeclaration[] {
  if (!itemBodyRoot) return [];

  const tempDoc = document.implementation.createDocument(QTI_NS, 'qti-item-body', null);
  const tempRoot = tempDoc.importNode(itemBodyRoot, true) as Element;
  const { declarations } = composeAndNormalizeItemBody(tempRoot, tempDoc);
  return declarations;
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
  root.setAttributeNS(XML_NS, 'xml:lang', 'en');

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
      const values = declaration.cardinality === 'multiple'
        ? declaration.correctResponse.split(',').map(v => v.trim()).filter(Boolean)
        : [declaration.correctResponse];
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
      }

      if (composeResult.responseDeclaration) {
        maxScore += 1;
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
      responseProcessing.appendChild(createMatchCorrectContribution(xmlDoc, declaration.identifier));
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

function createMatchCorrectContribution(xmlDoc: Document, responseIdentifier: string): Element {
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
  incrementValue.textContent = '1';
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
