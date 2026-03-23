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
} from '@qti-editor/prosemirror-attributes';

export { qtiAttributesExtension, qtiSidePanelExtension, updateQtiNodeAttrs } from '@qti-editor/prosemirror-attributes';

// Extension configuration
export { defineExtension, type AttributesPanelExtensionOptions } from './extension.js';

// Editor example
export { LitEditorAttributesPanel, registerLitEditorAttributesPanel } from './editor.js';

// UI component
export { QtiAttributesPanel } from '@qti-editor/ui/components/blocks/attributes-panel';
