/**
 * @qti-editor/prosemirror-plugins
 *
 * Pure ProseMirror plugins for QTI Editor.
 * These plugins work with raw ProseMirror and optionally with ProseKit.
 *
 * Subpath exports:
 * - @qti-editor/prosemirror-plugins/block-select - Block node selection
 * - @qti-editor/prosemirror-plugins/node-attrs-sync - Node attributes synchronization
 * - @qti-editor/prosemirror-plugins/paste-semantic-html - Semantic paste normalization
 * - @qti-editor/prosemirror-plugins/schema-gaps - What a schema cannot represent in imported markup
 */

// Re-export everything from submodules for convenience
export * from './block-select/index.js';
export * from './node-attrs-sync/index.js';
export * from './paste-semantic-html/index.js';
export * from './schema-gaps/index.js';
