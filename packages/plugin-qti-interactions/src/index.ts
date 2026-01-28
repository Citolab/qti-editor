/**
 * QTI Plugin - Pure ProseMirror Plugin for QTI Elements
 *
 * A framework-agnostic ProseMirror plugin for QTI (Question and Test Interoperability).
 * Works with vanilla ProseMirror, Tiptap, Remirror, ProseKit, or any ProseMirror-based editor.
 *
 * Usage:
 * ```typescript
 * import { createQtiSchema, createQtiPlugins } from '@qti-editor/plugin-qti-interactions';
 * import { EditorState } from 'prosemirror-state';
 * import { EditorView } from 'prosemirror-view';
 * import { baseKeymap } from 'prosemirror-commands';
 * import { keymap } from 'prosemirror-keymap';
 *
 * const schema = createQtiSchema();
 * const plugins = createQtiPlugins();
 *
 * const state = EditorState.create({
 *   schema,
 *   plugins: [keymap(baseKeymap), ...plugins]
 * });
 * const view = new EditorView(document.body, { state });
 * ```
 */

// =============================================================================
// Schema (pure ProseMirror)
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
  nodes,
  marks,
  // Types
  type CreateQtiSchemaOptions,
} from './schema';

// =============================================================================
// Commands (pure ProseMirror)
// =============================================================================

export {
  insertChoiceInteraction,
  insertTextEntryInteraction,
} from './components';

// =============================================================================
// Keymaps (pure ProseMirror)
// =============================================================================

export {
  createChoiceInteractionKeymap,
  createTextEntryInteractionKeymap,
  splitQtiSimpleChoice,
  liftEmptyQtiSimpleChoice,
} from './components';

// =============================================================================
// Guards (pure ProseMirror)
// =============================================================================

export { createChoiceInteractionGuards } from './components';

// =============================================================================
// Convenience: All QTI Plugins
// =============================================================================

export { createAllQtiPlugins } from './components';

// =============================================================================
// Element Definitions (for UI integration)
// =============================================================================

export type { QtiElementDefinition } from './schema';
export {
  qtiElements,
  insertableElements,
  interactionElements,
  contentElements,
  structureElements,
  toSlashMenuFormat,
  toToolbarFormat,
} from './schema';

// =============================================================================
// Custom Elements (optional - for rendering QTI as web components)
// =============================================================================

export * from './components';
