/**
 * RECOGNISING RESPONSE PROCESSING — which scoring model an imported item uses.
 *
 * QTI expresses scoring as a *program*, and an item may write that program in
 * two ways: reference one of the three standard templates by URI, or write the
 * rules out inline. The editor previously recognised exactly one thing — a
 * `template` attribute ending in `match_correct` — and treated everything else
 * as "no response processing", which is how a mapping-scored item came back out
 * as all-or-nothing `match_correct`.
 *
 * Not one item in the Kennisnet corpus uses a `template` attribute. All sixteen
 * write their rules inline, thirteen of them mapping-based. So the inline shapes
 * are the main path here, not the fallback.
 *
 * This module only *reads*. It says which kind each response identifier is
 * scored by and what it could not understand; deciding what to do about that
 * belongs to the transforms and to the gap scan.
 */

import type { QtiAreaMapping, QtiStringMapping, ResponseProcessingKind } from '@citolab/prose-qti/interfaces';

const RESERVED_OUTCOME_IDENTIFIERS = new Set(['SCORE', 'MAXSCORE']);

const RESPONSE_PROCESSING_KINDS = new Set<string>([
  'match_correct',
  'map_response',
  'map_response_point',
]);

/** What an item's response processing says, per response identifier. */
export interface ResponseProcessingFacts {
  /** The scoring model each response identifier is scored by. */
  kindByIdentifier: Map<string, ResponseProcessingKind>;
  /**
   * Literal SCORE increments read out of `match_correct`-shaped conditions.
   * Only these carry a number; the mapping kinds keep their values in the
   * declaration instead.
   */
  literalScoreByIdentifier: Map<string, number>;
  /**
   * Rules no branch below could classify. Each is a real element from the
   * source document, so a caller can quote or preserve it verbatim.
   */
  unrecognized: Element[];
  /** The kind named by a `template` attribute, when there is one. */
  templateKind: ResponseProcessingKind | null;
  /** A `template` attribute whose URI named nothing recognisable. */
  unrecognizedTemplate: string | null;
}

/**
 * Reduce a template URI to its bare name, the way the runtime does.
 *
 * The runtime takes the last `/` segment and strips a `.xml` suffix
 * (`chunk-Q3ZK3PKR.js`), so `…/rptemplates/map_response_point.xml` and
 * `…/rptemplates/map_response_point` are the same template to it. Matching the
 * same way is what makes this tolerant of the suffix inconsistency in the repo's
 * own output — select-point emits the `.xml` form while nothing else does — and
 * of any host serving the standard templates from a different URL.
 */
export function normalizeTemplateUri(uri: string): string {
  const lastSegment = uri.trim().split('/').pop() ?? '';
  return lastSegment.replace(/\.xml$/, '');
}

/**
 * The scoring model an item's response processing uses, per response identifier.
 *
 * A `template` attribute wins outright and the inline rules are not read — not
 * as a preference, but because the runtime *replaces* its own children with the
 * built-in template when it sees one, so any inline rules alongside a template
 * are dead code in delivery too.
 */
export function analyzeResponseProcessing(xmlDoc: XMLDocument): ResponseProcessingFacts {
  const facts: ResponseProcessingFacts = {
    kindByIdentifier: new Map(),
    literalScoreByIdentifier: new Map(),
    unrecognized: [],
    templateKind: null,
    unrecognizedTemplate: null,
  };

  const processing = xmlDoc.querySelector('qti-response-processing');
  if (!processing) {
    applyDeclarationShapeFallback(xmlDoc, facts);
    return facts;
  }

  const template = processing.getAttribute('template');
  if (template != null && template.trim().length > 0) {
    const name = normalizeTemplateUri(template);
    if (RESPONSE_PROCESSING_KINDS.has(name)) {
      facts.templateKind = name as ResponseProcessingKind;
      // The built-in templates all hardcode `identifier="RESPONSE"`, so a
      // template says nothing about any other declaration.
      const identifier = templateTargetIdentifier(xmlDoc);
      if (identifier) facts.kindByIdentifier.set(identifier, facts.templateKind);
    } else {
      facts.unrecognizedTemplate = template;
      facts.unrecognized.push(processing);
    }
    applyDeclarationShapeFallback(xmlDoc, facts);
    return facts;
  }

  for (const rule of Array.from(processing.children)) {
    readRule(rule, facts);
  }

  applyDeclarationShapeFallback(xmlDoc, facts);
  return facts;
}

/**
 * Which declaration a `template` attribute is talking about.
 *
 * The built-ins name `RESPONSE`, so prefer a declaration by that name. Failing
 * that, a single-declaration item is unambiguous — and compose renames a lone
 * declaration to `RESPONSE` on the way out anyway, so the two agree.
 */
