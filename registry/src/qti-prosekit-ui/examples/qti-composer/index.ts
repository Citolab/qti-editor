/**
 * QTI Composer Example - Entry Point
 *
 * Re-exports all parts needed for the QTI composer example.
 */

// Core types and functions
export type { ComposerItemContext } from '@qti-editor/qti-core/composer';
export { buildAssessmentItemXml, formatXml, extractResponseDeclarations } from '@qti-editor/qti-core/composer';

// Item context
export type { ItemContext } from '@qti-editor/qti-editor-kit/item-context';
export { itemContext, itemContextVariables } from '@qti-editor/qti-editor-kit/item-context';

// Editor example (provides context)
export { QtiComposerProvider } from './editor.js';

// UI component
export { QtiComposer } from '../../ui/qti-composer/index.js';
