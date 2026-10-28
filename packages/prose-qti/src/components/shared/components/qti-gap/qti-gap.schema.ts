import { qtiAttributes } from '../../qti-attributes.js';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

const keptAttributes = qtiAttributes({
  matchGroup: 'match-group',
  required: 'required',
});

export const qtiGapNodeSpec: NodeSpec = {
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  attrs: {
    identifier: { default: null },
    matchMax: { default: 1 },
    ...keptAttributes.attrs,
  },
  parseDOM: [
    {
      tag: 'qti-gap',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const matchMax = node.getAttribute('match-max');
        return {
          identifier: node.getAttribute('identifier'),
          matchMax: matchMax ? parseInt(matchMax, 10) : 1,
          ...keptAttributes.parse(node),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;
    Object.assign(attrs, keptAttributes.domAttrs(node.attrs));
    if (node.attrs.matchMax > 1) attrs['match-max'] = String(node.attrs.matchMax);
    return ['qti-gap', attrs];
  },
};
