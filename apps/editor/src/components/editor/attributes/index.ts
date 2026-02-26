/*
 * QTI Attributes Panel
 * 
 * Local copies of registry components - customize as needed.
 * Core functionality comes from @qti-editor/core (npm installed).
 */

// Core types and functions from npm package
export type {
  SidePanelNodeDetail,
  SidePanelEventDetail,
  QtiAttributesTriggerContext,
  QtiAttributesTrigger,
  QtiAttributesOptions,
} from '@qti-editor/core/attributes';

export {
  qtiAttributesExtension,
  qtiSidePanelExtension,
  updateQtiNodeAttrs,
} from '@qti-editor/core/attributes';

// Local copies (customizable)
export { defineExtension, type AttributesPanelExtensionOptions } from './extension.js';
export { QtiAttributesPanel } from './qti-attributes-panel.js';
