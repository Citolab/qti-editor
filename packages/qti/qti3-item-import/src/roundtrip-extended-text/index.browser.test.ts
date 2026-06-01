import { describe, expect, it } from 'vitest';

import { roundtripExtendedText } from './index';

const parse = (xml: string): XMLDocument =>
  new DOMParser().parseFromString(xml, 'text/xml');

const itemXml = (body: string, processing = '') =>
  parse(`<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="i" title="i">
  <qti-item-body>${body}</qti-item-body>
  ${processing}
</qti-assessment-item>`);

const rubric = (paragraphs: string[]) => `
  <qti-rubric-block view="scorer" use="scoring">
    <qti-content-body>
      <div>
        ${paragraphs.map((p) => `<p>${p}</p>`).join('\n        ')}
      </div>
    </qti-content-body>
  </qti-rubric-block>`;

const extendedText = (extra = '') =>
  `<qti-extended-text-interaction response-identifier="RESPONSE" expected-lines="6" ${extra} />`;

describe('roundtripExtendedText', () => {
  it('joins rubric <p> lines with \\n into correct-response', () => {
    const doc = itemXml(`${extendedText()}${rubric(['line1', 'line2'])}`);
    roundtripExtendedText(doc);
    const interaction = doc.querySelector('qti-extended-text-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('line1\nline2');
    expect(interaction.getAttribute('score')).toBe('1');
  });

  it('passes through with no rubric block', () => {
    const doc = itemXml(extendedText());
    roundtripExtendedText(doc);
    expect(doc.querySelector('qti-extended-text-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('passes through when rubric block contains only space placeholders', () => {
    const doc = itemXml(`${extendedText()}${rubric([' ', ' '])}`);
    roundtripExtendedText(doc);
    expect(doc.querySelector('qti-extended-text-interaction')!.hasAttribute('correct-response')).toBe(false);
  });

  it('passes through when two extended-text interactions present', () => {
    const doc = itemXml(`${extendedText()}${extendedText()}${rubric(['x'])}`);
    roundtripExtendedText(doc);
    doc.querySelectorAll('qti-extended-text-interaction').forEach((i) => {
      expect(i.hasAttribute('correct-response')).toBe(false);
    });
  });

  it('idempotent', () => {
    const doc = itemXml(
      `${extendedText('correct-response="kept" score="7"')}${rubric(['ignored'])}`,
    );
    roundtripExtendedText(doc);
    const interaction = doc.querySelector('qti-extended-text-interaction')!;
    expect(interaction.getAttribute('correct-response')).toBe('kept');
    expect(interaction.getAttribute('score')).toBe('7');
  });
});
