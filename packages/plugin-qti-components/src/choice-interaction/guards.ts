import { definePlugin } from 'prosekit/core';
import { Plugin } from 'prosekit/pm/state';

export function choiceInteractionGuardsExtension() {
  return definePlugin(
    () =>
      new Plugin({
        filterTransaction(tr, state) {
          if (!tr.docChanged) return true;
          const simpleChoiceType = state.schema.nodes.qti_simple_choice;
          const textEntryType = state.schema.nodes.qti_text_entry_interaction;
          if (!simpleChoiceType || !textEntryType) return true;

          let invalid = false;
          tr.doc.descendants((node, pos) => {
            if (node.type !== textEntryType) return true;
            const $pos = tr.doc.resolve(pos);
            for (let depth = $pos.depth; depth > 0; depth--) {
              if ($pos.node(depth).type === simpleChoiceType) {
                invalid = true;
                return false;
              }
            }
            return true;
          });

          return !invalid;
        },
      }),
  );
}
