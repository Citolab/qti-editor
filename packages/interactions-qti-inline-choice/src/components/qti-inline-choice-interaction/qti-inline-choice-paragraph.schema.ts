import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiInlineChoiceParagraphNodeSpec: NodeSpec = {
  group: 'block',
  content: 'text*',
  parseDOM: [{ tag: 'p', context: 'qtiInlineChoice/' }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  },
};
