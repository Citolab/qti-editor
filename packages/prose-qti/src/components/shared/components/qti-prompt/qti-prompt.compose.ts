/**
 * Compose-time normalization for `qti-prompt`.
 *
 * A `qti-prompt` is mandatory in the editor schema (so its attributes panel and
 * edit affordances are always reachable), but an empty prompt carries no QTI
 * meaning. Interaction compose handlers call `removeEmptyPrompts` on their
 * normalized element so the prompt is dropped from the final QTI output while
 * the lossless roundtrip-xml subformat keeps the authored editor state intact.
 */

/**
 * Remove every `qti-prompt` with nothing authored in it. Text alone is not the test: a picture, a
 * sound or a film counts too (a spoken question, a picture prompt). QTI 3.0 allows `img`, `audio`
 * and `video` in `qti-prompt`.
 */
export function removeEmptyPrompts(element: Element): void {
  const prompts = Array.from(element.getElementsByTagName('qti-prompt'));
  for (const prompt of prompts) {
    if ((prompt.textContent ?? '').trim().length > 0) continue;
    if (prompt.querySelector('img, audio, video')) continue;
    prompt.parentNode?.removeChild(prompt);
  }
}
