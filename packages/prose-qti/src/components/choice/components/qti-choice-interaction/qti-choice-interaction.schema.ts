import { parseResponseAttribute, serializeResponseAttribute, writeBooleanFlag } from '@citolab/prose-qti/components/shared';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiChoiceInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleChoice+',
  attrs: {
    maxChoices: { default: 0 },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
    // Standard QTI `shuffle` flag: when true the choices are presented in a
    // randomized order at delivery time (choices with `fixed` keep their spot).
    shuffle: { default: false },
    // Whether the source wrote `shuffle` out, so an authored `shuffle="false"` survives; see writeBooleanFlag.
    shuffleExplicit: { default: false },
  },
  parseDOM: [
    {
      tag: 'qti-choice-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const maxChoices = node.getAttribute('max-choices');
        const className = node.getAttribute('class');
        const scoreAttr = node.getAttribute('score');
        return {
          maxChoices: maxChoices ? parseInt(maxChoices, 10) : 0,
          class: className || null,
          correctResponse: parseResponseAttribute(node.getAttribute('correct-response')),
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          shuffle: node.getAttribute('shuffle') === 'true',
          shuffleExplicit: node.hasAttribute('shuffle'),
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { 'max-choices': String(node.attrs.maxChoices) };
    if (node.attrs.class) attrs.class = node.attrs.class;
    const cr = serializeResponseAttribute(node.attrs.correctResponse);
    if (cr) attrs['correct-response'] = cr;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    attrs.score = String(node.attrs.score ?? 1);
    // Only emit `shuffle` when set (or authored), so unshuffled-by-default interactions stay clean.
    writeBooleanFlag(attrs, 'shuffle', node.attrs.shuffle, node.attrs.shuffleExplicit);
    return ['qti-choice-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};
