/**
 * Empty-prompt cleanup for the QTI 3.0 export pipeline.
 *
 * Editors often require `<qti-prompt>` as mandatory in their PM schema (so the
 * author always sees a prompt slot to fill). When an item is exported without
 * the author having typed anything into that slot, the prompt serializes as
 * `<qti-prompt><p/></qti-prompt>` — semantically empty and noisy on the wire.
 * `qti-prompt` is `0..1` in QTI 3.0, so dropping an empty one is lossless.
 *
 * Was the counterpart to an `ensureInteractionPrompts` import transform, which synthesised empty
 * prompts to satisfy a schema that required them. The schema makes `qtiPrompt` optional now, so
 * nothing synthesises them — this remains only to drop prompts an author genuinely left empty.
 */

export type RoundtripExportTransform = (itemBody: XMLDocument) => void;

/**
 * Remove every `<qti-prompt>` whose text content is empty (or whitespace-only).
 * Idempotent; safe to apply to any item-body document.
 */
export const stripEmptyPrompts: RoundtripExportTransform = (itemBody: XMLDocument): void => {
  for (const prompt of Array.from(itemBody.querySelectorAll('qti-prompt'))) {
    if (prompt.textContent && prompt.textContent.trim().length > 0) continue;
    prompt.parentNode?.removeChild(prompt);
  }
};

/**
 * The default export-side transforms. Applied to the item-body XMLDocument
 * between roundtrip-xml serialization and `<qti-assessment-item>` assembly.
 */
export const defaultRoundtripExportTransforms: readonly RoundtripExportTransform[] = [stripEmptyPrompts];
