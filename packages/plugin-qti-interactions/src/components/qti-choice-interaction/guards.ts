/**
 * QTI Choice Interaction Guards
 *
 * Transaction filters that prevent invalid document structures
 * within choice interactions.
 */

import { Plugin } from 'prosemirror-state';

/**
 * Create a guard plugin that prevents text entry interactions inside simple choices
 *
 * This is invalid in QTI because text entry is an inline interaction that
 * shouldn't be nested inside choice options.
 */
export function createChoiceInteractionGuards(): Plugin {
  return new Plugin({
    filterTransaction(tr, state) {
      // Only check if document changed
      if (!tr.docChanged) return true;

      const simpleChoiceType = state.schema.nodes.qti_simple_choice;
      const textEntryType = state.schema.nodes.qti_text_entry_interaction;

      // If schema doesn't have these types, allow all transactions
      if (!simpleChoiceType || !textEntryType) return true;

      let invalid = false;

      // Check if any text entry interaction is inside a simple choice
      tr.doc.descendants((node, pos) => {
        if (node.type !== textEntryType) return true;

        const $pos = tr.doc.resolve(pos);
        for (let depth = $pos.depth; depth > 0; depth--) {
          if ($pos.node(depth).type === simpleChoiceType) {
            invalid = true;
            return false; // Stop traversal
          }
        }
        return true;
      });

      // Return false to reject the transaction if invalid
      return !invalid;
    },
  });
}
