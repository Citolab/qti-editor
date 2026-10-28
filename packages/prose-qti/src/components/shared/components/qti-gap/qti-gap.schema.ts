import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiGapNodeSpec: NodeSpec = {
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  attrs: {
    identifier: { default: null },
    matchMax: { default: 1 },
    // Kept as authored, so a round trip does not drop them; no editing UI. `null` = not written.
    // `required` holds the attribute's text, so an explicit `required="false"` survives as well.
    class: { default: null },
    showHide: { default: null },
    matchGroup: { default: null },
    required: { default: null },
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
          class: node.getAttribute('class') || null,
          showHide: node.getAttribute('show-hide'),
          matchGroup: node.getAttribute('match-group'),
          required: node.getAttribute('required'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.class) attrs.class = node.attrs.class;
    if (node.attrs.showHide) attrs['show-hide'] = node.attrs.showHide;
    if (node.attrs.matchGroup) attrs['match-group'] = node.attrs.matchGroup;
    if (node.attrs.required) attrs.required = node.attrs.required;
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;
    if (node.attrs.matchMax > 1) attrs['match-max'] = String(node.attrs.matchMax);
    return ['qti-gap', attrs];
  },
};
