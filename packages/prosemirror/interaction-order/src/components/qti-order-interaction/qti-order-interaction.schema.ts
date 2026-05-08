import { parseCorrectResponseAttribute, serializeCorrectResponseAttribute } from '@qti-editor/interaction-shared';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiOrderInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleChoice+',
  attrs: {
    shuffle: { default: false },
    orientation: { default: 'vertical' },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-order-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const scoreAttr = node.getAttribute('score');
        return {
          shuffle: node.getAttribute('shuffle') === 'true',
          orientation: node.getAttribute('orientation') || 'vertical',
          class: node.getAttribute('class') || null,
          correctResponse: parseCorrectResponseAttribute(node.getAttribute('correct-response')),
          responseIdentifier: node.getAttribute('response-identifier') || null,
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    if (node.attrs.shuffle) attrs['shuffle'] = 'true';
    if (node.attrs.orientation && node.attrs.orientation !== 'vertical') attrs['orientation'] = node.attrs.orientation;
    if (node.attrs.class) attrs['class'] = node.attrs.class;
    const cr = serializeCorrectResponseAttribute(node.attrs.correctResponse);
    if (cr) attrs['correct-response'] = cr;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-order-interaction', attrs, 0];
  },
  defining: true,
  isolating: true,
};
