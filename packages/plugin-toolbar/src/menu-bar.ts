/**
 * Menu Bar Plugin
 *
 * Creates a ProseMirror menu bar with basic editing commands and optional QTI items.
 */

import { menuBar, type MenuElement } from 'prosemirror-menu';
import type { Schema } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';
import { buildBasicMenuItems } from './basic-menu.js';
import type { QtiMenuItem } from './qti-menu-items.js';

export interface MenuBarOptions {
  /**
   * The ProseMirror schema to use for building menu items
   */
  schema: Schema;
  /**
   * Optional QTI menu items to include in the toolbar
   */
  qtiItems?: QtiMenuItem[];
  /**
   * Whether to float the menu bar (default: true)
   */
  floating?: boolean;
}

/**
 * Create a menu bar plugin for ProseMirror
 *
 * @param options - Configuration options
 * @returns A ProseMirror plugin that renders a menu bar
 */
export function createMenuBarPlugin(options: MenuBarOptions): Plugin {
  const { schema, qtiItems = [], floating = true } = options;

  // Build the basic menu structure
  const basicItems = buildBasicMenuItems(schema);

  // Build the menu content array
  const content: MenuElement[][] = [
    // Undo/Redo
    basicItems.history,
    // Text formatting (bold, italic, etc.)
    basicItems.marks,
    // Block types (paragraph, headings, etc.)
    basicItems.blocks,
  ];

  // Add QTI items if provided
  if (qtiItems.length > 0) {
    content.push(qtiItems);
  }

  return menuBar({
    floating,
    content,
  });
}
