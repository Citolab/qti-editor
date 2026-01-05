/**
 * QTI Order Interaction Component
 *
 * Provides the order interaction node for sequencing questions.
 * Exports schema, commands, and keymaps for order interactions.
 *
 * Based on QTI 3.0 spec: https://www.imsglobal.org/spec/qti/v3p0/impl#h.m12qketwgcxe
 */

// Import styles
import './styles.css';

import { defineCommands, defineKeymap, defineNodeSpec, union } from 'prosekit/core';
import type { Extension } from 'prosekit/core';
import type { Command } from 'prosekit/pm/state';

// Import QTI schema definitions
import type { QtiOrderInteractionSchema } from '../shared/qti-schema';

export type { QtiOrderInteractionSchema };

/**
 * Order Interaction node specification
 * Implements QTI 3.0 orderInteraction element
 *
 * @see QtiOrderInteractionSchema for full attribute definitions
 */
export const qtiOrderInteractionSpec = defineNodeSpec({
  name: 'qti_order_interaction',
  content: 'qti_prompt? qti_simple_choice+',
  group: 'block',
  defining: true,
  isolating: true,
  attrs: {
    // Required attributes
    responseIdentifier: { default: 'RESPONSE' },
    // Optional attributes (QTI 3.0 spec)
    shuffle: { default: false },
    minChoices: { default: null },
    maxChoices: { default: null },
    orientation: { default: 'vertical' },
    required: { default: false },
    // Base attributes
    class: { default: null },
    lang: { default: null },
    dir: { default: null },
  },
  toDOM: (node) => {
    const attrs: Record<string, string> = {
      class: node.attrs.class || 'qti-order-interaction',
      'response-identifier': node.attrs.responseIdentifier,
    };

    // Optional attributes
    if (node.attrs.shuffle) attrs.shuffle = 'true';
    if (node.attrs.minChoices !== null) attrs['min-choices'] = String(node.attrs.minChoices);
    if (node.attrs.maxChoices !== null) attrs['max-choices'] = String(node.attrs.maxChoices);
    if (node.attrs.orientation !== 'vertical') attrs.orientation = node.attrs.orientation;
    if (node.attrs.required) attrs.required = 'true';
    if (node.attrs.lang) attrs.lang = node.attrs.lang;
    if (node.attrs.dir) attrs.dir = node.attrs.dir;

    return ['qti-order-interaction', attrs, 0];
  },
  parseDOM: [
    {
      tag: 'qti-order-interaction',
      getAttrs: (dom) => {
        const el = dom as HTMLElement;
        return {
          responseIdentifier: el.getAttribute('response-identifier') || 'RESPONSE',
          shuffle: el.getAttribute('shuffle') === 'true',
          minChoices: el.getAttribute('min-choices')
            ? parseInt(el.getAttribute('min-choices')!, 10)
            : null,
          maxChoices: el.getAttribute('max-choices')
            ? parseInt(el.getAttribute('max-choices')!, 10)
            : null,
          orientation: el.getAttribute('orientation') || 'vertical',
          required: el.getAttribute('required') === 'true',
          class: el.getAttribute('class'),
          lang: el.getAttribute('lang'),
          dir: el.getAttribute('dir') as 'ltr' | 'rtl' | null,
        };
      },
    },
  ],
});

// Command to insert an order interaction
export const insertOrderInteraction: Command = (state, dispatch) => {
  const { schema } = state;
  const promptType = schema.nodes.qti_prompt;
  const choiceType = schema.nodes.qti_simple_choice;
  const interactionType = schema.nodes.qti_order_interaction;
  if (!promptType || !choiceType || !interactionType) return false;

  const prompt = promptType.create(
    null,
    schema.nodes.paragraph.create(
      null,
      schema.text('Put these items in the correct order:'),
    ),
  );

  const choices = [
    choiceType.create(
      { identifier: 'order_1' },
      schema.nodes.paragraph.create(null, schema.text('First item')),
    ),
    choiceType.create(
      { identifier: 'order_2' },
      schema.nodes.paragraph.create(null, schema.text('Second item')),
    ),
    choiceType.create(
      { identifier: 'order_3' },
      schema.nodes.paragraph.create(null, schema.text('Third item')),
    ),
  ];

  const interaction = interactionType.create(
    { responseIdentifier: `ORDER_${Date.now()}` },
    [prompt, ...choices],
  );

  if (dispatch) dispatch(state.tr.replaceSelectionWith(interaction).scrollIntoView());
  return true;
};

// Commands for order interaction
export const orderInteractionCommands = defineCommands({
  insertOrderInteraction: () => insertOrderInteraction,
});

// Keymaps for order interaction
export const orderInteractionKeymap = defineKeymap({
  'Mod-Shift-o': insertOrderInteraction,
});

// Complete extension for order interaction
export function orderInteractionExtension(): Extension {
  return union([
    qtiOrderInteractionSpec,
    orderInteractionCommands,
    orderInteractionKeymap,
  ]);
}
