/**
 * QTI Menu Items
 *
 * Menu items for inserting QTI interactions into the editor.
 */

import { MenuItem, Dropdown } from 'prosemirror-menu';
import type { Schema, NodeType } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';

export type QtiMenuItem = MenuItem | Dropdown;

/**
 * Create a menu item that inserts a node at the current selection
 */
export function createInsertNodeMenuItem(
  nodeType: NodeType,
  options: {
    title: string;
    label: string;
    attrs?: Record<string, unknown>;
    content?: (schema: Schema) => unknown;
  }
): MenuItem {
  return new MenuItem({
    title: options.title,
    label: options.label,
    enable(state: EditorState) {
      return canInsert(state, nodeType);
    },
    run(state: EditorState, dispatch: (tr: Transaction) => void) {
      const { schema } = state;
      let node;

      if (options.content) {
        // Create node with custom content
        node = nodeType.create(options.attrs || {}, options.content(schema));
      } else {
        // Create node with default content
        node = nodeType.createAndFill(options.attrs || {});
      }

      if (node) {
        dispatch(state.tr.replaceSelectionWith(node));
      }
    },
  });
}

/**
 * Check if a node type can be inserted at the current selection
 */
function canInsert(state: EditorState, nodeType: NodeType): boolean {
  const { $from } = state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const index = $from.index(d);
    if ($from.node(d).canReplaceWith(index, index, nodeType)) {
      return true;
    }
  }
  return false;
}

/**
 * Create menu items for all QTI interactions in a schema
 *
 * @param schema - The ProseMirror schema (should include QTI nodes)
 * @returns An array of menu items, or a dropdown containing them
 */
export function createQtiMenuItems(schema: Schema): QtiMenuItem[] {
  const items: MenuItem[] = [];

  // Choice Interaction
  if (schema.nodes.qti_choice_interaction) {
    items.push(
      createInsertNodeMenuItem(schema.nodes.qti_choice_interaction, {
        title: 'Insert a multiple choice question',
        label: 'Choice',
        attrs: { responseIdentifier: `RESPONSE_${Date.now()}` },
        content: (s) => [
          s.nodes.qti_prompt.create({}, s.nodes.paragraph.create({}, s.text('Enter your question here...'))),
          s.nodes.qti_simple_choice.create(
            { identifier: 'A' },
            s.nodes.paragraph.create({}, s.text('Option A'))
          ),
          s.nodes.qti_simple_choice.create(
            { identifier: 'B' },
            s.nodes.paragraph.create({}, s.text('Option B'))
          ),
        ],
      })
    );
  }

  // Text Entry Interaction (inline)
  if (schema.nodes.qti_text_entry_interaction) {
    items.push(
      createInsertNodeMenuItem(schema.nodes.qti_text_entry_interaction, {
        title: 'Insert an inline text entry field',
        label: 'Text Entry',
        attrs: { responseIdentifier: `RESPONSE_${Date.now()}` },
      })
    );
  }

  // Return as a dropdown if we have items
  if (items.length > 0) {
    return [new Dropdown(items, { label: 'QTI', title: 'Insert QTI Interaction' })];
  }

  return [];
}
