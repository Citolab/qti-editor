/**
 * @qti-editor/prosemirror
 *
 * Pure ProseMirror plugins for QTI Editor.
 * These plugins work with raw ProseMirror and optionally with ProseKit.
 *
 * Subpath exports:
 * - @qti-editor/prosemirror/block-select - Block node selection
 * - @qti-editor/prosemirror/virtual-cursor - Virtual cursor for mark boundaries
 * - @qti-editor/prosemirror/node-attrs-sync - Node attributes synchronization
 */

// Re-export everything from submodules for convenience
export * from './block-select/index.js';
export * from './virtual-cursor/index.js';
export * from './node-attrs-sync/index.js';