function templateTargetIdentifier(xmlDoc: XMLDocument): string | null {
  const declarations = Array.from(xmlDoc.querySelectorAll('qti-response-declaration'));
  const reserved = declarations.find(d => d.getAttribute('identifier') === 'RESPONSE');
  if (reserved) return 'RESPONSE';
  if (declarations.length === 1) return declarations[0].getAttribute('identifier');
  return null;
}

/** Classify one direct child of `qti-response-processing`. */
function readRule(rule: Element, facts: ResponseProcessingFacts): void {
  const tag = rule.tagName.toLowerCase();

  if (tag === 'qti-set-outcome-value') {
    readSetOutcomeValue(rule, facts);
    return;
  }

  if (tag === 'qti-response-condition') {
    readResponseCondition(rule, facts);
    return;
  }

  facts.unrecognized.push(rule);
}

/**
 * `<qti-set-outcome-value identifier="SCORE">` — the mapping-based shape, and
 * the one the whole corpus uses.
 */
function readSetOutcomeValue(setOutcome: Element, facts: ResponseProcessingFacts): void {
  // A rule targeting some other outcome (FEEDBACK, a custom variable) is not
  // something this editor can hold.
  if (setOutcome.getAttribute('identifier') !== 'SCORE') {
    facts.unrecognized.push(setOutcome);
    return;
  }

  const expression = setOutcome.firstElementChild;
  if (!expression) {
    facts.unrecognized.push(setOutcome);
    return;
  }

  if (!readScoreExpression(expression, facts)) {
    facts.unrecognized.push(setOutcome);
  }
}

/**
 * A SCORE expression. Returns false when nothing in it was recognised.
 *
 * `qti-sum` recurses: ITEM011 scores three hottext responses with a single
 * `qti-set-outcome-value` wrapping a sum of three `qti-map-response`, so the
 * identifiers are one level down.
 */
function readScoreExpression(expression: Element, facts: ResponseProcessingFacts): boolean {
  const tag = expression.tagName.toLowerCase();

  if (tag === 'qti-map-response' || tag === 'qti-map-response-point') {
    const identifier = expression.getAttribute('identifier');
    if (!identifier) return false;
    facts.kindByIdentifier.set(
      identifier,
      tag === 'qti-map-response' ? 'map_response' : 'map_response_point',
    );
    return true;
  }

  if (tag === 'qti-sum') {
    let recognizedAny = false;
    for (const operand of Array.from(expression.children)) {
      const operandTag = operand.tagName.toLowerCase();

      // The running SCORE total in an accumulating rule — structural, not a
      // contribution.
      if (
        operandTag === 'qti-variable' &&
        RESERVED_OUTCOME_IDENTIFIERS.has(operand.getAttribute('identifier') ?? '')
      ) {
        recognizedAny = true;
        continue;
      }

      if (readScoreExpression(operand, facts)) recognizedAny = true;
      else return false;
    }
    return recognizedAny;
  }

  // A bare literal. `0` is the SCORE initialisation rule every corpus item
  // opens with; a positive literal is a flat award with no response to attach
  // it to, which is recognised but has nothing to record.
  if (tag === 'qti-base-value') return true;

  return false;
}

/**
 * `<qti-response-condition>` — the `match_correct` shape, written out.
 *
 * Reuses the identifier and increment readers that already know not to mistake
 * the SCORE accumulator for the response being tested.
 */
function readResponseCondition(condition: Element, facts: ResponseProcessingFacts): void {
  const identifier = conditionResponseIdentifier(condition);
  if (!identifier) {
    facts.unrecognized.push(condition);
    return;
  }

  if (condition.querySelector('qti-match') == null) {
    facts.unrecognized.push(condition);
    return;
  }

  facts.kindByIdentifier.set(identifier, 'match_correct');

  const increment = conditionScoreIncrement(condition);
  if (increment !== null) facts.literalScoreByIdentifier.set(identifier, increment);
}

/**
 * Give any declaration the rules did not reach a kind, from its own shape.
 *
 * Two cases need this. A `template` attribute names only `RESPONSE`, so the
 * other declarations of a multi-response item would otherwise have no kind. And
 * an item whose rules this cannot parse still has a readable declaration — so it
 * imports with an honest model rather than silently defaulting to
 * `match_correct`, which is the failure this module exists to end.
 *
 * Never overwrites a kind a rule established: the rules are what the delivery
 * engine actually runs.
 */
function applyDeclarationShapeFallback(xmlDoc: XMLDocument, facts: ResponseProcessingFacts): void {
  for (const declaration of Array.from(xmlDoc.querySelectorAll('qti-response-declaration'))) {
    const identifier = declaration.getAttribute('identifier');
    if (!identifier || facts.kindByIdentifier.has(identifier)) continue;

    if (declaration.querySelector('qti-mapping')) {
      facts.kindByIdentifier.set(identifier, 'map_response');
    } else if (declaration.querySelector('qti-area-mapping')) {
      facts.kindByIdentifier.set(identifier, 'map_response_point');
    } else if (declaration.querySelector('qti-correct-response')) {
      facts.kindByIdentifier.set(identifier, 'match_correct');
    }
    // Neither: unscorable, e.g. ITEM005's manually-marked extended text. No
    // kind is the right answer, not a guessed one.
  }
}

