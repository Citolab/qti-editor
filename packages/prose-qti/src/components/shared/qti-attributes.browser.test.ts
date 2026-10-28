import { describe, expect, test } from 'vitest';

import { parseQtiInteger, qtiAttributes } from './qti-attributes.js';

const kept = qtiAttributes({
  expectedLength: { name: 'expected-length', type: 'integer' },
  patternMask: 'pattern-mask',
});

const element = (attributes: Record<string, string>) => {
  const el = document.createElement('qti-text-entry-interaction');
  for (const [name, value] of Object.entries(attributes)) el.setAttribute(name, value);
  return el;
};

describe('qtiAttributes', () => {
  test('every attribute defaults to null', () => {
    expect(kept.attrs).toEqual({ expectedLength: { default: null }, patternMask: { default: null } });
  });

  test('parse reads each attribute, null when absent', () => {
    expect(kept.parse(element({ 'expected-length': '12', 'pattern-mask': '[0-9]*' }))).toEqual({
      expectedLength: 12,
      patternMask: '[0-9]*',
    });
    expect(kept.parse(element({}))).toEqual({ expectedLength: null, patternMask: null });
    expect(kept.parse('text')).toEqual({ expectedLength: null, patternMask: null });
  });

  test('an integer that does not read as one is null, never NaN', () => {
    for (const value of ['abc', '1.5', '12px', '', ' ']) {
      expect(kept.parse(element({ 'expected-length': value })).expectedLength, value).toBeNull();
    }
  });

  test('domAttrs writes only what the node holds', () => {
    expect(kept.domAttrs({ expectedLength: 12, patternMask: '[0-9]*' })).toEqual({
      'expected-length': '12',
      'pattern-mask': '[0-9]*',
    });
    expect(kept.domAttrs({ expectedLength: null, patternMask: null })).toEqual({});
    expect(kept.domAttrs({ expectedLength: 0, patternMask: '' })).toEqual({ 'expected-length': '0' });
  });

  test('domAttrs accepts the string the panel writes into a text field, and drops what is not a number', () => {
    expect(kept.domAttrs({ expectedLength: '20' })).toEqual({ 'expected-length': '20' });
    expect(kept.domAttrs({ expectedLength: 'twenty' })).toEqual({});
    expect(kept.domAttrs({ expectedLength: Number.NaN })).toEqual({});
  });
});

describe('parseQtiInteger', () => {
  test.each([
    ['0', 0],
    ['42', 42],
    ['+3', 3],
    ['-1', -1],
    [' 7 ', 7],
    [null, null],
    ['', null],
    ['NaN', null],
    ['1e3', null],
  ])('%j → %j', (value, expected) => {
    expect(parseQtiInteger(value)).toBe(expected);
  });
});
