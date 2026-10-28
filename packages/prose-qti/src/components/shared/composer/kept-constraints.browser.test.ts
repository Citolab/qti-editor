import { describe, expect, test } from 'vitest';

import { reconcileKeptConstraint } from './kept-constraints.js';

import type { ComposerWarning } from './types.js';

const element = (value?: string) => {
  const el = document.createElement('qti-choice-interaction');
  if (value != null) el.setAttribute('min-choices', value);
  return el;
};

const context = { tagName: 'qti-choice-interaction', responseIdentifier: 'RESPONSE', reason: 'is out of range' };

describe('reconcileKeptConstraint', () => {
  test('lowers a value above max and warns', () => {
    const el = element('3');
    const warnings: ComposerWarning[] = [];
    expect(reconcileKeptConstraint(el, 'min-choices', { max: 1 }, context, warnings)).toBe(1);
    expect(el.getAttribute('min-choices')).toBe('1');
    expect(warnings).toEqual([
      {
        code: 'CONSTRAINT_RECONCILED',
        message: 'min-choices="3" on qti-choice-interaction is out of range; it is exported as min-choices="1".',
        tagName: 'qti-choice-interaction',
        responseIdentifier: 'RESPONSE',
      },
    ]);
  });

  test('raises a value below min', () => {
    const el = element('1');
    const warnings: ComposerWarning[] = [];
    expect(reconcileKeptConstraint(el, 'min-choices', { min: 2 }, context, warnings)).toBe(2);
    expect(el.getAttribute('min-choices')).toBe('2');
    expect(warnings).toHaveLength(1);
  });

  test('leaves a value in range, an absent one, and 0 when 0 is unlimited', () => {
    const warnings: ComposerWarning[] = [];
    const inRange = element('1');
    expect(reconcileKeptConstraint(inRange, 'min-choices', { min: 0, max: 2 }, context, warnings)).toBe(1);
    expect(reconcileKeptConstraint(element(), 'min-choices', { max: 1 }, context, warnings)).toBeNull();
    const unlimited = element('0');
    expect(reconcileKeptConstraint(unlimited, 'min-choices', { min: 2, zeroIsUnlimited: true }, context, warnings)).toBe(0);
    expect(unlimited.getAttribute('min-choices')).toBe('0');
    expect(warnings).toEqual([]);
  });
});
