import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

export const qtiSimpleChoiceParagraphNodeSpec: NodeSpec = {
  group: 'block',
  content: 'text*',
  parseDOM: [{ tag: 'p', context: 'qtiSimpleChoice/', priority: 60 }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  },
};
