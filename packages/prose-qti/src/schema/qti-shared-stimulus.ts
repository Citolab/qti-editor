import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

/**
 * The shared-stimulus placeholder — `<div class="qti-shared-stimulus" data-stimulus-idref="…"></div>`.
 *
 * An empty element in the item body marking WHERE the player puts the shared text (the reading
 * passage, the source) that the item's `<qti-assessment-stimulus-ref>` points at. The item does not
 * contain that text; it contains only this slot, so the node is an atom with nothing inside it.
 *
 * ## A qti-components runtime convention
 *
 * Not QTI-spec vocabulary: the qti-components runtime (and the Cito items written for it) fills the
 * slot itself.
 *
 *   - `qti-assessment-stimulus-ref` looks up `[data-stimulus-idref="<its identifier>"]` inside its
 *     item, empties it and loads the stimulus into it (`packages/qti-elements/src/components/
 *     qti-assessment-stimulus-ref/qti-assessment-stimulus-ref.ts`).
 *   - the test player's navigation does the same across items, and clears the slots again when it
 *     leaves one (`packages/qti-test/src/mixins/test-navigation.mixin.ts`).
 *
 * Its own fixtures write it as `<div class="qti-shared-stimulus" data-stimulus-idref="Stimulus1">`.
 * Without this node the div matched no rule, so the slot was dropped on import and an exported item
 * showed its questions with the reading text gone.
 *
 * ## Only an empty div
 *
 * The rule matches a `div[data-stimulus-idref]` with no child elements and no text, and nothing
 * else. `data-stimulus-idref` alone does not make an element a slot: Cito items also carry it on
 * `<div class="dep-dialogTrigger" data-stimulus-idref="WIN_…"><img …/></div>`, a dialog trigger
 * whose image is content, and qti-components' `qb-stimulusref.xml` fixture has a slot holding
 * placeholder text. An atom has no content, so matching either would delete what is inside it.
 * They are left to the other rules, which read them the way they did before this node existed.
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
 * Everything else on the element comes back as it was written: `class` (so `qti-shared-stimulus`,
 * or anything a stylesheet reads, survives), `id`, and any other `data-*` attribute (Cito's
 * `data-dep-dialog-height`, say). `class` and `id` are `null` when absent, the convention of the
 * class-and-id attributes on the other body nodes; the other `data-*` attributes are kept in
 * `data`, in source order, `null` when there are none.
 *
 * Nothing inserts one; it arrives from imported QTI. Selectable and draggable so an author can move
 * or delete the slot like any other block. Empty, it has no height of its own; the editor's
 * `core-css.css` gives it a dashed, labelled box (`editor-affordances.css`).
 */
export const qtiSharedStimulusNodeSpec: NodeSpec = {
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,
  attrs: {
    stimulusIdref: { validate: 'string' },
    class: { default: null, validate: 'string|null' },
    id: { default: null, validate: 'string|null' },
    data: { default: null }
  },
  parseDOM: [
    {
      tag: 'div[data-stimulus-idref]',
      // Ahead of qtiLayoutDiv's plain `div` rule.
      priority: 60,
      getAttrs: (node: Node | string) => {
        if (!(node instanceof HTMLElement)) return false;
        if (node.childElementCount > 0 || /\S/.test(node.textContent ?? '')) return false;
        return {
          stimulusIdref: node.getAttribute('data-stimulus-idref') ?? '',
          class: node.getAttribute('class'),
          id: node.getAttribute('id') || null,
          data: otherDataAttributesOf(node)
        };
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {};
    if (node.attrs.class) attrs.class = node.attrs.class as string;
    if (node.attrs.id) attrs.id = node.attrs.id as string;
    attrs['data-stimulus-idref'] = node.attrs.stimulusIdref as string;
    const data = node.attrs.data as Record<string, string> | null;
    if (data) for (const [name, value] of Object.entries(data)) attrs[name] = value;
    return ['div', attrs];
  }
};

/** The element's `data-*` attributes other than `data-stimulus-idref`, or `null` when it has none. */
function otherDataAttributesOf(element: HTMLElement): Record<string, string> | null {
  const data: Record<string, string> = {};
  for (const { name, value } of Array.from(element.attributes)) {
    if (name.startsWith('data-') && name !== 'data-stimulus-idref') data[name] = value;
  }
  return Object.keys(data).length > 0 ? data : null;
}
