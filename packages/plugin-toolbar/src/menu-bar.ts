/**
 * Menu Bar Plugin
 *
 * Creates a ProseMirror menu bar with basic editing commands and optional QTI items.
 */

import { menuBar, renderGrouped, type MenuElement } from 'prosemirror-menu';
import type { Schema } from 'prosemirror-model';
import { Plugin } from 'prosemirror-state';
import type { Plugin as PluginType } from 'prosemirror-state';
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

export interface DetachedMenuBarOptions extends MenuBarOptions {
  /**
   * Target element (or getter) to mount the menu into.
   */
  mount: HTMLElement | (() => HTMLElement | null);
  /**
   * Optional class name for the menu container.
   */
  className?: string;
}

/**
 * Create a menu bar plugin for ProseMirror
 *
 * @param options - Configuration options
 * @returns A ProseMirror plugin that renders a menu bar
 */
export function createMenuBarPlugin(options: MenuBarOptions): PluginType {
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

export function createDetachedMenuBarPlugin(options: DetachedMenuBarOptions): PluginType {
  const { schema, qtiItems = [], mount, className } = options;

  const basicItems = buildBasicMenuItems(schema);
  const content: MenuElement[][] = [
    basicItems.history,
    basicItems.marks,
    basicItems.blocks,
  ];

  if (qtiItems.length > 0) {
    content.push(qtiItems);
  }

  return new Plugin({
    view(editorView) {
      const menu = editorView.dom.ownerDocument.createElement('div');
      menu.className = className || 'ProseMirror-menubar';
      const { dom, update } = renderGrouped(editorView, content);
      menu.appendChild(dom);

      let mounted = false;
      const resolveMount = () => (typeof mount === 'function' ? mount() : mount);
      const ensureMounted = () => {
        if (mounted) return;
        const target = resolveMount();
        if (!target) return;
        target.appendChild(menu);
        mounted = true;
      };

      const scheduleMount = () => {
        if (mounted) return;
        ensureMounted();
        if (mounted) return;
        const win = editorView.dom.ownerDocument.defaultView;
        if (win) {
          win.requestAnimationFrame(scheduleMount);
        }
      };

      scheduleMount();
      update(editorView.state);

      return {
        update(view) {
          update(view.state);
          ensureMounted();
        },
        destroy() {
          if (menu.parentNode) {
            menu.parentNode.removeChild(menu);
          }
        },
      };
    },
  });
}
