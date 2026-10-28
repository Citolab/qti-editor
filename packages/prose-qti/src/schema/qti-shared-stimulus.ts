import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/**
 * The shared-stimulus placeholder — `<div class="qti-shared-stimulus" data-stimulus-idref="…">`.
 *
 * An empty element in the item body marking WHERE the player puts the shared text (the reading
 * passage, the source) that the item's `<qti-assessment-stimulus-ref>` points at. The item does not
 * contain that text; it contains only this slot, so the node is an atom with nothing inside it.
 *
 * ## Runtime vocabulary, not an app convention
 *
 * qti-components fills the slot itself:
 *
 *   - `qti-assessment-stimulus-ref` looks up `[data-stimulus-idref="<its identifier>"]` inside its
 *     item and loads the stimulus into it (`packages/qti-elements/src/components/
 *     qti-assessment-stimulus-ref/qti-assessment-stimulus-ref.ts`).
 *   - the test player's navigation does the same across items, and clears the slots again when it
 *     leaves one (`packages/qti-test/src/mixins/test-navigation.mixin.ts`).
 *
 * Its own fixtures write it as `<div class="qti-shared-stimulus" data-stimulus-idref="Stimulus1">`.
 * Without this node the div matched no rule, so the slot was dropped on import and an exported item
 * showed its questions with the reading text gone.
 *
 * ## Shape
 *
 * `data-stimulus-idref` is REQUIRED (no default), deliberately. This node is in `block` — it is
 * item-body content — and ProseMirror's "what block goes here?" lookups (`ContentMatch.defaultType`,
 * behind `createAndFill` and the gap cursor's reachability guess) skip any type with a required
 * attribute. So it can never be chosen as a filler: an empty document or a new table cell still
 * fills with a paragraph. It is also not a textblock, so `defaultBlockAt` (Enter) cannot pick it.
 * See "The block group" in create-qti-schema.ts.
 *
 * `class` is kept as written, so `qti-shared-stimulus` (or anything a package stylesheet reads)
 * survives. Only `div` is matched: the runtime would accept any element carrying the attribute, but
 * a `div` is the form the runtime's own fixtures use and the only one seen in items.
 *
 * Nothing inserts one; it arrives from imported QTI. Selectable and draggable so an author can move
 * or delete the slot like any other block.
 */
export const qtiSharedStimulusNodeSpec: NodeSpec = {
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  attrs: {
    stimulusIdref: { validate: 'string' },
    class: { default: null, validate: 'string|null' }
  },
  parseDOM: [
    {
      tag: 'div[data-stimulus-idref]',
      // Ahead of qtiLayoutDiv's plain `div` rule.
      priority: 60,
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return false;
        return {
          stimulusIdref: node.getAttribute('data-stimulus-idref') ?? '',
          class: node.getAttribute('class')
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.class) attrs.class = node.attrs.class as string;
    attrs['data-stimulus-idref'] = node.attrs.stimulusIdref as string;
    return ['div', attrs];
  }
};
