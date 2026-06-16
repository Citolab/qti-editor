import { parseCorrectResponseAttribute, serializeCorrectResponseAttribute } from '@citolab/prose-qti/components/shared';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiChoiceInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt qtiSimpleChoice+',
  attrs: {
    maxChoices: { default: 0 },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
    // Standard QTI `shuffle` flag: when true the choices are presented in a
    // randomized order at delivery time (choices with `fixed` keep their spot).
    shuffle: { default: false },
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
          correctResponse: parseCorrectResponseAttribute(node.getAttribute('correct-response')),
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          shuffle: node.getAttribute('shuffle') === 'true',
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = { 'max-choices': String(node.attrs.maxChoices) };
    if (node.attrs.class) attrs.class = node.attrs.class;
    const cr = serializeCorrectResponseAttribute(node.attrs.correctResponse);
    if (cr) attrs['correct-response'] = cr;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    attrs.score = String(node.attrs.score ?? 1);
    // Only emit `shuffle` when set, so unshuffled-by-default interactions stay clean.
    if (node.attrs.shuffle) attrs.shuffle = 'true';
    return ['qti-choice-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};
