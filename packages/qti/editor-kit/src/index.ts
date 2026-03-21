/*
 * QTI Editor Kit
 *
 * Supported editor assembly surfaces for QTI editing.
 */

export {
  qtiCodePanelExtension,
  type QtiCodePanelOptions,
  type QtiCodeUpdateDetail,
  type QtiDocumentJson,
  type QtiNodeJson,
} from './code/index.js';
export * from './editor-context/index.js';
export {
  onQtiContentChange,
  onQtiSelectionChange,
  qtiEditorEventsExtension,
  type QtiContentChangeEventDetail,
  type QtiEditorEventsOptions,
  type QtiSelectionChangeEventDetail,
} from './events/index.js';
export * from './interactions/index.js';
export * from './item-context/index.js';
