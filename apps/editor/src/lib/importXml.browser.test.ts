import { describe, expect, it, vi } from 'vitest';

import { isEditorOriginXml, importXmlFromText } from './importXml';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';

function wrapItem(bodyInner: string, bodyAttrs = ''): string {
  return `<qti-assessment-item xmlns="${QTI_NS}" identifier="i1" title="t1"><qti-item-body${bodyAttrs ? ' ' + bodyAttrs : ''}>${bodyInner}</qti-item-body></qti-assessment-item>`;
}

const roundtripSpy = vi.fn((s: string) => s);

vi.mock('@qti-editor/qti3-item-import', () => ({
  roundtripQtiItem: (s: string) => roundtripSpy(s),
}));

describe('isEditorOriginXml', () => {
  it('returns true when the only item-body carries data-schema-version', () => {
    const xml = wrapItem('<p>hi</p>', 'data-schema-version="6"');
    expect(isEditorOriginXml(xml)).toBe(true);
  });

  it('returns false when the item-body lacks data-schema-version', () => {
    const xml = wrapItem('<p>hi</p>');
    expect(isEditorOriginXml(xml)).toBe(false);
  });

  it('returns false when zero qti-item-body elements exist', () => {
    const xml = `<qti-assessment-item xmlns="${QTI_NS}" identifier="i1" title="t1"></qti-assessment-item>`;
    expect(isEditorOriginXml(xml)).toBe(false);
  });

  it('returns false when at least one item-body is missing the marker', () => {
    const xml = `<root xmlns="${QTI_NS}">`
      + `<qti-item-body data-schema-version="6"><p>a</p></qti-item-body>`
      + `<qti-item-body><p>b</p></qti-item-body>`
      + `</root>`;
    expect(isEditorOriginXml(xml)).toBe(false);
  });
});

describe('importXmlFromText branching', () => {
  it('calls roundtripQtiItem for foreign QTI (no marker)', () => {
    roundtripSpy.mockClear();
    const xml = wrapItem('<p>foreign</p>');
    try {
      importXmlFromText(xml, { schema: undefined as never });
    } catch {
      // jsonFromHTML may throw without a real schema — we only care that the spy fired first.
    }
    expect(roundtripSpy).toHaveBeenCalledOnce();
    expect(roundtripSpy).toHaveBeenCalledWith(expect.stringContaining('foreign'));
  });

  it('does NOT call roundtripQtiItem for editor-origin XML (marker present)', () => {
    roundtripSpy.mockClear();
    const xml = wrapItem('<p>editor</p>', 'data-schema-version="6"');
    try {
      importXmlFromText(xml, { schema: undefined as never });
    } catch {
      // schema may throw downstream
    }
    expect(roundtripSpy).not.toHaveBeenCalled();
  });
});
