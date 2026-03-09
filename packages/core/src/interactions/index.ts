/**
 * QTI Interactions - ProseMirror schemas and components for QTI elements.
 *
 * Re-exports from split @qti-editor/interactions-* packages for use in
 * ProseMirror-based editors.
 *
 * For ProseKit integration, use:
 * ```typescript
 * import { defineQtiExtension } from '@qti-editor/core/interactions/prosekit';
 * ```
 */
export * from '@qti-editor/interactions-shared';
export * from '@qti-editor/interactions-qti-choice';
export * from '@qti-editor/interactions-qti-text-entry';
export * from '@qti-editor/interactions-qti-select-point';
export * from '@qti-editor/interactions-qti-inline-choice';
