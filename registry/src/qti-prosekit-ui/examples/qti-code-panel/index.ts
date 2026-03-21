/**
 * QTI Code Panel Example - Entry Point
 *
 * Re-exports all parts needed for the code panel example.
 */

// Core types and functions
export type {
  QtiCodePanelOptions,
  QtiCodeUpdateDetail,
  QtiDocumentJson,
  QtiNodeJson,
} from '@qti-editor/qti-editor-kit/code';

export { qtiCodePanelExtension } from '@qti-editor/qti-editor-kit/code';

// Extension configuration
export { defineExtension, type CodePanelExtensionOptions } from './extension.js';

// Editor example
export { LitEditorCodePanel, registerLitEditorCodePanel } from './editor.js';

// UI component
export { QtiCodePanel } from '../../ui/qti-code-panel/index.js';
