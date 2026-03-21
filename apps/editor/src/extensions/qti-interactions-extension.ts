
import {
  insertSimpleChoiceOnEnter,
  qtiChoiceInteractionNodeSpec,
} from '@qti-editor/interaction-choice';
import {
  qtiExtendedTextInteractionNodeSpec,
} from '@qti-editor/interaction-extended-text';
import {
  qtiTextEntryInteractionNodeSpec,
} from '@qti-editor/interaction-text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-shared';
import { defineKeymap, defineNodeSpec, union } from 'prosekit/core';

/**
 * Define QTI interaction nodes only (no basic extension).
 * Use this when you want to compose with your own editor setup.
 */
export function defineQtiInteractionsExtension() {
  return union(
    defineNodeSpec({ name: 'qtiChoiceInteraction', ...qtiChoiceInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiPromptParagraph', ...qtiPromptParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiPrompt', ...qtiPromptNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoiceParagraph', ...qtiSimpleChoiceParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoice', ...qtiSimpleChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiTextEntryInteraction', ...qtiTextEntryInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiExtendedTextInteraction', ...qtiExtendedTextInteractionNodeSpec }),
    defineKeymap({
      Enter: (state, dispatch, view) =>
        insertSimpleChoiceOnEnter(state, dispatch, view),
      // 'Mod-Shift-q': insertChoiceInteraction,
      // 'Mod-Shift-t': insertTextEntryInteraction,
      // 'Mod-Shift-e': insertExtendedTextInteraction,
    }),
  );
}


