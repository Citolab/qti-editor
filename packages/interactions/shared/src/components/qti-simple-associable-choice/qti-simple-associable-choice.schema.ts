import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleAssociableChoiceNodeSpec: NodeSpec = {
  group: 'block',
  placeholder: 'Enter matching option…',
  content: 'qtiSimpleAssociableChoiceParagraph | qtiMedia',
  attrs: {
    identifier: { default: 'A' },
    matchMax: { default: 1 },
    matchMin: { default: 0 },
    fixed: { default: false }
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
          fixed: node.getAttribute('fixed') === 'true'
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      identifier: node.attrs.identifier,
      'match-max': String(node.attrs.matchMax)
    };
    if (node.attrs.matchMin > 0) {
      attrs['match-min'] = String(node.attrs.matchMin);
    }
    if (node.attrs.fixed) {
      attrs['fixed'] = 'true';
    }
    return ['qti-simple-associable-choice', attrs, 0];
  }
};
