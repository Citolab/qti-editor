/**
 * Unit tests for the non-QTI attribute helpers.
 *
 * Runs as a browser test because `stripNonQtiAttributesFromElement` operates on
 * real DOM `Element` instances which the `unit` vitest project doesn't provide
 * (no jsdom/happy-dom).
 */
import { describe, expect, it } from 'vitest';

import {
  getNonQtiAttributeSources,
  normalizeNonQtiAttribute,
  stripNonQtiAttributesFromElement,
} from './non-qti-attributes.js';

import type { InteractionComposerMetadata } from '@qti-editor/interfaces';


function createElement(tagName: string, attrs: Record<string, string> = {}): Element {
  const doc = document.implementation.createDocument(null, tagName, null);
  const el = doc.documentElement;
  for (const [key, value] of Object.entries(attrs)) {
    el.setAttribute(key, value);
  }
  return el;
}

function makeMetadata(
  nonQtiAttributes: InteractionComposerMetadata['nonQtiAttributes'],
): Pick<InteractionComposerMetadata, 'nonQtiAttributes'> {
  return { nonQtiAttributes };
}

describe('normalizeNonQtiAttribute', () => {
  it('expands a plain string into a default data-* mirror with no aliases', () => {
    expect(normalizeNonQtiAttribute('score')).toEqual({
      source: 'score',
      mirror: 'data-score',
      aliases: [],
    });
  });

  it('treats `mirror: false` as strip-only (mirror = null)', () => {
    expect(
      normalizeNonQtiAttribute({ source: 'rubricScoringBlock', mirror: false }),
    ).toEqual({
      source: 'rubricScoringBlock',
      mirror: null,
      aliases: [],
    });
  });

  it('preserves explicit aliases and derives the default mirror', () => {
    expect(
      normalizeNonQtiAttribute({
        source: 'correct-response',
        aliases: ['correctResponse', 'correctAnswer'],
      }),
    ).toEqual({
      source: 'correct-response',
      mirror: 'data-correct-response',
      aliases: ['correctResponse', 'correctAnswer'],
    });
  });

  it('preserves an explicit mirror string', () => {
    expect(normalizeNonQtiAttribute({ source: 'foo', mirror: 'data-bar' })).toEqual({
      source: 'foo',
      mirror: 'data-bar',
      aliases: [],
    });
  });
});

describe('getNonQtiAttributeSources', () => {
  it('emits the canonical source plus every alias, including strip-only entries', () => {
    const metadata = makeMetadata([
      { source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] },
      'score',
      { source: 'rubricScoringBlock', mirror: false },
      'case-sensitive',
    ]);

    expect(getNonQtiAttributeSources(metadata)).toEqual([
      'correct-response',
      'correctResponse',
      'correctAnswer',
      'score',
      'rubricScoringBlock',
      'case-sensitive',
    ]);
  });
});

describe('stripNonQtiAttributesFromElement', () => {
  it('removes the canonical source attribute but leaves aliases intact', () => {
    const el = createElement('qti-choice-interaction', {
      'response-identifier': 'RESPONSE',
      'correct-response': 'A',
      correctResponse: 'A',
      correctAnswer: 'A',
      score: '1',
    });

    stripNonQtiAttributesFromElement(
      el,
      makeMetadata([
        { source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] },
        'score',
      ]),
    );

    expect(el.hasAttribute('correct-response')).toBe(false);
    expect(el.hasAttribute('score')).toBe(false);
    // Aliases are deliberately preserved — matches today's Phase 1 snapshot.
    expect(el.getAttribute('correctResponse')).toBe('A');
    expect(el.getAttribute('correctAnswer')).toBe('A');
    expect(el.getAttribute('response-identifier')).toBe('RESPONSE');
  });

  it('also strips strip-only entries from the source element', () => {
    const el = createElement('qti-extended-text-interaction', {
      rubricScoringBlock: 'some-rubric-content',
      score: '2',
    });

    stripNonQtiAttributesFromElement(
      el,
      makeMetadata([{ source: 'rubricScoringBlock', mirror: false }, 'score']),
    );

    expect(el.hasAttribute('rubricScoringBlock')).toBe(false);
    expect(el.hasAttribute('score')).toBe(false);
  });
});
