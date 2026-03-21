/**
 * ProseKit Adapter for QTI Interactions
 *
 * Optional adapter for using the QTI interaction schemas with ProseKit.
 *
 * Usage:
 * ```typescript
 * import { defineQtiInteractionsExtension, defineQtiExtension } from '@qti-editor/qti-editor-kit/interactions/prosekit';
 * import { createEditor } from 'prosekit/core';
 *
 * // Option 1: Just QTI nodes (compose with your own basic extension)
 * const editor = createEditor({ extension: union(defineBasicExtension(), defineQtiInteractionsExtension()) });
 *
 * // Option 2: All-in-one (includes basic extension)
 * const editor = createEditor({ extension: defineQtiExtension() });
 * ```
 */
export * from '@qti-editor/qti-editor-kit/interactions/prosekit';
