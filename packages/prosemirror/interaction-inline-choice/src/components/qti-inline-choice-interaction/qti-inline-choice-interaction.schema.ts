import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiInlineChoiceInteractionNodeSpec: NodeSpec = {
  attrs: {
    responseIdentifier: { default: null },
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    score: { default: 1 },
  },
  content: 'qtiInlineChoice+',
  inline: true,
  group: 'inline',
  parseDOM: [
    {
      tag: 'qti-inline-choice-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const scoreAttr = node.getAttribute('score');
        return {
          responseIdentifier: node.getAttribute('response-identifier'),
          shuffle: node.getAttribute('shuffle') === 'true',
          class: node.getAttribute('class') || null,
          correctResponse: node.getAttribute('correct-response'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};

    if (node.attrs.responseIdentifier) {
      attrs['response-identifier'] = node.attrs.responseIdentifier;
    }
    if (node.attrs.correctResponse) {
      attrs['correct-response'] = node.attrs.correctResponse;
    }
    attrs.shuffle = String(Boolean(node.attrs.shuffle));

    if (node.attrs.class) {
      attrs.class = node.attrs.class;
    }
    attrs.score = String(node.attrs.score ?? 1);

    return ['qti-inline-choice-interaction', attrs, 0];
  },
  selectable: true,
  isolating: true
};
