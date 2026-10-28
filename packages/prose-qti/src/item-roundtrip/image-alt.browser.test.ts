/**
 * `alt=""` is how HTML and QTI mark an image as decorative, and the QTI 3.0 XSD makes `alt`
 * REQUIRED on `img`. Treating `""` as "no alt" therefore turned every decorative image into one
 * that fails XSD validation on export. "No alt" must still stay "no alt", though: writing `alt=""`
 * onto an image that had none would claim it is decorative, which only the author can decide.
 */
import { describe, expect, test } from 'vitest';

import { pmToQti3, qti3ToPm } from './convert.js';

const ITEM = `<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
    identifier="ALT" title="Alt">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-response-declaration identifier="POINT" cardinality="single" base-type="point"/>
  <qti-item-body>
    <p>
      <img src="decorative.png" alt=""/>
      <img src="described.png" alt="A red square"/>
      <img src="missing.png"/>
    </p>
    <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-simple-choice identifier="A"><img src="choice.png" alt=""/></qti-simple-choice>
      <qti-simple-choice identifier="B">B</qti-simple-choice>
    </qti-choice-interaction>
    <qti-select-point-interaction response-identifier="POINT" max-choices="1">
      <img src="graphic.png" width="600" height="400" alt=""/>
    </qti-select-point-interaction>
  </qti-item-body>
</qti-assessment-item>`;

/** `alt` of the exported `<img>` with this `src`: the string, or `null` when the attribute is absent. */
function exportedAlt(src: string): string | null {
  const xml = pmToQti3(qti3ToPm(ITEM));
  const exported = new DOMParser().parseFromString(xml, 'application/xml');
  const image = Array.from(exported.getElementsByTagName('img')).find(img => img.getAttribute('src') === src);
  if (!image) throw new Error(`no <img src="${src}"> in the exported item:\n${xml}`);
  return image.getAttribute('alt');
}

describe('qti3ToPm -> pmToQti3 keeps an image alt as authored', () => {
  test('alt="" survives, so a decorative image stays decorative and XSD-valid', () => {
    expect(exportedAlt('decorative.png')).toBe('');
  });

  test('alt="" survives on an image inside a simple choice', () => {
    expect(exportedAlt('choice.png')).toBe('');
  });

  test('alt="" survives on the select-point graphic', () => {
    expect(exportedAlt('graphic.png')).toBe('');
  });

  test('alt text is unchanged', () => {
    expect(exportedAlt('described.png')).toBe('A red square');
  });

  test('an image without alt is not given one', () => {
    expect(exportedAlt('missing.png')).toBeNull();
  });
});
