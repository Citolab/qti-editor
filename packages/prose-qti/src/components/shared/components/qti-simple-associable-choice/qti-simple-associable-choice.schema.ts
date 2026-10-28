import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/*
 * No `group: 'block'`: outside a match set this is not addressable by a response declaration, and
 * `qtiSimpleMatchSet` names it directly (`qtiSimpleAssociableChoice+`).
 * See "The block group" in schema/create-qti-schema.ts.
 */
export const qtiSimpleAssociableChoiceNodeSpec: NodeSpec = {
  placeholder: 'Enter matching option…',
  content: 'qtiSimpleAssociableChoiceParagraph | qtiMedia',
  attrs: {
    identifier: { default: 'A' },
    matchMax: { default: 1 },
    matchMin: { default: 0 },
    fixed: { default: false },
    // Kept as authored, so a round trip does not drop them; no editing UI. `null` = not written.
    class: { default: null },
    showHide: { default: null },
    matchGroup: { default: null },
  },
  parseDOM: [
    {
      tag: 'qti-simple-associable-choice',
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return {};
        const matchMax = node.getAttribute('match-max');
        const matchMin = node.getAttribute('match-min');
        return {
          identifier: node.getAttribute('identifier') || 'A',
          matchMax: matchMax ? parseInt(matchMax, 10) : 1,
          matchMin: matchMin ? parseInt(matchMin, 10) : 0,
          fixed: node.getAttribute('fixed') === 'true',
          class: node.getAttribute('class') || null,
          showHide: node.getAttribute('show-hide'),
          matchGroup: node.getAttribute('match-group'),
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      identifier: node.attrs.identifier,
      'match-max': String(node.attrs.matchMax)
    };
    if (node.attrs.class) attrs.class = node.attrs.class;
    if (node.attrs.showHide) attrs['show-hide'] = node.attrs.showHide;
    if (node.attrs.matchGroup) attrs['match-group'] = node.attrs.matchGroup;
    if (node.attrs.matchMin > 0) {
      attrs['match-min'] = String(node.attrs.matchMin);
    }
    if (node.attrs.fixed) {
      attrs['fixed'] = 'true';
    }
    return ['qti-simple-associable-choice', attrs, 0];
  }
};
