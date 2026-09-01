import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/*
 * No `group: 'block'`: a gap-match chip is only ever legal inside a `qti-gap-match-interaction`,
 * and `qtiGapMatchInteraction` names it directly (`qtiPrompt? qtiGapText+ paragraph+`). Loose at
 * item-body level it is not valid QTI, and while it was in the group it was also what ProseMirror
 * auto-inserted there. See "The block group" in schema/create-qti-schema.ts.
 */
export const qtiGapTextNodeSpec: NodeSpec = {
  content: 'text*',
  placeholder: 'Enter gap text…',
  attrs: {
    identifier: { default: null },
    matchMax: { default: 1 },
  },
  parseDOM: [
    {
      tag: 'qti-gap-text',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const matchMax = node.getAttribute('match-max');
        return {
          identifier: node.getAttribute('identifier'),
          matchMax: matchMax ? parseInt(matchMax, 10) : 1,
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;
    if (node.attrs.matchMax > 1) attrs['match-max'] = String(node.attrs.matchMax);
    return ['qti-gap-text', attrs, 0];
  },
};
