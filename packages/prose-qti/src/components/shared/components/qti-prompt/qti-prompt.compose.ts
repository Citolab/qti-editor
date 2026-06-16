/**
 * Compose-time normalization for `qti-prompt`.
 *
 * A `qti-prompt` is mandatory in the editor schema (so its attributes panel and
 * edit affordances are always reachable), but an empty prompt carries no QTI
 * meaning. Interaction compose handlers call `removeEmptyPrompts` on their
 * normalized element so the prompt is dropped from the final QTI output while
 * the lossless roundtrip-xml subformat keeps the authored editor state intact.
 */

/** Remove every direct or nested `qti-prompt` child with no authored text. */
export function removeEmptyPrompts(element: Element): void {
  const prompts = Array.from(element.getElementsByTagName('qti-prompt'));
  for (const prompt of prompts) {
    if ((prompt.textContent ?? '').trim().length === 0) {
      prompt.parentNode?.removeChild(prompt);
    }
  }
}
