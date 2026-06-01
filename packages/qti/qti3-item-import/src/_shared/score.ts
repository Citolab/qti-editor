const MATCH_CORRECT_PATTERN = /match_correct(?:\.xml)?$/;

/**
 * Extract a numeric score from a qti-response-processing block.
 *
 * Order of attempts:
 * 1. template attribute matching `match_correct` → 1
 * 2. qti-set-outcome-value identifier="SCORE" with a direct numeric qti-base-value → that number
 * 3. qti-set-outcome-value identifier="SCORE" containing qti-sum > qti-base-value → that number
 * 4. otherwise → 1 (matches the editor's compose default)
 *
 * The `> 0` guard filters out the initial-state set
 * (`<qti-set-outcome-value identifier="SCORE"><qti-base-value>0</qti-base-value></...>`)
 * so the real accumulator value inside `qti-sum` wins when both are present.
 */
export function extractItemScore(xmlDoc: XMLDocument): number {
  const processing = xmlDoc.querySelector('qti-response-processing');
  if (!processing) return 1;

  const template = processing.getAttribute('template');
  if (template && MATCH_CORRECT_PATTERN.test(template)) return 1;

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

function parseFiniteNumber(text: string | null | undefined): number | null {
  if (text == null) return null;
  const n = Number(text.trim());
  return Number.isFinite(n) ? n : null;
}
