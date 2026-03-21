/**
 * ProseKit adapter for the supported QTI editor-kit interaction surface.
 */

import '@qti-components/theme/item.css';
import {
  insertChoiceInteraction,
  insertSimpleChoiceOnEnter,
  qtiChoiceInteractionNodeSpec,
} from '@qti-editor/interaction-choice';
import {
  insertExtendedTextInteraction,
  qtiExtendedTextInteractionNodeSpec,
} from '@qti-editor/interaction-extended-text';
import {
  insertMatchInteraction,
  qtiMatchInteractionNodeSpec,
} from '@qti-editor/interaction-match';
import {
  imgSelectPointNodeSpec,
  insertSelectPointInteraction,
  qtiSelectPointInteractionNodeSpec,
} from '@qti-editor/interaction-select-point';
import {
  insertInlineChoiceInteraction,
  insertInlineChoiceOnEnter,
  qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceNodeSpec,
  qtiInlineChoiceParagraphNodeSpec,
} from '@qti-editor/interaction-inline-choice';
import {
  insertTextEntryInteraction,
  qtiTextEntryInteractionNodeSpec,
} from '@qti-editor/interaction-text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleMatchSetNodeSpec,
} from '@qti-editor/interaction-shared';
import { defineBasicExtension } from 'prosekit/basic';
import { defineKeymap, defineNodeSpec, union } from 'prosekit/core';

export function defineQtiInteractionsExtension() {
  return union(
    defineNodeSpec({ name: 'qtiChoiceInteraction', ...qtiChoiceInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiPromptParagraph', ...qtiPromptParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiPrompt', ...qtiPromptNodeSpec }),
    defineNodeSpec({ name: 'imgSelectPoint', ...imgSelectPointNodeSpec }),
    defineNodeSpec({ name: 'qtiSelectPointInteraction', ...qtiSelectPointInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoiceParagraph', ...qtiSimpleChoiceParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleChoice', ...qtiSimpleChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiInlineChoiceInteraction', ...qtiInlineChoiceInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiInlineChoiceParagraph', ...qtiInlineChoiceParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiInlineChoice', ...qtiInlineChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiTextEntryInteraction', ...qtiTextEntryInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiMatchInteraction', ...qtiMatchInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleMatchSet', ...qtiSimpleMatchSetNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleAssociableChoice', ...qtiSimpleAssociableChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleAssociableChoiceParagraph', ...qtiSimpleAssociableChoiceParagraphNodeSpec }),
    defineNodeSpec({ name: 'qtiExtendedTextInteraction', ...qtiExtendedTextInteractionNodeSpec }),
    defineKeymap({
      Enter: (state, dispatch, view) =>
        insertSimpleChoiceOnEnter(state, dispatch, view) || insertInlineChoiceOnEnter(state, dispatch, view),
      'Mod-Shift-q': insertChoiceInteraction,
      'Mod-Shift-l': insertInlineChoiceInteraction,
      'Mod-Shift-p': insertSelectPointInteraction,
      'Mod-Shift-t': insertTextEntryInteraction,
      'Mod-Shift-m': insertMatchInteraction,
      'Mod-Shift-e': insertExtendedTextInteraction,
    }),
  );
}

export function defineQtiExtension() {
  return union(defineBasicExtension(), defineQtiInteractionsExtension());
}

export type QtiExtension = ReturnType<typeof defineQtiExtension>;
export type QtiInteractionsExtension = ReturnType<typeof defineQtiInteractionsExtension>;
