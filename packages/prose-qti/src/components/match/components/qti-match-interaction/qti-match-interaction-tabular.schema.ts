import { parseResponseAttribute, serializeResponseAttribute } from '../../../shared';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

const TABULAR_CLASS = 'qti-match-tabular';

function splitClasses(value: string | null): string[] {
  return (value ?? '').split(/\s+/).filter(Boolean);
}

export function hasTabularMatchClass(element: HTMLElement): boolean {
  return splitClasses(element.getAttribute('class')).includes(TABULAR_CLASS);
}

/**
 * Schema node for the tabular variant of qti-match-interaction.
 *
 * Both the tabular and non-tabular variants share the same DOM tag
 * (`<qti-match-interaction>`); the class `qti-match-tabular` is the only
 * discriminator. The non-tabular schema's parseDOM excludes anything carrying
 * that class, and this schema's parseDOM requires it. The class value is
 * stored verbatim on the node (including `qti-match-tabular`) so the
 * attribute panel can show + edit the full class list.
 */
export const qtiMatchInteractionTabularNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt qtiSimpleMatchSet{2}',
  attrs: {
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
    dataFirstColumnHeader: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-match-interaction[class~="qti-match-tabular"]',
      priority: 80,
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return false;
        const scoreAttr = node.getAttribute('score');
        return {
          shuffle: node.getAttribute('shuffle') === 'true',
          class: node.getAttribute('class'),
          correctResponse: parseResponseAttribute(node.getAttribute('correct-response')),
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
          dataFirstColumnHeader: node.getAttribute('data-first-column-header'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.shuffle) {
      attrs.shuffle = 'true';
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    const cr = serializeResponseAttribute(node.attrs.correctResponse);
    if (cr) attrs['correct-response'] = cr;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    if (node.attrs.dataFirstColumnHeader) attrs['data-first-column-header'] = node.attrs.dataFirstColumnHeader;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-match-interaction', attrs, 0];
  },
  defining: true,
  isolating: true,
};
