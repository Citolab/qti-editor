import { describe, expect, it } from 'vitest';

import {
  parseCorrectResponseAttribute,
  serializeCorrectResponseAttribute,
} from './codec.js';

describe('parseCorrectResponseAttribute', () => {
  it('returns null for null/undefined/empty', () => {
    expect(parseCorrectResponseAttribute(null)).toBeNull();
    expect(parseCorrectResponseAttribute(undefined)).toBeNull();
    expect(parseCorrectResponseAttribute('')).toBeNull();
    expect(parseCorrectResponseAttribute('   ')).toBeNull();
  });

  it('returns single string for value without comma', () => {
    expect(parseCorrectResponseAttribute('A')).toBe('A');
    expect(parseCorrectResponseAttribute('  alpha  ')).toBe('alpha');
    expect(parseCorrectResponseAttribute('new york')).toBe('new york');
  });

  it('returns array for comma-separated values', () => {
    expect(parseCorrectResponseAttribute('A,B')).toEqual(['A', 'B']);
    expect(parseCorrectResponseAttribute('  a , b  ')).toEqual(['a', 'b']);
    expect(parseCorrectResponseAttribute('alpha,beta,gamma')).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('preserves spaces within tokens', () => {
    expect(parseCorrectResponseAttribute('item1 droplist0,item2 droplist1')).toEqual([
      'item1 droplist0',
      'item2 droplist1',
    ]);
  });

  it('drops empty tokens from trailing/duplicate commas', () => {
    expect(parseCorrectResponseAttribute('A,,B')).toEqual(['A', 'B']);
    expect(parseCorrectResponseAttribute(',A,')).toBe('A');
  });
});

describe('serializeCorrectResponseAttribute', () => {
  it('returns null for null/empty input', () => {
    expect(serializeCorrectResponseAttribute(null)).toBeNull();
    expect(serializeCorrectResponseAttribute('')).toBeNull();
    expect(serializeCorrectResponseAttribute('   ')).toBeNull();
    expect(serializeCorrectResponseAttribute([])).toBeNull();
    expect(serializeCorrectResponseAttribute(['', '  '])).toBeNull();
  });

  it('passes through single string trimmed', () => {
    expect(serializeCorrectResponseAttribute('A')).toBe('A');
    expect(serializeCorrectResponseAttribute('  alpha  ')).toBe('alpha');
  });

  it('joins array with commas', () => {
    expect(serializeCorrectResponseAttribute(['A', 'B'])).toBe('A,B');
    expect(serializeCorrectResponseAttribute(['  a  ', 'b'])).toBe('a,b');
  });

  it('round-trips both shapes', () => {
    const inputs: Array<string | string[]> = ['A', ['A', 'B'], 'item1 droplist0', ['x y', 'z w']];
    for (const input of inputs) {
      const serialized = serializeCorrectResponseAttribute(input);
      const reparsed = parseCorrectResponseAttribute(serialized);
      expect(reparsed).toEqual(input);
    }
  });
});
