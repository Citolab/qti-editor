/**
 * QTI Composer Example - Entry Point
 *
 * Re-exports all parts needed for the QTI composer example.
 */

// Core types and functions
export type { ComposerItemContext } from '@qti-editor/core/composer';
export { buildAssessmentItemXml, formatXml, extractResponseDeclarations } from '@qti-editor/core/composer';

// Item context
export type { ItemContext } from '@qti-editor/qti-editor-kit/item-context';
export { itemContext, itemContextVariables } from '@qti-editor/qti-editor-kit/item-context';

// Editor example (provides context)
export { QtiComposerProvider } from './editor.js';

// UI component
export { QtiComposer } from '@qti-editor/ui/components/blocks/composer';
