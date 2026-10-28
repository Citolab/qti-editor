/**
 * Plain HTML item content, as ProseMirror specs that both schema paths in this repo take: prose-qti's
 * `createQtiSchema()` (plain ProseMirror) and `defineBasicExtension()` (ProseKit). One definition
 * each, so the two schemas cannot drift apart on what they keep.
 *
 * Plain ProseMirror only; nothing here imports `prosekit`.
 */
export * from './global-attrs.js';
export * from './phrasing-marks.js';
export * from './span.js';
export * from './table-caption.js';
export * from './unique-ids.js';
