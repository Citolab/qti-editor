/**
 * The notice's own behaviour, with no editor and no QTI in sight.
 *
 * Split from the app test that used to own this when the component moved into the package: what a
 * *given* schema can and cannot represent is a question about that schema, and belongs with it, but
 * how a finding is rendered and worded is neither app's business. Hand-built outcomes here rather
 * than scanned ones, so each assertion is about the rendering and nothing else.
 */
import { describe, expect, test } from 'vitest';

import { renderSchemaGapNotice, SCHEMA_GAP_NOTICE_CLASS } from './index.js';

import type { RecoveryChange, SchemaGapOutcome } from '../types.js';

const change = (tagName: string, excerpt?: string): RecoveryChange => ({
  kind: 'unrepresentable-element',
  code: 'UNKNOWN_NODE_PRESERVED',
  severity: 'warning',
  message: `Removed <${tagName}>, which the schema cannot represent.`,
  nodeType: tagName,
  data: excerpt ? { excerpt } : {},
});

const outcome = (...changes: RecoveryChange[]): SchemaGapOutcome => ({
  changes,
  preservedFragments: [],
});

describe('renderSchemaGapNotice', () => {
  const host = () => document.createElement('div');

  test('hides itself and says nothing when there is nothing to report', () => {
    const element = host();
    renderSchemaGapNotice(element, outcome());

    expect(element.hidden).toBe(true);
    expect(element.textContent).toBe('');
    // The class goes on regardless, so a host can style the element without knowing the outcome.
    expect(element.classList.contains(SCHEMA_GAP_NOTICE_CLASS)).toBe(true);
  });

  test('names each element type once, with a count and a quote', () => {
    const element = host();
    renderSchemaGapNotice(element, outcome(
      change('qti-gap-text', 'basisch'),
      change('qti-gap-text', 'zuur'),
      change('qti-companion-materials-info', 'Ruler and compass'),
    ));

    expect(element.hidden).toBe(false);
    // Three findings, two types, two lines — thirty identical lines would be read by nobody.
    expect(element.querySelectorAll('li')).toHaveLength(2);
    expect(element.textContent).toContain('3 elements');
    expect(element.textContent).toContain('<qti-gap-text>');
    expect(element.textContent).toContain('× 2');
    // The first quotable text under a type is enough to find it in the source.
    expect(element.textContent).toContain('“basisch”');
    expect(element.textContent).not.toContain('zuur');
  });

  test('renders again over its own output rather than appending to it', () => {
    const element = host();
    renderSchemaGapNotice(element, outcome(change('qti-gap')));
    renderSchemaGapNotice(element, outcome(change('qti-gap-text')));

    expect(element.querySelectorAll('li')).toHaveLength(1);
    expect(element.textContent).not.toContain('<qti-gap>');

    // And back to nothing, for a host that renders unconditionally on every load.
    renderSchemaGapNotice(element, outcome());
    expect(element.hidden).toBe(true);
    expect(element.textContent).toBe('');
  });

  test('every sentence can be replaced', () => {
    const element = host();
    renderSchemaGapNotice(element, outcome(change('qti-gap', 'x'), change('qti-gap', 'y')), {
      messages: {
        heading: count => `NL: ${count} elementen passen hier niet.`,
        occurrences: count => ` (${count}×)`,
        quote: excerpt => ` → „${excerpt}”`,
      },
    });

    expect(element.textContent).toContain('NL: 2 elementen passen hier niet.');
    expect(element.textContent).toContain('(2×)');
    expect(element.textContent).toContain('→ „x”');
    // Replaced, not appended to.
    expect(element.textContent).not.toContain('cannot represent');
  });

  test('a partial override keeps the built-in English for the rest', () => {
    const element = host();
    renderSchemaGapNotice(element, outcome(change('qti-gap', 'Ruler')), {
      messages: { heading: () => 'Just the heading' },
    });

    expect(element.textContent).toContain('Just the heading');
    expect(element.textContent).toContain('“Ruler”');
  });

  test('singular and plural are different sentences, not one with a number in it', () => {
    const one = host();
    renderSchemaGapNotice(one, outcome(change('qti-gap')));
    expect(one.textContent).toContain('cannot represent 1 element in this item. Its content');

    const two = host();
    renderSchemaGapNotice(two, outcome(change('qti-gap'), change('qti-gap-text')));
    expect(two.textContent).toContain('cannot represent 2 elements in this item. Their content');
  });
});
