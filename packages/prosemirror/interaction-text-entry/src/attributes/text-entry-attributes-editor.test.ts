import {
  parseTextEntryCaseSensitiveAttribute,
  parseTextEntryClassState,
  serializeTextEntryClassState,
  textEntryAttributesFriendlyEditor,
} from './text-entry-attributes-editor';

describe('text entry attributes editor metadata', () => {
  it('declares the friendly editor kind', () => {
    expect(textEntryAttributesFriendlyEditor.attribute).toBe('correctResponse');
    expect(textEntryAttributesFriendlyEditor.kind).toBe('textEntryAttributes');
  });
});

describe('text entry class helpers', () => {
  it('parses and preserves unknown classes', () => {
    const parsed = parseTextEntryClassState('custom-a qti-input-width-10 custom-b');

    expect(parsed.widthClass).toBe('qti-input-width-10');
    expect(parsed.unknownClasses).toEqual(['custom-a', 'custom-b']);
  });

  it('serializes classes with width class last', () => {
    const serialized = serializeTextEntryClassState({
      widthClass: 'qti-input-width-20',
      unknownClasses: ['custom-a', 'custom-b'],
    });

    expect(serialized).toBe('custom-a custom-b qti-input-width-20');
  });
});

describe('text entry case-sensitive parsing', () => {
  it('parses truthy values', () => {
    expect(parseTextEntryCaseSensitiveAttribute(true)).toBe(true);
    expect(parseTextEntryCaseSensitiveAttribute('true')).toBe(true);
    expect(parseTextEntryCaseSensitiveAttribute('1')).toBe(true);
  });

  it('parses false values', () => {
    expect(parseTextEntryCaseSensitiveAttribute(false)).toBe(false);
    expect(parseTextEntryCaseSensitiveAttribute('false')).toBe(false);
    expect(parseTextEntryCaseSensitiveAttribute(undefined)).toBe(false);
  });
});
