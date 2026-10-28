import { withGlobalAttrs } from '@citolab/prose-extensions/html-schema';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/*
 * No `group: 'block'`: `qtiSimpleChoice` names this directly, and the `parseDOM` rule below already
 * says `context: 'qtiSimpleChoice//'` — the node was declaring that it only belongs there while the
 * group said otherwise. See "The block group" in schema/create-qti-schema.ts.
 *
 * The context is `//` (ancestor at any depth), not `/` (immediate parent), because a cursor sits
 * inside this paragraph rather than inside the choice, so `/` never matched on paste. See the long
 * note on the same change in qti-simple-choice.schema.ts.
 */
// `class`, `id`, `lang` and `xml:lang`, in both schemas: see `global-attrs.ts` in prose-extensions.
export const qtiSimpleChoiceParagraphNodeSpec: NodeSpec = withGlobalAttrs({
  content: '(text | image)*',
  parseDOM: [{ tag: 'p', context: 'qtiSimpleChoice//', priority: 60 }],
  toDOM(): DOMOutputSpec {
    return ['p', 0];
  },
});
