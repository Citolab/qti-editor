/*
 * QTI Editor
 * 
 * The umbrella package that re-exports all QTI Editor packages.
 * Import from specific subpaths for tree-shaking.
 * 
 * @example
 * // Import core functionality
 * import { qtiAttributesExtension } from 'qti-editor/core/attributes';
 * import { qtiCodePanelExtension } from 'qti-editor/core/code';
 * import { buildAssessmentItemXml } from 'qti-editor/core/composer';
 * import { qtiEditorContext } from 'qti-editor/core/editor-context';
 * import { qtiEditorEventsExtension } from 'qti-editor/core/events';
 * import { itemContext } from 'qti-editor/core/item-context';
 * 
 * // Import extensions
 * import { qtiAttributesExtension } from 'qti-editor/extensions/attributes';
 * 
 * // Import Lit components
 * import { QtiAttributesPanelBase } from 'qti-editor/lit';
 */

export * from './core.js';
export * from './extensions.js';
