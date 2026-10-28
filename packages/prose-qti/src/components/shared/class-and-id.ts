import type { AttributeSpec, Attrs } from 'prosemirror-model';

/**
 * `class` and `id` on the text-holding nodes inside an interaction: `qti-prompt`, the paragraphs of
 * a prompt and of a choice, and `qti-simple-match-set`.
 *
 * The same attributes `@citolab/prose-extensions`' `defineBasicExtension` gives the item body's own
 * nodes (`class-and-id.ts` there), written as a plain NodeSpec fragment because these specs are
 * shared by the ProseKit and the plain-ProseMirror schemas. `null` is "no attribute", so a node
 * without them serialises exactly as before.
 *
 * `class` is `splittable` (read by ProseKit's Enter); `id` is not, and `defineUniqueIds` there
 * clears an id an edit has copied.
 */
export const classAndIdAttrSpecs: Record<'class' | 'id', AttributeSpec> = {
  class: { default: null, validate: 'string|null', splittable: true } as AttributeSpec,
  id: { default: null, validate: 'string|null' },
};

/** The element's `class` and `id`, for a `getAttrs`; null for each one it does not have. */
export function parseClassAndId(node: Node | string): { class: string | null; id: string | null } {
  if (typeof node === 'string' || !('getAttribute' in node)) return { class: null, id: null };
  const element = node as Element;
  return { class: element.getAttribute('class') || null, id: element.getAttribute('id') || null };
}

/** The DOM attributes for a `toDOM`: only the ones the node has. */
export function classAndIdDomAttrs(attrs: Attrs): Record<string, string> {
  const dom: Record<string, string> = {};
  if (typeof attrs.class === 'string' && attrs.class) dom.class = attrs.class;
  if (typeof attrs.id === 'string' && attrs.id) dom.id = attrs.id;
  return dom;
}
