/**
 * ProseMirror Toolbar Plugin
 *
 * Provides a menu bar for ProseMirror with support for inserting QTI interactions.
 *
 * Usage:
 * ```typescript
 * import { createMenuBarPlugin, createQtiMenuItems } from '@qti-editor/plugin-toolbar';
 * import { EditorState } from 'prosemirror-state';
 * import { EditorView } from 'prosemirror-view';
 * import {
 *   qtiChoiceInteractionNodeSpec,
 *   qtiPromptNodeSpec,
 *   qtiSimpleChoiceNodeSpec,
 *   qtiTextEntryInteractionNodeSpec,
 * } from '@qti-editor/plugin-qti-interactions';
 *
 * // Ensure your schema includes the camelCase QTI node specs above.
 * const qtiMenu = createQtiMenuItems(schema);
 * const menuPlugin = createMenuBarPlugin({ qtiItems: qtiMenu });
 *
 * const state = EditorState.create({
 *   schema,
 *   plugins: [menuPlugin]
 * });
 * ```
 */

// Pure ProseMirror API
export {
  createMenuBarPlugin,
  createDetachedMenuBarPlugin,
  type MenuBarOptions,
  type DetachedMenuBarOptions,
} from './menu-bar';
export { createQtiMenuItems, createInsertNodeMenuItem, type QtiMenuItem } from './qti-menu-items';
export { buildBasicMenuItems } from './basic-menu';

// ProseKit Adapter
export { defineToolbarExtension, type ToolbarExtensionOptions } from './prosekit';
