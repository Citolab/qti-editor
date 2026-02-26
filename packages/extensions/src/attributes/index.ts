/*
 * Attributes Extension
 * 
 * Re-exports the attributes functionality from core.
 * This provides a consistent import path for extensions.
 */

export {
  qtiAttributesExtension,
  qtiSidePanelExtension,
  updateQtiNodeAttrs,
  type SidePanelNodeDetail,
  type SidePanelEventDetail,
  type QtiAttributesTriggerContext,
  type QtiAttributesTrigger,
  type QtiAttributesOptions,
} from '@qti-editor/core/attributes';
