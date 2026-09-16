/**
 * Compose-time normalization for `qti-prompt`.
 *
 * A `qti-prompt` is mandatory in the editor schema (so its attributes panel and
 * edit affordances are always reachable), but an empty prompt carries no QTI
 * meaning. Interaction compose handlers call `removeEmptyPrompts` on their
 * normalized element so the prompt is dropped from the final QTI output while
 * the lossless roundtrip-xml subformat keeps the authored editor state intact.
 */

/** Remove every `qti-prompt` with nothing authored in it. A picture counts; text alone is not the test. */
export function removeEmptyPrompts(element: Element): void {
  const prompts = Array.from(element.getElementsByTagName('qti-prompt'));
  for (const prompt of prompts) {
    if ((prompt.textContent ?? '').trim().length > 0) continue;
    if (prompt.querySelector('img')) continue;
    prompt.parentNode?.removeChild(prompt);
  }
}
