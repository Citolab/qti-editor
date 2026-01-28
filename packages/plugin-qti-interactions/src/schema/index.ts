/*
 * QTI Schema Package
 *
 * Pure ProseMirror schema for QTI (Question and Test Interoperability) elements.
 * Framework-agnostic - works with vanilla ProseMirror, Tiptap, Remirror, ProseKit, etc.
 *
 * Usage:
 * ```typescript
 * import { createQtiSchema } from '@qti-editor/plugin-qti-interactions/schema';
 * import { EditorState } from 'prosemirror-state';
 * import { EditorView } from 'prosemirror-view';
 *
 * const schema = createQtiSchema();
 * const state = EditorState.create({ schema });
 * const view = new EditorView(document.body, { state });
 * ```
 */

// =============================================================================
// Pure ProseMirror API (framework-agnostic)
// =============================================================================

export {
  // Schema factory
  createQtiSchema,
  // Node specs
  baseNodes,
  qtiNodes,
  qtiMarks,
  allNodes,
  // Utilities
  tagNameToNodeName,
  toolbarNodeNames,
  // Types
  type CreateQtiSchemaOptions,
} from './prosemirror';

// Raw generated specs (for advanced usage)
export { nodes, marks } from './prosemirror-schema';

// =============================================================================
// Element Definitions (for UI integration - menus, toolbars, etc.)
// =============================================================================

export type { QtiElementDefinition } from './element-definitions';
export {
  qtiElements,
  insertableElements,
  interactionElements,
  contentElements,
  structureElements,
  toSlashMenuFormat,
  toToolbarFormat,
} from './element-definitions';
