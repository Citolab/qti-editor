import { isAreaShape } from '@citolab/prose-qti/components/shared/graphic/area-geometry.js';

import type { DOMOutputSpec, NodeSpec } from 'prosemirror-model';

function isElementLike(node: Node | string): node is HTMLElement {
  return typeof node === 'object' && node !== null && 'getAttribute' in node && typeof node.getAttribute === 'function';
}

const CHOICE_TAG = 'qti-hotspot-choice';

/**
 * The identifier for a `qti-hotspot-choice` that has none: `HOTSPOT_<n>`, the first number free
 * among its siblings. Worked out over all of them in document order, so every choice without an
 * identifier gets a different one, and parsing the same markup twice gives the same identifiers.
 */
function generatedIdentifier(element: Element): string {
  const siblings = element.parentElement
    ? Array.from(element.parentElement.children).filter(child => child.localName === CHOICE_TAG)
    : [element];
  const taken = new Set(siblings.map(sibling => sibling.getAttribute('identifier')?.trim()).filter(Boolean));
  let next = 1;
  for (const sibling of siblings) {
    if (sibling.getAttribute('identifier')?.trim()) continue;
    while (taken.has(`HOTSPOT_${next}`)) next += 1;
    const identifier = `HOTSPOT_${next}`;
    taken.add(identifier);
    if (sibling === element) return identifier;
  }
  return `HOTSPOT_${next}`;
}

/**
 * One `qti-hotspot-choice`: a region of the interaction's image, identified so the correct response
 * can name it.
 *
 * An atom with no content — QTI gives a hotspot choice none — drawn by the interaction's editor on
 * top of the image rather than rendered itself. No `group`: only `qtiHotspotInteraction` names it, and
 * a node in `block` would be a candidate for the editor to insert into an item body on its own (see
 * "The block group" in schema/create-qti-schema.ts).
 *
 * Selectable: the editor selects an area by putting a `NodeSelection` on its choice, so the
 * attributes panel shows the choice, the decorator treats the interaction as clicked into, and
 * Delete / Backspace remove the area (see `hotspot-choice-editing.ts`).
 *
 * Every attribute QTI defines for it is kept, including the ones the editor has no UI for
 * (`template-identifier`, `show-hide`), plus `class` and `aria-label` — a hotspot has no text, so
 * `aria-label` is its only accessible name. `id` is not kept (see the hotspot page of the docs).
 * A choice without an `identifier` gets a generated one, unique within the interaction.
 */
export const qtiHotspotChoiceNodeSpec: NodeSpec = {
  atom: true,
  selectable: true,
  attrs: {
    identifier: { default: 'HOTSPOT' },
    shape: { default: 'rect' },
    coords: { default: '' },
    hotspotLabel: { default: null },
    fixed: { default: false },
    templateIdentifier: { default: null },
    showHide: { default: null },
    class: { default: null },
    ariaLabel: { default: null },
  },
  parseDOM: [
    {
      tag: CHOICE_TAG,
      // `//` rather than `/` for the same reason as `qtiSimpleChoice`: a paste resolves the context
      // against the node the cursor is in, not the interaction.
      context: 'qtiHotspotInteraction//',
      getAttrs: (node: Node | string) => {
        if (!isElementLike(node)) return {};
        const shape = node.getAttribute('shape');
        return {
          identifier: node.getAttribute('identifier')?.trim() || generatedIdentifier(node),
          shape: isAreaShape(shape) ? shape : 'rect',
          coords: node.getAttribute('coords') ?? '',
          hotspotLabel: node.getAttribute('hotspot-label'),
          fixed: node.getAttribute('fixed') === 'true',
          templateIdentifier: node.getAttribute('template-identifier'),
          showHide: node.getAttribute('show-hide'),
          class: node.getAttribute('class') || null,
          ariaLabel: node.getAttribute('aria-label'),
        };
      },
    },
  ],
  toDOM(node): DOMOutputSpec {
    const attrs: Record<string, string> = {
      identifier: String(node.attrs.identifier),
      shape: String(node.attrs.shape),
    };
    // `default` covers the whole image and has no coords.
    if (node.attrs.coords) attrs.coords = String(node.attrs.coords);
    if (node.attrs.hotspotLabel) attrs['hotspot-label'] = String(node.attrs.hotspotLabel);
    if (node.attrs.fixed) attrs.fixed = 'true';
    if (node.attrs.templateIdentifier) attrs['template-identifier'] = String(node.attrs.templateIdentifier);
    if (node.attrs.showHide) attrs['show-hide'] = String(node.attrs.showHide);
    if (node.attrs.class) attrs.class = String(node.attrs.class);
    if (node.attrs.ariaLabel) attrs['aria-label'] = String(node.attrs.ariaLabel);
    return [CHOICE_TAG, attrs];
  },
};
