import { parseCorrectResponseAttribute, serializeCorrectResponseAttribute } from '../../../shared';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiGapMatchInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiGapText{2,} paragraph+',
  attrs: {
    maxAssociations: { default: 0 },
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-gap-match-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const maxAssociations = node.getAttribute('max-associations');
        const scoreAttr = node.getAttribute('score');
        return {
          maxAssociations: maxAssociations ? parseInt(maxAssociations, 10) : 0,
          shuffle: node.getAttribute('shuffle') === 'true',
          class: node.getAttribute('class'),
          correctResponse: parseCorrectResponseAttribute(node.getAttribute('correct-response')),
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      'max-associations': String(node.attrs.maxAssociations ?? 0),
    };
    if (node.attrs.shuffle) {
      attrs.shuffle = 'true';
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    // correctResponse is the canonical comma-joined `"src tgt"` form (same as
    // associate / match / order). Composer + runtime accept the codec's
    // `string | string[]` shape; the response declaration carries one
    // <qti-value> per entry.
    const cr = serializeCorrectResponseAttribute(node.attrs.correctResponse);
    if (cr) attrs['correct-response'] = cr;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-gap-match-interaction', attrs, 0];
  },
  defining: true,
  isolating: true,
};
