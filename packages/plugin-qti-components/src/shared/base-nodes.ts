/**
 * Shared Base QTI Node Definitions
 *
 * These are the foundational QTI nodes used across multiple QTI interactions:
 * - qti_prompt: Question or instruction text
 * - qti_simple_choice: Individual answer option
 *
 * Based on QTI 3.0 spec: https://www.imsglobal.org/spec/qti/v3p0/impl
 */

// Import shared styles
import './styles.css';

import { defineCommands, defineKeymap, defineNodeSpec, union } from 'prosekit/core';
import type { Extension } from 'prosekit/core';
import type { Command } from 'prosekit/pm/state';
import { TextSelection } from 'prosekit/pm/state';

// Import QTI schema definitions
import type { QtiPromptSchema, QtiSimpleChoiceSchema } from './qti-schema';

// Export schema types
export type { QtiPromptSchema, QtiSimpleChoiceSchema };

/**
 * QTI Prompt Node Specification
 * Used to display questions or instructions in QTI interactions
 */
export const qtiPromptSpec = defineNodeSpec({
  name: 'qti_prompt',
  content: 'block+',
  group: 'qti',
  defining: true,
  attrs: {
    // Optional QTI 3.0 base attributes
    identifier: { default: null },
    class: { default: null },
    lang: { default: null },
    dir: { default: null },
  },
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      class: node.attrs.class || 'qti-prompt',
    };

    // Optional attributes
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;
    if (node.attrs.lang) attrs.lang = node.attrs.lang;
    if (node.attrs.dir) attrs.dir = node.attrs.dir;

    return ['qti-prompt', attrs, 0];
  },
  parseDOM: [
    {
      tag: 'qti-prompt',
      getAttrs: (dom) => {
        const el = dom as HTMLElement;
        return {
          identifier: el.getAttribute('identifier'),
          class: el.getAttribute('class'),
          lang: el.getAttribute('lang'),
          dir: el.getAttribute('dir') as 'ltr' | 'rtl' | null,
        };
      },
    },
  ],
});

/**
 * QTI Simple Choice Node Specification
 * Represents a single answer option in QTI interactions
 */
export const qtiSimpleChoiceSpec = defineNodeSpec({
  name: 'qti_simple_choice',
  content: 'block+',
  group: 'qti',
  defining: true,
  attrs: {
    // Required attributes
    identifier: { default: null },
    // Optional QTI 3.0 attributes
    fixed: { default: false },
    templateIdentifier: { default: null },
    showHide: { default: null },
    // Base attributes
    class: { default: null },
    lang: { default: null },
    dir: { default: null },
  },
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      class: node.attrs.class || 'qti-simple-choice',
    };

    // Required attributes
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;

    // Optional attributes
    if (node.attrs.fixed) attrs.fixed = 'true';
    if (node.attrs.templateIdentifier) attrs['template-identifier'] = node.attrs.templateIdentifier;
    if (node.attrs.showHide) attrs['show-hide'] = node.attrs.showHide;
    if (node.attrs.lang) attrs.lang = node.attrs.lang;
    if (node.attrs.dir) attrs.dir = node.attrs.dir;

    return ['qti-simple-choice', attrs, 0];
  },
  parseDOM: [
    {
      tag: 'qti-simple-choice',
      getAttrs: (dom) => {
        const el = dom as HTMLElement;
        return {
          identifier: el.getAttribute('identifier'),
          fixed: el.getAttribute('fixed') === 'true',
          templateIdentifier: el.getAttribute('template-identifier'),
          showHide: el.getAttribute('show-hide') as 'show' | 'hide' | null,
          class: el.getAttribute('class'),
          lang: el.getAttribute('lang'),
          dir: el.getAttribute('dir') as 'ltr' | 'rtl' | null,
        };
      },
    },
  ],
});

/**
 * Command to insert a QTI prompt
 */
export const insertQtiPrompt: Command = (state, dispatch) => {
  const promptNode = state.schema.nodes.qti_prompt?.create(
    null,
    state.schema.nodes.paragraph.create(
      null,
      state.schema.text('Enter your question here'),
    ),
  );
  if (!promptNode) return false;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(promptNode).scrollIntoView());
  return true;
};

/**
 * Command to insert a QTI simple choice
 */
export const insertQtiSimpleChoice: Command = (state, dispatch) => {
  const choiceNode = state.schema.nodes.qti_simple_choice?.create(
    { identifier: `choice_${Date.now()}` },
    state.schema.nodes.paragraph.create(null, state.schema.text('Choice option')),
  );
  if (!choiceNode) return false;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(choiceNode).scrollIntoView());
  return true;
};

/**
 * Command to split a simple choice at cursor position, creating a new sibling choice
 */
export const splitSimpleChoice: Command = (state, dispatch) => {
  const { $from } = state.selection;

  // Check if we're inside a qti_simple_choice
  let choiceDepth = -1;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type.name === 'qti_simple_choice') {
      choiceDepth = d;
      break;
    }
  }

  if (choiceDepth === -1) {
    console.log('splitSimpleChoice: Not inside a qti_simple_choice');
    return false;
  }

  const choiceNode = $from.node(choiceDepth);
  const choiceEnd = $from.after(choiceDepth);

  // Check if cursor is at the end of the last block in the choice
  // Calculate position relative to the choice node
  const posInChoice = $from.pos - $from.start(choiceDepth);
  const choiceSize = choiceNode.content.size;
  const isAtEnd = posInChoice >= choiceSize - 1;

  console.log('splitSimpleChoice:', {
    posInChoice,
    choiceSize,
    isAtEnd,
    parentOffset: $from.parentOffset,
    parentSize: $from.parent.content.size,
  });

  if (!isAtEnd) {
    // Not at end - allow default behavior
    console.log('splitSimpleChoice: Not at end, allowing default behavior');
    return false;
  }

  console.log('splitSimpleChoice: At end, creating new choice');

  // At end - create a new simple choice after this one
  const newChoice = state.schema.nodes.qti_simple_choice.create(
    { identifier: `choice_${Date.now()}` },
    state.schema.nodes.paragraph.create(),
  );

  if (dispatch) {
    const tr = state.tr.insert(choiceEnd, newChoice);
    // Set selection to the start of the new choice's paragraph
    const newPos = choiceEnd + 2; // +1 for choice node, +1 to get inside paragraph
    const $pos = tr.doc.resolve(newPos);
    tr.setSelection(TextSelection.near($pos));
    dispatch(tr.scrollIntoView());
  }

  return true;
};

/**
 * Commands for base QTI nodes
 */
export const qtiBaseCommands = defineCommands({
  insertQtiPrompt: () => insertQtiPrompt,
  insertQtiSimpleChoice: () => insertQtiSimpleChoice,
  splitSimpleChoice: () => splitSimpleChoice,
});

/**
 * Keymaps for base QTI nodes
 */
export const qtiBaseKeymap = defineKeymap({
  'Mod-Shift-p': insertQtiPrompt,
  'Mod-Shift-c': insertQtiSimpleChoice,
  Enter: splitSimpleChoice,
});

/**
 * Complete extension for base QTI nodes
 * Includes node specs, commands, and keymaps
 */
export function qtiBaseNodesExtension(): Extension {
  return union([
    qtiPromptSpec,
    qtiSimpleChoiceSpec,
    qtiBaseCommands,
    qtiBaseKeymap,
  ]);
}
