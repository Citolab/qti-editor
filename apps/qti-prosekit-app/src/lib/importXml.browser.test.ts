import { describe, expect, it, vi } from 'vitest';

import { importXmlFromText } from './importXml';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';

function wrapItem(bodyInner: string, bodyAttrs = ''): string {
  return `<qti-assessment-item xmlns="${QTI_NS}" identifier="i1" title="t1"><qti-item-body${bodyAttrs ? ' ' + bodyAttrs : ''}>${bodyInner}</qti-item-body></qti-assessment-item>`;
}

const roundtripSpy = vi.fn((s: string) => s);

vi.mock('@qti-editor/qti3-item-import', () => ({
  roundtripQtiItem: (s: string) => roundtripSpy(s),
}));

describe('importXmlFromText', () => {
  it('always hoists native declarations via roundtripQtiItem (every QTI3 is third-party)', () => {
    roundtripSpy.mockClear();
    const xml = wrapItem('<p>hi</p>');
    try {
      importXmlFromText(xml, { schema: undefined as never });
    } catch {
      // jsonFromHTML may throw without a real schema — we only care that the hoist ran first.
    }
    expect(roundtripSpy).toHaveBeenCalledOnce();
    expect(roundtripSpy).toHaveBeenCalledWith(expect.stringContaining('hi'));
  });

  it('runs roundtripQtiItem regardless of any data-* markers on the item-body', () => {
    roundtripSpy.mockClear();
    const xml = wrapItem('<p>marked</p>', 'data-schema-version="6"');
    try {
      importXmlFromText(xml, { schema: undefined as never });
    } catch {
      // schema may throw downstream
    }
    expect(roundtripSpy).toHaveBeenCalledOnce();
    expect(roundtripSpy).toHaveBeenCalledWith(expect.stringContaining('marked'));
  });
});
