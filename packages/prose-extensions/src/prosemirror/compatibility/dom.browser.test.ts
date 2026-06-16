import { describe, expect, it } from 'vitest';

import { CURRENT_HTML_DOCUMENT_VERSION, migrateHtmlFragment } from './dom.js';

describe('html compatibility', () => {
  it('renames legacy camelCase attrs before ProseMirror parsing', () => {
    const result = migrateHtmlFragment(`
      <qti-inline-choice-interaction
        responseIdentifier="RESPONSE"
        correctResponse="choice-a"
        expectedLines="4"
      >
        <qti-inline-choice identifier="choice-a">A</qti-inline-choice>
      </qti-inline-choice-interaction>
    `, {
      sourceVersion: 1,
    });

    expect(result.targetVersion).toBe(CURRENT_HTML_DOCUMENT_VERSION);
    expect(result.document).toContain('response-identifier="RESPONSE"');
    expect(result.document).toContain('correct-response="choice-a"');
    expect(result.document).toContain('expected-lines="4"');
    expect(result.document).not.toContain('responseIdentifier=');
    expect(result.document).not.toContain('correctResponse=');
    expect(result.changes.some(change => change.code === 'RENAME_ATTRIBUTE')).toBe(true);
  });

  it('preserves configured unsupported attrs and elements in a sidecar', () => {
    const result = migrateHtmlFragment(`
      <qti-inline-choice-interaction rubric-text="Model answer">
        <qti-inline-choice identifier="choice-a">A</qti-inline-choice>
        <qti-rubric-block view="author">Legacy block</qti-rubric-block>
      </qti-inline-choice-interaction>
    `, {
      sourceVersion: 2,
      preserve: {
        attributeNames: ['rubric-text'],
        elementTags: ['qti-rubric-block'],
      },
    });

    expect(result.preservedFragments).toEqual([
      expect.objectContaining({
        attributeName: 'rubric-text',
        nodeType: 'qti-inline-choice-interaction',
      }),
      expect.objectContaining({
        nodeType: 'qti-rubric-block',
      }),
    ]);
    expect(result.changes.some(change => change.code === 'UNKNOWN_ATTRIBUTE_PRESERVED')).toBe(true);
    expect(result.changes.some(change => change.code === 'UNKNOWN_NODE_PRESERVED')).toBe(true);
  });
});

// ── no silent data loss — full legacy QTI regression fixture ──────────────────

// Covers every camelCase attr name that appeared in v1 QTI/HTML imports.
// Also validates that the lowercase variants (e.g. responseidentifier) map correctly.
describe('no silent data loss — v1 HTML/QTI regression', () => {
  const legacyFragment = `
    <qti-inline-choice-interaction
      responseIdentifier="RESPONSE_1"
      correctResponse="choice-a"
      maxChoices="2"
      minChoices="1"
      areaMappings="{}"
    >
      <qti-inline-choice identifier="choice-a">Option A</qti-inline-choice>
    </qti-inline-choice-interaction>
    <qti-text-entry-interaction
      responseIdentifier="RESPONSE_2"
      correctAnswer="answer"
      caseSensitive="false"
      expectedLength="20"
      expectedLines="3"
    ></qti-text-entry-interaction>
    <qti-order-interaction
      responseidentifier="RESPONSE_3"
      matchmax="4"
    ></qti-order-interaction>
  `;

  it('migrates all legacy camelCase attrs to canonical hyphenated names', () => {
    const result = migrateHtmlFragment(legacyFragment, { sourceVersion: 1 });

    expect(result.document).toContain('response-identifier="RESPONSE_1"');
    expect(result.document).toContain('correct-response="choice-a"');
    expect(result.document).toContain('max-choices="2"');
    expect(result.document).toContain('min-choices="1"');
    expect(result.document).toContain('area-mappings="{}"');
    expect(result.document).toContain('response-identifier="RESPONSE_2"');
    expect(result.document).toContain('correct-response="answer"');
    expect(result.document).toContain('case-sensitive="false"');
    expect(result.document).toContain('expected-length="20"');
    expect(result.document).toContain('expected-lines="3"');
    expect(result.document).toContain('response-identifier="RESPONSE_3"');
    expect(result.document).toContain('match-max="4"');
  });

  it('removes every legacy camelCase attr name from the output', () => {
    const result = migrateHtmlFragment(legacyFragment, { sourceVersion: 1 });

    const legacyNames = [
      'responseIdentifier', 'responseidentifier',
      'correctResponse', 'correctAnswer',
      'maxChoices', 'minChoices',
      'areaMappings', 'matchMax', 'matchmax',
      'caseSensitive', 'expectedLength', 'expectedLines',
    ];

    for (const name of legacyNames) {
      expect(result.document).not.toContain(`${name}=`);
    }
  });

  it('emits a RENAME_ATTRIBUTE change for each migrated attr', () => {
    const result = migrateHtmlFragment(legacyFragment, { sourceVersion: 1 });

    const renames = result.changes.filter(c => c.code === 'RENAME_ATTRIBUTE');
    // 5 attrs on interaction1 + 5 on interaction2 + 2 on interaction3
    expect(renames.length).toBeGreaterThanOrEqual(12);
  });

  it('does not emit any warning-level changes for a clean migration', () => {
    const result = migrateHtmlFragment(legacyFragment, { sourceVersion: 1 });

    const warnings = result.changes.filter(c => c.severity === 'warning');
    expect(warnings).toHaveLength(0);
  });
});
