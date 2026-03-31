
import {
  insertSimpleChoiceOnEnter,
  qtiChoiceInteractionNodeSpec,
  defineCorrectResponseClickExtension,
} from '@qti-editor/interaction-choice';
import {
  qtiExtendedTextInteractionNodeSpec,
} from '@qti-editor/interaction-extended-text';
import {
  qtiMatchInteractionNodeSpec,
  insertSimpleAssociableChoiceOnEnter,
  defineMatchCorrectResponseExtension,
} from '@qti-editor/interaction-match';
import {
  qtiOrderInteractionNodeSpec,
  insertOrderChoiceOnEnter,
  defineOrderCorrectResponseExtension,
} from '@qti-editor/interaction-order';

import {
  qtiSelectPointInteractionNodeSpec,
  imgSelectPointNodeSpec,
} from '@qti-editor/interaction-select-point';
import {
  qtiTextEntryInteractionNodeSpec,
} from '@qti-editor/interaction-text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleMatchSetNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-shared';
import { defineKeymap, defineNodeSpec, union } from 'prosekit/core';

/**
 * Define QTI interaction nodes only (no basic extension).
 * Use this when you want to compose with your own editor setup.
 */
export function defineQtiInteractionsExtension() {
  return union(
    // Choice interaction
    defineNodeSpec({ name: 'qtiChoiceInteraction', ...qtiChoiceInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiPromptParagraph', ...qtiPromptParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiPrompt', ...qtiPromptNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoiceParagraph', ...qtiSimpleChoiceParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoice', ...qtiSimpleChoiceNodeSpec }),
    // Text interactions
    defineNodeSpec({ name: 'qtiTextEntryInteraction', ...qtiTextEntryInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiExtendedTextInteraction', ...qtiExtendedTextInteractionNodeSpec }),
    // Match interaction
    defineNodeSpec({ name: 'qtiMatchInteraction', ...qtiMatchInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleMatchSet', ...qtiSimpleMatchSetNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleAssociableChoice', ...qtiSimpleAssociableChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleAssociableChoiceParagraph', ...qtiSimpleAssociableChoiceParagraphNodeSpec }),
    // Order interaction
    defineNodeSpec({ name: 'qtiOrderInteraction', ...qtiOrderInteractionNodeSpec }),
    // Select point interaction
    defineNodeSpec({ name: 'qtiSelectPointInteraction', ...qtiSelectPointInteractionNodeSpec }),
    defineNodeSpec({ name: 'imgSelectPoint', ...imgSelectPointNodeSpec }),
    defineKeymap({
      Enter: (state, dispatch, view) =>
        insertSimpleChoiceOnEnter(state, dispatch, view) ||
        insertSimpleAssociableChoiceOnEnter(state, dispatch, view) ||
        insertOrderChoiceOnEnter(state, dispatch, view),
      // 'Mod-Shift-q': insertChoiceInteraction,
      // 'Mod-Shift-t': insertTextEntryInteraction,
      // 'Mod-Shift-e': insertExtendedTextInteraction,
    }),
    // Enable clicking on choice radio/checkbox to set correct responses
    defineCorrectResponseClickExtension(),
    // Enable drag-and-drop for match interaction correct responses
    defineMatchCorrectResponseExtension(),
    // Enable click-to-order for order interaction correct responses
    defineOrderCorrectResponseExtension(),
  );
}


