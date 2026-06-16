/**
 * Unit tests for the stripped attribute helpers.
 *
 * Runs as a browser test because `stripAttributesFromElement` operates on
 * real DOM `Element` instances which the `unit` vitest project doesn't provide
 * (no jsdom/happy-dom).
 */
import { describe, expect, it } from 'vitest';

import {
  getStrippedAttributeSources,
  normalizeStrippedAttribute,
  stripAttributesFromElement,
} from './stripped-attributes.js';

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
  strippedAttributes: InteractionComposerMetadata['strippedAttributes'],
): Pick<InteractionComposerMetadata, 'strippedAttributes'> {
  return { strippedAttributes };
}

describe('normalizeStrippedAttribute', () => {
  it('expands a plain string into a default data-* mirror with no aliases', () => {
    expect(normalizeStrippedAttribute('score')).toEqual({
      source: 'score',
      mirror: 'data-score',
      aliases: [],
    });
  });

  it('treats `mirror: false` as strip-only (mirror = null)', () => {
    expect(
      normalizeStrippedAttribute({ source: 'rubricScoringBlock', mirror: false }),
    ).toEqual({
      source: 'rubricScoringBlock',
      mirror: null,
      aliases: [],
    });
  });

  it('preserves explicit aliases and derives the default mirror', () => {
    expect(
      normalizeStrippedAttribute({
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
    expect(normalizeStrippedAttribute({ source: 'foo', mirror: 'data-bar' })).toEqual({
      source: 'foo',
      mirror: 'data-bar',
      aliases: [],
    });
  });
});

describe('getStrippedAttributeSources', () => {
  it('emits the canonical source plus every alias, including strip-only entries', () => {
    const metadata = makeMetadata([
      { source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] },
      'score',
      { source: 'rubricScoringBlock', mirror: false },
      'case-sensitive',
    ]);

    expect(getStrippedAttributeSources(metadata)).toEqual([
      'correct-response',
      'correctResponse',
      'correctAnswer',
      'score',
      'rubricScoringBlock',
      'case-sensitive',
    ]);
  });
});

describe('stripAttributesFromElement', () => {
  it('removes the canonical source attribute but leaves aliases intact', () => {
    const el = createElement('qti-choice-interaction', {
      'response-identifier': 'RESPONSE',
      'correct-response': 'A',
      correctResponse: 'A',
      correctAnswer: 'A',
      score: '1',
    });

    stripAttributesFromElement(
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

    stripAttributesFromElement(
      el,
      makeMetadata([{ source: 'rubricScoringBlock', mirror: false }, 'score']),
    );

    expect(el.hasAttribute('rubricScoringBlock')).toBe(false);
    expect(el.hasAttribute('score')).toBe(false);
  });
});
