
import {
  insertSimpleChoiceOnEnter,
  qtiChoiceInteractionNodeSpec,
  defineCorrectResponseClickExtension,
} from '@qti-editor/interaction-choice';
import {
  qtiGapMatchInteractionNodeSpec,
  createGapMatchCorrectResponsePlugin,
} from '@qti-editor/interaction-gap-match';
import {
  qtiExtendedTextInteractionNodeSpec,
} from '@qti-editor/interaction-extended-text';
import {
  defineHottextWrapSelectionExtension,
  qtiHottextInteractionNodeSpec,
  qtiHottextNodeSpec,
} from '@qti-editor/interaction-hottext';
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
  qtiGapNodeSpec,
  qtiGapTextNodeSpec,
} from '@qti-editor/interaction-shared';
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
import { defineKeymap, defineNodeSpec, definePlugin, union } from 'prosekit/core';

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
    defineNodeSpec({ name: 'qtiHottextInteraction', ...qtiHottextInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiHottext', ...qtiHottextNodeSpec }),
    // Match interaction
    defineNodeSpec({ name: 'qtiMatchInteraction', ...qtiMatchInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleMatchSet', ...qtiSimpleMatchSetNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleAssociableChoice', ...qtiSimpleAssociableChoiceNodeSpec }),
    defineNodeSpec({ name: 'qtiSimpleAssociableChoiceParagraph', ...qtiSimpleAssociableChoiceParagraphNodeSpec }),
    // Gap match interaction
    defineNodeSpec({ name: 'qtiGapMatchInteraction', ...qtiGapMatchInteractionNodeSpec }),
    defineNodeSpec({ name: 'qtiGapText', ...qtiGapTextNodeSpec }),
    defineNodeSpec({ name: 'qtiGap', ...qtiGapNodeSpec }),
    definePlugin(createGapMatchCorrectResponsePlugin),
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
    }),
    // Enable clicking on choice radio/checkbox to set correct responses
    defineCorrectResponseClickExtension(),
    // Enable drag-and-drop for match interaction correct responses
    defineMatchCorrectResponseExtension(),
    // Enable click-to-order for order interaction correct responses
    defineOrderCorrectResponseExtension(),
    defineHottextWrapSelectionExtension(),
  );
}
