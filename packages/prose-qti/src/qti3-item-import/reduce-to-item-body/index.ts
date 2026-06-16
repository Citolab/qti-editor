/**
 * Reduce a full `qti-assessment-item` document to its `qti-item-body`, making
 * the item-body the new document element and discarding everything else
 * (response/outcome declarations, response processing, etc.).
 *
 * This is the final step of the qti3 → roundtrip-xml hop: by the time it runs,
 * the per-interaction transforms (`roundtripChoice` / …) have already folded
 * authoring state into canonical attributes on the interactions, and
 * `roundtripItemBody` has copied `identifier` / `title` onto the item-body — so
 * the item-body is self-sufficient and the surrounding item is redundant.
 *
 * No-op when there is no `qti-item-body` (the document is left untouched).
 *
 * Idempotent: when `qti-item-body` is already the document element, nothing
 * changes.
 */
export const reduceToItemBody = (xmlDoc: XMLDocument): void => {
  const itemBody = xmlDoc.querySelector('qti-item-body');
  if (!itemBody || itemBody === xmlDoc.documentElement) return;

  // `replaceChild` reparents the item-body: it is removed from its current
  // parent and installed as the document element in place of the old root.
  xmlDoc.replaceChild(itemBody, xmlDoc.documentElement);
};
