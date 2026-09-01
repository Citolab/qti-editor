import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/*
 * No `group: 'block'`: a match set outside its interaction has no meaning — the source/target
 * direction is what makes a `correct-response` pair readable — and `qtiMatchInteraction` /
 * `qtiMatchInteractionTabular` name it directly (`qtiPrompt? qtiSimpleMatchSet{2}`).
 * See "The block group" in schema/create-qti-schema.ts.
 */
export const qtiSimpleMatchSetNodeSpec: NodeSpec = {
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
