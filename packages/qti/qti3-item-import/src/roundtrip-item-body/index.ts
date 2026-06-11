/**
 * Copy item-level metadata onto the qti-item-body so the editor can recover it
 * when a full qti-assessment-item is reduced to a roundtrip item-body.
 *
 * Copies `identifier` and `title` from the (single) qti-assessment-item onto
 * each qti-item-body as canonical (unprefixed) attributes.
 *
 * Conditions:
 * - A qti-assessment-item exists carrying the attribute.
 *
 * Idempotent: existing identifier / title attributes on the item-body are
 * preserved.
 */
export const roundtripItemBody = (xmlDoc: XMLDocument): void => {
  const assessmentItem = xmlDoc.querySelector('qti-assessment-item');
  if (!assessmentItem) return;

  const identifier = assessmentItem.getAttribute('identifier');
  const title = assessmentItem.getAttribute('title');

  xmlDoc.querySelectorAll('qti-item-body').forEach((body) => {
    if (identifier && !body.getAttribute('identifier')) {
      body.setAttribute('identifier', identifier);
    }
    if (title && !body.getAttribute('title')) {
      body.setAttribute('title', title);
    }
  });
};
