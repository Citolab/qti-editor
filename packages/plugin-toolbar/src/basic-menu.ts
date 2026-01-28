/**
 * Basic Menu Items
 *
 * Standard editing commands for the ProseMirror menu bar.
 */

import { toggleMark } from 'prosemirror-commands';
import {
  MenuItem,
  Dropdown,
  type MenuElement,
  icons,
  joinUpItem,
  liftItem,
  undoItem,
  redoItem,
  wrapItem,
  blockTypeItem,
} from 'prosemirror-menu';
import type { Schema, MarkType, NodeType } from 'prosemirror-model';
import type { EditorState, Command } from 'prosemirror-state';

/**
 * Create a menu item for toggling a mark
 */
function markItem(markType: MarkType, options: { title: string; icon?: typeof icons.strong }) {
  const passedOptions = {
    active(state: EditorState) {
      const { from, $from, to, empty } = state.selection;
      if (empty) {
        return !!markType.isInSet(state.storedMarks || $from.marks());
      }
      return state.doc.rangeHasMark(from, to, markType);
    },
    ...options,
  };
  return cmdItem(toggleMark(markType), passedOptions);
}

/**
 * Create a menu item from a command
 */
function cmdItem(cmd: Command, options: { title: string; icon?: typeof icons.strong; active?: (state: EditorState) => boolean }) {
  const passedOptions = {
    label: options.title,
    run: cmd,
    enable(state: EditorState) {
      return cmd(state);
    },
    ...options,
  };
  // Remove title from passedOptions if icon is present (prosemirror-menu behavior)
  if ('icon' in passedOptions && passedOptions.icon) {
    delete (passedOptions as Record<string, unknown>).label;
  }
  return new MenuItem(passedOptions);
}

export interface BasicMenuItems {
  history: MenuElement[];
  marks: MenuElement[];
  blocks: MenuElement[];
  lists: MenuElement[];
}

/**
 * Build the basic menu items for a schema
 *
 * @param schema - The ProseMirror schema
 * @returns An object containing menu item groups
 */
export function buildBasicMenuItems(schema: Schema): BasicMenuItems {
  const result: BasicMenuItems = {
    history: [],
    marks: [],
    blocks: [],
    lists: [],
  };

  // History (undo/redo)
  result.history.push(undoItem);
  result.history.push(redoItem);

  // Marks (text formatting)
  if (schema.marks.strong) {
    result.marks.push(markItem(schema.marks.strong, { title: 'Bold', icon: icons.strong }));
  }
  if (schema.marks.em) {
    result.marks.push(markItem(schema.marks.em, { title: 'Italic', icon: icons.em }));
  }
  if (schema.marks.code) {
    result.marks.push(markItem(schema.marks.code, { title: 'Code', icon: icons.code }));
  }
  if (schema.marks.link) {
    result.marks.push(markItem(schema.marks.link, { title: 'Link', icon: icons.link }));
  }

  // Block types dropdown
  const blockItems: MenuItem[] = [];

  if (schema.nodes.paragraph) {
    blockItems.push(
      blockTypeItem(schema.nodes.paragraph, {
        title: 'Paragraph',
        label: 'Paragraph',
      }),
    );
  }

  if (schema.nodes.heading) {
    for (let level = 1; level <= 3; level++) {
      blockItems.push(
        blockTypeItem(schema.nodes.heading, {
          title: `Heading ${level}`,
          label: `H${level}`,
          attrs: { level },
        }),
      );
    }
  }

  if (schema.nodes.code_block) {
    blockItems.push(
      blockTypeItem(schema.nodes.code_block, {
        title: 'Code Block',
        label: 'Code',
      }),
    );
  }

  if (blockItems.length > 0) {
    result.blocks.push(
      new Dropdown(blockItems, { label: 'Type', title: 'Change block type' }),
    );
  }

  // Lists and structure
  if (schema.nodes.bullet_list) {
    result.lists.push(
      wrapItem(schema.nodes.bullet_list, {
        title: 'Bullet List',
        icon: icons.bulletList,
      }),
    );
  }

  if (schema.nodes.ordered_list) {
    result.lists.push(
      wrapItem(schema.nodes.ordered_list, {
        title: 'Ordered List',
        icon: icons.orderedList,
      }),
    );
  }

  if (schema.nodes.blockquote) {
    result.lists.push(
      wrapItem(schema.nodes.blockquote, {
        title: 'Blockquote',
        icon: icons.blockquote,
      }),
    );
  }

  result.lists.push(liftItem);
  result.lists.push(joinUpItem);

  return result;
}
