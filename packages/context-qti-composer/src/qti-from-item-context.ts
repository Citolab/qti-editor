import type { ItemContext } from '@qti-editor/context-qti-assessment-item';

type ResponseDeclaration = {
  identifier: string;
  cardinality: 'single' | 'multiple';
  baseType: 'identifier';
  correctResponse?: string;
};

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';
const XSI_NS = 'http://www.w3.org/2001/XMLSchema-instance';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const SCHEMA_LOCATION =
  'http://www.imsglobal.org/xsd/imsqtiasi_v3p0 https://purl.imsglobal.org/spec/qti/v3p0/schema/xsd/imsqti_asiv3p0p1_v1p0.xsd';
const RESPONSE_TEMPLATE =
  'https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct';

function extractResponseDeclarations(itemBodyRoot?: Element | null): ResponseDeclaration[] {
  if (!itemBodyRoot) return [];

  const interactions = itemBodyRoot.querySelectorAll('[response-identifier]');
  const declarations: ResponseDeclaration[] = [];
  const seenIdentifiers = new Set<string>();

  interactions.forEach(interaction => {
    const identifier = interaction.getAttribute('response-identifier')?.trim();
    if (!identifier || seenIdentifiers.has(identifier)) return;

    const tagName = interaction.tagName.toLowerCase();
    if (tagName !== 'qti-choice-interaction') return;

    const maxChoices = Number(interaction.getAttribute('max-choices') ?? '1');
    const cardinality: ResponseDeclaration['cardinality'] =
      Number.isFinite(maxChoices) && maxChoices > 1 ? 'multiple' : 'single';
    const correctResponse = interaction.getAttribute('correct-response')?.trim();

    declarations.push({
      identifier,
      cardinality,
      baseType: 'identifier',
      correctResponse: correctResponse || undefined,
    });
    seenIdentifiers.add(identifier);
  });

  return declarations;
}

/**
 * Builds a full QTI v3 assessment-item XML document from editor context.
 *
 * The function composes a `<qti-assessment-item>` root with required namespaces,
 * metadata (`identifier`, `title`), response declarations inferred from interactions
 * in `itemContext.itemBody`, a default `SCORE` outcome declaration, and default
 * response-processing template.
 *
 * Interaction discovery is selector-based (`[response-identifier]`) and currently
 * maps `qti-choice-interaction` to `qti-response-declaration`.
 *
 * The exported `<qti-item-body>` is copied from context and sanitized by removing
 * any `correct-response` attributes from interaction nodes (correct answers are
 * represented in response declarations instead).
 */
export function buildAssessmentItemXml(itemContext?: ItemContext): string {
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

  const declarations = extractResponseDeclarations(sourceBodyRoot);
  declarations.forEach(declaration => {
    const responseDeclaration = xmlDoc.createElementNS(QTI_NS, 'qti-response-declaration');
    responseDeclaration.setAttribute('identifier', declaration.identifier);
    responseDeclaration.setAttribute('cardinality', declaration.cardinality);
    responseDeclaration.setAttribute('base-type', declaration.baseType);

    if (declaration.correctResponse) {
      const correctResponse = xmlDoc.createElementNS(QTI_NS, 'qti-correct-response');
      const value = xmlDoc.createElementNS(QTI_NS, 'qti-value');
      value.textContent = declaration.correctResponse;
      correctResponse.appendChild(value);
      responseDeclaration.appendChild(correctResponse);
    }

    root.appendChild(responseDeclaration);
  });

  const outcomeDeclaration = xmlDoc.createElementNS(QTI_NS, 'qti-outcome-declaration');
  outcomeDeclaration.setAttribute('identifier', 'SCORE');
  outcomeDeclaration.setAttribute('cardinality', 'single');
  outcomeDeclaration.setAttribute('base-type', 'float');
  root.appendChild(outcomeDeclaration);

  const itemBody =
    sourceBodyRoot != null
      ? (xmlDoc.importNode(sourceBodyRoot, true) as Element)
      : xmlDoc.createElementNS(QTI_NS, 'qti-item-body');

  itemBody.querySelectorAll('[correct-response]').forEach(interaction => {
    interaction.removeAttribute('correct-response');
  });

  root.appendChild(itemBody);

  const responseProcessing = xmlDoc.createElementNS(QTI_NS, 'qti-response-processing');
  responseProcessing.setAttribute('template', RESPONSE_TEMPLATE);
  root.appendChild(responseProcessing);

  return new XMLSerializer().serializeToString(xmlDoc);
}
