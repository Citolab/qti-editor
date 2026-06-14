import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleMatchSetNodeSpec: NodeSpec = {
  group: 'block',
  content: 'qtiSimpleAssociableChoice+',
  parseDOM: [
    {
      tag: 'qti-simple-match-set'
    }
  ],
  toDOM(): DOMOutputSpec {
    return ['qti-simple-match-set', {}, 0];
  }
};
