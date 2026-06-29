/*
 * QTI Editor Kit
 *
 * Supported editor assembly surfaces for QTI editing.
 */

export type { QtiDocumentJson, QtiNodeJson } from './types.js';
export {
  qtiCodePanelExtension,
  type QtiCodePanelOptions,
  type QtiCodeUpdateDetail,
} from './code/index.js';
export {
  onQtiContentChange,
  onQtiSelectionChange,
  qtiEditorEventsExtension,
  type QtiContentChangeEventDetail,
  type QtiEditorEventsOptions,
  type QtiSelectionChangeEventDetail,
} from './events/index.js';
export * from './item-context/index.js';
export { xmlFromNode, xmlToHTML } from './save-xml/index.js';
export {
  qtiItemFromProsemirror,
  type QtiComposeContext,
} from './save-qti-item/index.js';
export { registerQtiInteractionElements } from './interactions/prosekit.js';