/**
 * Read a `qti-mapping` into the editor's mapping shape.
 *
 * `caseSensitive` is left `undefined` when the attribute is absent rather than
 * defaulted to `false`: only two corpus items write it, and materialising a
 * default would add the attribute to every other item's export.
 */
export function readStringMapping(declaration: Element): QtiStringMapping | null {
  const mapping = declaration.querySelector('qti-mapping');
  if (!mapping) return null;

  const entries = Array.from(mapping.querySelectorAll('qti-map-entry'))
    .map(entry => {
      const mapKey = entry.getAttribute('map-key');
      if (mapKey == null) return null;
      const caseSensitive = entry.getAttribute('case-sensitive');
      return {
        mapKey,
        mappedValue: parseFiniteNumber(entry.getAttribute('mapped-value')) ?? 0,
        ...(caseSensitive == null ? {} : { caseSensitive: caseSensitive === 'true' }),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (entries.length === 0) return null;

  return {
    defaultValue: parseFiniteNumber(mapping.getAttribute('default-value')) ?? 0,
    lowerBound: parseFiniteNumber(mapping.getAttribute('lower-bound')),
    upperBound: parseFiniteNumber(mapping.getAttribute('upper-bound')),
    entries: entries as QtiStringMapping['entries'],
  };
}

/**
 * Read a `qti-area-mapping` into the editor's area-mapping shape.
 *
 * Only the shapes the editor models (circle, rect) are kept; anything else has
 * no node to live in and is reported by the gap scan instead.
 */
export function readAreaMapping(declaration: Element): QtiAreaMapping | null {
  const mapping = declaration.querySelector('qti-area-mapping');
  if (!mapping) return null;

  const entries = Array.from(mapping.querySelectorAll('qti-area-map-entry'))
    .map(entry => {
      const shape = entry.getAttribute('shape');
      const coords = entry.getAttribute('coords')?.trim();
      if ((shape !== 'circle' && shape !== 'rect') || !coords) return null;
      return {
        shape: shape as 'circle' | 'rect',
        coords,
        mappedValue: parseFiniteNumber(entry.getAttribute('mapped-value')) ?? 0,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (entries.length === 0) return null;

  return {
    defaultValue: parseFiniteNumber(mapping.getAttribute('default-value')) ?? 0,
    lowerBound: parseFiniteNumber(mapping.getAttribute('lower-bound')),
    upperBound: parseFiniteNumber(mapping.getAttribute('upper-bound')),
    entries,
  };
}

/**
 * The response identifier a condition tests.
 *
 * `qti-correct` is unambiguous, so it wins. Otherwise fall back to a
 * `qti-variable` that is not one of the reserved outcome identifiers — the
 * SCORE accumulator inside `qti-set-outcome-value` is also a `qti-variable`.
 */
export function conditionResponseIdentifier(condition: Element): string | null {
  const correct = condition.querySelector('qti-correct[identifier]');
  const fromCorrect = correct?.getAttribute('identifier');
  if (fromCorrect) return fromCorrect;

  for (const variable of Array.from(condition.querySelectorAll('qti-variable[identifier]'))) {
    const identifier = variable.getAttribute('identifier');
    if (identifier && !RESERVED_OUTCOME_IDENTIFIERS.has(identifier)) return identifier;
  }

  return null;
}

/**
 * The literal SCORE increment a condition awards.
 *
 * The `> 0` guard skips the initial-state set
 * (`<qti-set-outcome-value identifier="SCORE"><qti-base-value>0</...>`) so the
 * real award inside `qti-sum` wins when both are present.
 */
export function conditionScoreIncrement(condition: Element): number | null {
  const setOutcomes = condition.querySelectorAll('qti-set-outcome-value[identifier="SCORE"]');

  for (const setOutcome of Array.from(setOutcomes)) {
    const candidates = [
      ...Array.from(setOutcome.querySelectorAll(':scope > qti-sum > qti-base-value')),
      ...Array.from(setOutcome.querySelectorAll(':scope > qti-base-value')),
    ];

    for (const baseValue of candidates) {
      const value = parseFiniteNumber(baseValue.textContent);
      if (value !== null && value > 0) return value;
    }
  }

  return null;
}

function parseFiniteNumber(text: string | null | undefined): number | null {
  if (text == null) return null;
  const n = Number(text.trim());
  return Number.isFinite(n) ? n : null;
}
