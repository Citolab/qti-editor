/**
 * Lit Toolbar Plugin
 *
 * Provides a toolbar extension for ProseKit editors.
 *
 * Usage:
 * ```typescript
 * import { defineToolbarExtension } from '@qti-editor/plugin-toolbar';
 *
 * const extension = union(
 *   defineToolbarExtension({ getEditor: () => editor }),
 * );
 * ```
 */

export { LitToolbar } from './toolbar';
export type { ToolbarInsertItem, ToolbarInsertItemsProvider, ToolbarInsertMenu } from './toolbar';
export { defineToolbarExtension, type ToolbarExtensionOptions } from './prosekit';
export { toolbarInsertMenus } from './insert-menus';