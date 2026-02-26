/**
 * Attributes Panel Example - Entry Point
 *
 * Re-exports all parts needed for the attributes panel example.
 */

// Core types and functions
export type {
  SidePanelNodeDetail,
  SidePanelEventDetail,
  QtiAttributesTriggerContext,
  QtiAttributesTrigger,
  QtiAttributesOptions,
} from '@qti-editor/core/attributes';

export { qtiAttributesExtension, qtiSidePanelExtension, updateQtiNodeAttrs } from '@qti-editor/core/attributes';

// Extension configuration
export { defineExtension, type AttributesPanelExtensionOptions } from './extension.js';

// Editor example
export { LitEditorAttributesPanel, registerLitEditorAttributesPanel } from './editor.js';

// UI component
export { QtiAttributesPanel } from '../../ui/attributes-panel/index.js';
