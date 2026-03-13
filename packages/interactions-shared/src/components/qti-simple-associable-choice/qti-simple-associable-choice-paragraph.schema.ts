import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleAssociableChoiceParagraphNodeSpec: NodeSpec = {
  content: 'inline*',
  parseDOM: [{ tag: 'p' }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  }
};
