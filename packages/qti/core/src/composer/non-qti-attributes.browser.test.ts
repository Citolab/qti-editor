/**
 * Phase 2 unit tests for the unified non-QTI attribute helpers.
 *
 * Runs as a browser test because `stripNonQtiAttributesFromElement` and
 * `copyMirrorsToTarget` operate on real DOM `Element` instances which the
 * `unit` vitest project doesn't provide (no jsdom/happy-dom).
 *
 * See: plans/unify-non-qti-attribute-metadata.md (Phase 2).
 */
import { describe, expect, it } from 'vitest';

import {
  collectMirrorMappings,
  copyMirrorsToTarget,
  getAllMirrorTargets,
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

describe('collectMirrorMappings', () => {
  it('emits one tuple per source (canonical + aliases), excluding strip-only entries', () => {
    const metadata = makeMetadata([
      { source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] },
      'score',
      { source: 'rubricScoringBlock', mirror: false },
      'case-sensitive',
    ]);

    expect(collectMirrorMappings(metadata)).toEqual([
      { source: 'correct-response', target: 'data-correct-response' },
      { source: 'correctResponse', target: 'data-correct-response' },
      { source: 'correctAnswer', target: 'data-correct-response' },
      { source: 'score', target: 'data-score' },
      { source: 'case-sensitive', target: 'data-case-sensitive' },
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

describe('copyMirrorsToTarget', () => {
  const metadata = makeMetadata([
    { source: 'correct-response', aliases: ['correctResponse', 'correctAnswer'] },
    'score',
    { source: 'rubricScoringBlock', mirror: false },
  ]);

  it('copies the canonical source value to the data-* target', () => {
    const source = createElement('qti-choice-interaction', {
      'correct-response': 'A',
      score: '1',
    });
    const target = createElement('qti-choice-interaction');

    copyMirrorsToTarget(source, target, metadata);

    expect(target.getAttribute('data-correct-response')).toBe('A');
    expect(target.getAttribute('data-score')).toBe('1');
  });

  it('falls back to the first non-empty alias when the canonical source is missing', () => {
    const source = createElement('qti-choice-interaction', {
      correctResponse: 'B',
      correctAnswer: 'C', // would also match, but canonical alias order wins
    });
    const target = createElement('qti-choice-interaction');

    copyMirrorsToTarget(source, target, metadata);

    expect(target.getAttribute('data-correct-response')).toBe('B');
  });

  it('skips when neither canonical source nor aliases carry a value', () => {
    const source = createElement('qti-choice-interaction');
    const target = createElement('qti-choice-interaction');

    copyMirrorsToTarget(source, target, metadata);

    expect(target.hasAttribute('data-correct-response')).toBe(false);
    expect(target.hasAttribute('data-score')).toBe(false);
  });

  it('does not overwrite an existing target attribute', () => {
    const source = createElement('qti-choice-interaction', {
      'correct-response': 'A',
    });
    const target = createElement('qti-choice-interaction', {
      'data-correct-response': 'already-here',
    });

    copyMirrorsToTarget(source, target, metadata);

    expect(target.getAttribute('data-correct-response')).toBe('already-here');
  });

  it('never produces a mirror for strip-only entries', () => {
    const source = createElement('qti-extended-text-interaction', {
      rubricScoringBlock: 'rubric-xyz',
    });
    const target = createElement('qti-extended-text-interaction');

    copyMirrorsToTarget(source, target, metadata);

    expect(target.hasAttribute('data-rubricScoringBlock')).toBe(false);
    expect(target.hasAttribute('data-rubricscoringblock')).toBe(false);
  });
});

describe('getAllMirrorTargets', () => {
  it('aggregates and de-duplicates across a mock registry', () => {
    const registry = new Map<string, InteractionComposerMetadata>([
      [
        'qti-choice-interaction',
        {
          tagName: 'qti-choice-interaction',
          nodeTypeName: 'qtiChoiceInteraction',
          responseProcessing: { templateUri: '', internalSourceXml: '' },
          nonQtiAttributes: [
            { source: 'correct-response', aliases: ['correctResponse'] },
            'score',
          ],
          userEditableAttributes: [],
        },
      ],
      [
        'qti-text-entry-interaction',
        {
          tagName: 'qti-text-entry-interaction',
          nodeTypeName: 'qtiTextEntryInteraction',
          responseProcessing: { templateUri: '', internalSourceXml: '' },
          nonQtiAttributes: [
            'case-sensitive',
            // Duplicate of the entry from the choice interaction — should be deduped.
            { source: 'correct-response', aliases: ['correctResponse'] },
            'score',
          ],
          userEditableAttributes: [],
        },
      ],
      [
        'qti-extended-text-interaction',
        {
          tagName: 'qti-extended-text-interaction',
          nodeTypeName: 'qtiExtendedTextInteraction',
          responseProcessing: { templateUri: '', internalSourceXml: '' },
          nonQtiAttributes: [
            { source: 'rubricScoringBlock', mirror: false },
            'score',
          ],
          userEditableAttributes: [],
        },
      ],
    ]);

    expect(getAllMirrorTargets(registry)).toEqual([
      { source: 'correct-response', target: 'data-correct-response' },
      { source: 'correctResponse', target: 'data-correct-response' },
      { source: 'score', target: 'data-score' },
      { source: 'case-sensitive', target: 'data-case-sensitive' },
    ]);
  });
});
