/**
 * ProseKit Adapter for Toolbar
 *
 * Wraps the ProseMirror menu bar plugin for use with ProseKit.
 */

import { definePlugin } from 'prosekit/core';
import {
  createDetachedMenuBarPlugin,
  createMenuBarPlugin,
  type DetachedMenuBarOptions,
  type MenuBarOptions,
} from './menu-bar';
import { createQtiMenuItems } from './qti-menu-items';

export interface ToolbarExtensionOptions extends Omit<MenuBarOptions, 'schema'> {
  /**
   * Whether to automatically detect and add QTI interaction menu items.
   * @default true
   */
  autoDetectQti?: boolean;

  /**
   * Mount the toolbar outside the editor (avoids the ProseMirror-menubar wrapper).
   */
  mount?: DetachedMenuBarOptions['mount'];

  /**
   * Optional class for the detached toolbar container.
   */
  className?: string;
}

/**
 * Define a toolbar extension for ProseKit
 *
 * Automatically detects QTI nodes in the schema and adds menu items for them.
 *
 * @param options - Configuration options (schema will be extracted from editor)
 * @returns A ProseKit extension
 *
 * @example
 * ```typescript
 * import { defineToolbarExtension } from '@qti-editor/plugin-toolbar';
 * import { createEditor, union } from 'prosekit/core';
 * import { defineQtiExtension } from '@qti-editor/plugin-qti-interactions';
 *
 * const editor = createEditor({
 *   extension: union(
 *     defineQtiExtension(),
 *     defineToolbarExtension()
 *   )
 * });
 * ```
 */
export function defineToolbarExtension(options: ToolbarExtensionOptions = {}) {
  const { autoDetectQti = true, ...menuOptions } = options;

  return definePlugin(({ schema }) => {
    // Auto-detect QTI nodes and create menu items
    let qtiItems = menuOptions.qtiItems;
    if (autoDetectQti && !qtiItems) {
      qtiItems = createQtiMenuItems(schema);
    }

    if (menuOptions.mount) {
      return createDetachedMenuBarPlugin({
        schema,
        ...menuOptions,
        qtiItems,
        mount: menuOptions.mount,
        className: menuOptions.className,
      });
    }

    return createMenuBarPlugin({
      schema,
      ...menuOptions,
      qtiItems,
    });
  });
}
