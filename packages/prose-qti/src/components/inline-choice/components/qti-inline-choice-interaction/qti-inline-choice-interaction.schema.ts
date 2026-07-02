import { parseResponseAttribute, serializeResponseAttribute } from '../../../shared';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiInlineChoiceInteractionNodeSpec: NodeSpec = {
  attrs: {
    responseIdentifier: { default: null },
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    score: { default: 1 },
    dataPrompt: { default: null },
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
          correctResponse: parseResponseAttribute(node.getAttribute('correct-response')),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          dataPrompt: node.getAttribute('data-prompt') || null,
        };
      },
      // The interaction and its choices are inline, so ProseMirror treats the
      // indentation between `<qti-inline-choice>` elements as significant inline
      // content. Since the content model (`qtiInlineChoice+`) allows no text, the
      // parser would otherwise wrap each whitespace run into an empty default
      // choice. Parse from a clone with whitespace-only child text nodes removed.
      contentElement: (node: Node) => {
        const clone = (node as HTMLElement).cloneNode(true) as HTMLElement;
        for (const child of [...clone.childNodes]) {
          if (child.nodeType === Node.TEXT_NODE && !/\S/.test(child.nodeValue ?? '')) {
            clone.removeChild(child);
          }
        }
        return clone;
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};

    if (node.attrs.responseIdentifier) {
      attrs['response-identifier'] = node.attrs.responseIdentifier;
    }
    const cr = serializeResponseAttribute(node.attrs.correctResponse);
    if (cr) {
      attrs['correct-response'] = cr;
    }
    attrs.shuffle = String(Boolean(node.attrs.shuffle));

    if (node.attrs.class) {
      attrs.class = node.attrs.class;
    }
    attrs.score = String(node.attrs.score ?? 1);

    if (node.attrs.dataPrompt) {
      attrs['data-prompt'] = node.attrs.dataPrompt;
    }

    return ['qti-inline-choice-interaction', attrs, 0];
  },
  selectable: true,
  isolating: true
};
