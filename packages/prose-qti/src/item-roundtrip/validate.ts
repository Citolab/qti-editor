import { htmlToPm, pmToHtml } from './convert.js';
import { diffHtmlStructure } from './diff-html.js';

import type { HtmlToPmOptions } from './convert.js';
import type { HtmlChange } from './diff-html.js';

/**
 * Does this HTML survive the roundtrip format unchanged?
 *
 *     html -> ProseMirror (parsed against the schema) -> html
 *
 * If the output matches the input, the schema accepted everything as written. If it does not, the
 * differences are what the schema rewrote — and they are reported per element, so a generator can
 * correct a specific mistake rather than guess.
 *
 * ## Why it cannot simply parse and catch an error
 *
 * ProseMirror's parser never rejects invalid markup. It **coerces** — dropping what does not fit,
 * lifting what sits in the wrong place — and it never throws. So there is no error to catch, and
 * comparing input to output is the only way to see what happened.
 *
 * Two earlier versions of this got it wrong, both worth recording:
 *
 *   - comparing the roundtrip against ITSELF (`parse(html)` vs `parse(pmToHtml(parse(html)))`)
 *     measures idempotency, not fidelity. The coercion happens before the first comparison point,
 *     so it is invisible — it duly called a `<table>` nested in a `<qti-prompt>` valid.
 *   - comparing tag COUNTS catches an element vanishing but is blind to lifting, which is the most
 *     common correction the schema makes. Counts are unchanged when a table is moved out of a
 *     prompt; the document is not.
 *
 * Hence a path-aware diff, which matches moved elements so they stay out of the report and only
 * genuine additions and removals are surfaced. See `diffHtmlStructure` — internal on purpose.
 */

export interface ValidationResult {
  /** True when the schema kept the input exactly as written. */
  valid: boolean;
  /** Per element: what the schema added and what it removed, with paths. */
  changes: HtmlChange[];
  /**
   * True when the changes involve interactions whose roundtrip is known to be unstable. Such a
   * failure is more likely our bug than the input's, and should not be reported to a generator as
   * its mistake.
   */
  suspect: boolean;
  /** The document as the schema would have it. Hand this back as the corrected form. */
  normalizedHtml: string;
}

/**
 * Interactions whose `pm -> html -> pm` roundtrip is currently not an identity.
 *
 * Measured on the 17-item regression corpus with a shared schema: 11/17 hold. These are the ones
 * that do not — match and associate gain nodes on re-parse, and inline-choice loses a leading space.
 */
const UNSTABLE_TAGS = [
  'qti-simple-match-set',
  'qti-match-interaction',
  'qti-associate-interaction',
  'qti-inline-choice-interaction'
];

export function validateHtml(html: string, options: HtmlToPmOptions = {}): ValidationResult {
  const normalizedHtml = pmToHtml(htmlToPm(html, options), options);
  const changes = diffHtmlStructure(html, normalizedHtml);
  const suspect = changes.length > 0 && UNSTABLE_TAGS.some(tag => html.includes(`<${tag}`));

  return { valid: changes.length === 0, changes, suspect, normalizedHtml };
}
