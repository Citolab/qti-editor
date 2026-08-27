import {
  conditionResponseIdentifier,
  conditionScoreIncrement,
  normalizeTemplateUri,
} from './response-processing.js';

/**
 * Extract a numeric score from a qti-response-processing block.
 *
 * Order of attempts:
 * 1. template attribute naming `match_correct` → 1
 * 2. qti-set-outcome-value identifier="SCORE" with a direct numeric qti-base-value → that number
 * 3. qti-set-outcome-value identifier="SCORE" containing qti-sum > qti-base-value → that number
 * 4. otherwise → 1 (matches the editor's compose default)
 *
 * The `> 0` guard filters out the initial-state set
 * (`<qti-set-outcome-value identifier="SCORE"><qti-base-value>0</qti-base-value></...>`)
 * so the real accumulator value inside `qti-sum` wins when both are present.
 *
 * This collapses the whole item to ONE number and is only correct for
 * single-interaction items. Prefer {@link buildScoreIndex}, which resolves a
 * score per response identifier, and fall back to this when the index has no
 * entry for an identifier.
 */
export function extractItemScore(xmlDoc: XMLDocument): number {
  const processing = xmlDoc.querySelector('qti-response-processing');
  if (!processing) return 1;

  // One URI parser for the whole import path — see `normalizeTemplateUri`, which
  // reduces a URI the same way the runtime does. A second pattern here would
  // drift from it.
  const template = processing.getAttribute('template');
  if (template && normalizeTemplateUri(template) === 'match_correct') return 1;

  const setOutcomes = processing.querySelectorAll('qti-set-outcome-value[identifier="SCORE"]');
  for (const setOutcome of Array.from(setOutcomes)) {
    const directBaseValue = setOutcome.querySelector(':scope > qti-base-value');
    const directValue = parseFiniteNumber(directBaseValue?.textContent);
    if (directValue !== null && directValue > 0) return directValue;

    const sumBaseValues = setOutcome.querySelectorAll(':scope > qti-sum > qti-base-value');
    for (const bv of Array.from(sumBaseValues)) {
      const value = parseFiniteNumber(bv.textContent);
      if (value !== null && value > 0) return value;
    }
  }

  return 1;
}

/**
 * Resolve the authoring `score` for each response identifier in an item.
 *
 * A multi-interaction item carries one `qti-response-condition` per response,
 * each with its own increment, so a single item-level number cannot represent
 * it — an item weighted 1 / 2 / 3 would import as three interactions all
 * sharing whichever value happened to be found first.
 *
 * Two sources, in increasing precedence:
 *
 * 1. `qti-mapping` on a `qti-response-declaration`. Compose writes the score
 *    into `qti-map-entry/@mapped-value` (one entry per accepted spelling of the
 *    same answer at cardinality `single`), so the largest positive mapped value
 *    reads it back. `qti-area-mapping` is skipped: select-point derives its
 *    points from the area mapping itself, never from `score`.
 * 2. An explicit `qti-response-condition` whose condition references the
 *    identifier and whose body increments SCORE by a literal.
 *
 * Identifiers the item scores by template, or by rules this cannot attribute,
 * are absent from the map — callers should fall back to
 * {@link extractItemScore}.
 */
export function buildScoreIndex(xmlDoc: XMLDocument): Map<string, number> {
  const scores = new Map<string, number>();

  for (const declaration of Array.from(xmlDoc.querySelectorAll('qti-response-declaration'))) {
    const identifier = declaration.getAttribute('identifier');
    if (!identifier) continue;

    const mappedValues = Array.from(declaration.querySelectorAll('qti-mapping > qti-map-entry'))
      .map(entry => parseFiniteNumber(entry.getAttribute('mapped-value')))
      .filter((value): value is number => value !== null && value > 0);

    if (mappedValues.length > 0) {
      scores.set(identifier, Math.max(...mappedValues));
    }
  }

  const processing = xmlDoc.querySelector('qti-response-processing');
  if (!processing) return scores;

  for (const condition of Array.from(processing.querySelectorAll('qti-response-condition'))) {
    const identifier = conditionResponseIdentifier(condition);
    if (!identifier) continue;

    const increment = conditionScoreIncrement(condition);
    if (increment === null) continue;

    scores.set(identifier, increment);
  }

  return scores;
}

function parseFiniteNumber(text: string | null | undefined): number | null {
  if (text == null) return null;
  const n = Number(text.trim());
  return Number.isFinite(n) ? n : null;
}
