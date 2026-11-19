import { describe, expect, test } from 'vitest';

import { pmToQti3, qti3ToPm } from '@citolab/prose-qti-node';

/**
 * `alt=""` marks an image as decorative and the QTI 3.0 XSD requires `alt` on `img`, so dropping
 * the empty value made the export invalid. An absent `alt` must stay absent: writing `alt=""` would
 * claim the image is decorative.
 *
 * Pinned through the BUILT package, in plain Node, because there linkedom rather than the browser
 * is the DOM these attributes pass through.
 */
const ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="ALT" title="Alt">
  <qti-item-body>
    <p><img src="decorative.png" alt=""/><img src="described.png" alt="A red square"/><img src="missing.png"/></p>
  </qti-item-body>
</qti-assessment-item>`;

/** `src` → `alt` of every exported `<img>`, with `null` for an absent attribute. */
function exportedAlts(): Record<string, string | null> {
  const exported = new DOMParser().parseFromString(pmToQti3(qti3ToPm(ITEM)), 'text/xml');
  return Object.fromEntries(
    Array.from(exported.getElementsByTagName('img')).map(img => [
      img.getAttribute('src'),
      img.hasAttribute('alt') ? img.getAttribute('alt') : null
    ])
  );
}

describe('qti3ToPm -> pmToQti3 keeps an image alt as authored', () => {
  test('alt="" is kept, alt text is unchanged, and a missing alt stays missing', () => {
    expect(exportedAlts()).toEqual({
      'decorative.png': '',
      'described.png': 'A red square',
      'missing.png': null
    });
  });
});
