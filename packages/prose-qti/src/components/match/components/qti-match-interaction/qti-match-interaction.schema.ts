import { parseCorrectResponseAttribute, serializeCorrectResponseAttribute } from '../../../shared';

import { hasTabularMatchClass } from './qti-match-interaction-tabular.schema.js';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiMatchInteractionNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiPrompt? qtiSimpleMatchSet{2}',
  attrs: {
    shuffle: { default: false },
    class: { default: null },
    correctResponse: { default: null },
    responseIdentifier: { default: null },
    score: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-match-interaction',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        if (hasTabularMatchClass(node)) return false;
        const className = node.getAttribute('class');
        const scoreAttr = node.getAttribute('score');
        return {
          shuffle: node.getAttribute('shuffle') === 'true',
          class: className || null,
          correctResponse: parseCorrectResponseAttribute(node.getAttribute('correct-response')),
          responseIdentifier: node.getAttribute('response-identifier'),
          score: scoreAttr && Number.isFinite(Number(scoreAttr)) ? Number(scoreAttr) : 1,
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.shuffle) {
      attrs['shuffle'] = 'true';
    }
    if (node.attrs.class) attrs.class = node.attrs.class;
    // correctResponse is the canonical comma-joined `"src tgt"` form (same
    // convention as associate / order). The shared codec handles serialisation
    // and the runtime `qti-match-interaction` reads `responseVariable.correctResponse`
    // as `string | string[]` — both shapes round-trip identically.
    const cr = serializeCorrectResponseAttribute(node.attrs.correctResponse);
    if (cr) attrs['correct-response'] = cr;
    if (node.attrs.responseIdentifier) attrs['response-identifier'] = node.attrs.responseIdentifier;
    attrs.score = String(node.attrs.score ?? 1);
    return ['qti-match-interaction', attrs, 0];
  },
  defining: true,
  isolating: true
};
