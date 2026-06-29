/**
 * `@citolab/prose-qti/item-roundtrip`
 *
 * Convenience composition of the QTI 3.0 item <-> ProseMirror roundtrip:
 *   - import: QTI item (string or URL) -> roundtrip transforms -> ProseMirror doc
 *   - export: ProseMirror doc -> `<qti-item-body>` -> full `<qti-assessment-item>`
 *
 * The schema is always supplied by the caller (it is editor-specific). This
 * package only bundles the transform chain + PM bridge so consumers stop
 * re-inlining the same pipeline.
 */

export {
  importItemFromString,
  importItemFromUrl,
  importItemXmlDoc,
  defaultRoundtripTransforms,
  type RoundtripImportOptions,
  type RoundtripTransform,
} from './import.js';

export {
  exportItemXml,
  exportItemXmlDoc,
  type RoundtripExportContext,
  type RoundtripExportOptions,
  type RoundtripExportXmlOptions,
} from './export.js';

export { ensureInteractionPrompts } from './ensure-interaction-prompts.js';
export {
  defaultRoundtripExportTransforms,
  stripEmptyPrompts,
  type RoundtripExportTransform,
} from './strip-empty-prompts.js';
