import { parseCorrectResponseAttribute, serializeCorrectResponseAttribute } from '@qti-editor/interaction-shared';

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
    return ['qti-choice-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};
