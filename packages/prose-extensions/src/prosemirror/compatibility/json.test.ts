import {
  CURRENT_JSON_DOCUMENT_VERSION,
  migrateJsonDocument,
  readPersistedDoc,
  stampSchemaVersion,
} from './json.js';

import type { NodeJSON } from 'prosekit/core';

describe('json snapshot compatibility', () => {
  it('migrates legacy hyphenated attrs to canonical JSON attrs', () => {
    const legacyDoc = {
      type: 'doc',
      content: [
        {
          type: 'qtiInlineChoiceInteraction',
          attrs: {
            'response-identifier': 'RESPONSE',
            'correct-response': 'choice-a',
            score: 2,
          },
          content: [
            {
              type: 'qtiInlineChoice',
              attrs: { identifier: 'choice-a' },
            },
          ],
        },
      ],
    };

    const result = migrateJsonDocument(legacyDoc, { sourceVersion: 1 });

    expect(result.targetVersion).toBe(CURRENT_JSON_DOCUMENT_VERSION);
    expect(result.document.content?.[0]?.attrs).toEqual({
      responseIdentifier: 'RESPONSE',
      correctResponse: 'choice-a',
      score: 2,
    });
    expect(result.changes.some(change => change.code === 'RENAME_ATTRIBUTE')).toBe(true);
    expect(result.appliedStepIds).toContain('json-v1-to-v2-normalize-legacy-attrs');
  });

  it('reads a stored doc with an embedded schemaVersion and returns migrated content', () => {
    const result = readPersistedDoc({
      type: 'doc',
      schemaVersion: 1,
      content: [
        {
          type: 'qtiTextEntryInteraction',
          attrs: {
            'response-identifier': 'TEXT',
            'correct-response': 'answer',
          },
        },
      ],
    });

    expect(result.schemaVersion).toBe(1);
    expect(result.doc?.content?.[0]?.attrs).toEqual({
      responseIdentifier: 'TEXT',
      correctResponse: 'answer',
    });
    expect(result.compatibility?.sourceVersion).toBe(1);
    expect(result.compatibility?.targetVersion).toBe(CURRENT_JSON_DOCUMENT_VERSION);
  });

  it('stamps the current schema version onto a document', () => {
    const stamped = stampSchemaVersion({ type: 'doc', content: [] });

    expect(stamped).toEqual({
      type: 'doc',
      content: [],
      schemaVersion: CURRENT_JSON_DOCUMENT_VERSION,
    });
  });
});

// ── no silent data loss — full v1 regression fixtures ────────────────────────

// Covers all 9 legacy hyphenated attribute names that existed in v1 snapshots.
const v1RegressionDoc: NodeJSON = {
  type: 'doc',
  content: [
    {
      type: 'qtiInlineChoiceInteraction',
      attrs: {
        'response-identifier': 'RESPONSE_1',
        'correct-response': 'choice-a',
        'max-choices': 2,
        'min-choices': 1,
        'area-mappings': '{}',
      },
    },
    {
      type: 'qtiTextEntryInteraction',
      attrs: {
        'response-identifier': 'RESPONSE_2',
        'correct-response': 'answer',
        'case-sensitive': false,
        'expected-length': 20,
        'expected-lines': 3,
      },
    },
    {
      type: 'qtiOrderInteraction',
      attrs: {
        'response-identifier': 'RESPONSE_3',
        'match-max': 4,
      },
    },
  ],
};

describe('no silent data loss — v1 JSON snapshot regression', () => {
  it('migrates all legacy hyphenated attrs to canonical camelCase names', () => {
    const result = migrateJsonDocument(v1RegressionDoc, { sourceVersion: 1 });

    const [interaction1, interaction2, interaction3] = result.document.content ?? [];

    expect(interaction1?.attrs).toMatchObject({
      responseIdentifier: 'RESPONSE_1',
      correctResponse: 'choice-a',
      maxChoices: 2,
      minChoices: 1,
      areaMappings: '{}',
    });

    expect(interaction2?.attrs).toMatchObject({
      responseIdentifier: 'RESPONSE_2',
      correctResponse: 'answer',
      caseSensitive: false,
      expectedLength: 20,
      expectedLines: 3,
    });

    expect(interaction3?.attrs).toMatchObject({
      responseIdentifier: 'RESPONSE_3',
      matchMax: 4,
    });
  });

  it('removes every legacy hyphenated key from the output document', () => {
    const result = migrateJsonDocument(v1RegressionDoc, { sourceVersion: 1 });

    const legacyKeys = [
      'response-identifier', 'correct-response', 'max-choices', 'min-choices',
      'area-mappings', 'case-sensitive', 'expected-length', 'expected-lines', 'match-max',
    ];

    for (const node of result.document.content ?? []) {
      for (const key of legacyKeys) {
        expect(Object.keys(node.attrs ?? {})).not.toContain(key);
      }
    }
  });

  it('reads a bare NodeJSON (no embedded version) via readPersistedDoc without data loss', () => {
    const result = readPersistedDoc(v1RegressionDoc);

    expect(result.schemaVersion).toBe(1);
    expect(result.doc?.content?.[0]?.attrs?.responseIdentifier).toBe('RESPONSE_1');
    expect(result.doc?.content?.[1]?.attrs?.caseSensitive).toBe(false);
    expect(result.compatibility?.sourceVersion).toBe(1);
    expect(result.compatibility?.targetVersion).toBe(CURRENT_JSON_DOCUMENT_VERSION);
  });

  it('passes through a current-version doc without running any migration steps', () => {
    const currentDoc: NodeJSON = {
      type: 'doc',
      content: [
        { type: 'qtiTextEntryInteraction', attrs: { responseIdentifier: 'R1', caseSensitive: true } },
      ],
    };
    const stamped = stampSchemaVersion(currentDoc);
    const result = readPersistedDoc(stamped);

    expect(result.doc?.content?.[0]?.attrs?.responseIdentifier).toBe('R1');
    expect(result.compatibility?.appliedStepIds).toHaveLength(0);
  });
});

// ── v2 → v3 → v4: correctResponse lifted into a sibling qtiRubricBlock ──

describe('correctResponse → rubricScoringBlock → qtiRubricBlock on qtiExtendedTextInteraction', () => {
  it('lifts the rubric value into a sibling qtiRubricBlock and drops the attr', () => {
    const v2Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'qtiExtendedTextInteraction',
          attrs: { responseIdentifier: 'RESPONSE_1', correctResponse: 'model answer\n', expectedLines: 6 },
        },
      ],
    };

    const result = migrateJsonDocument(v2Doc, { sourceVersion: 2 });

    const extendedText = result.document.content?.[0];
    expect(extendedText?.attrs?.rubricScoringBlock).toBeUndefined();
    expect(extendedText?.attrs?.correctResponse).toBeUndefined();

    const rubricBlock = result.document.content?.[1];
    expect(rubricBlock?.type).toBe('qtiRubricBlock');
    expect(rubricBlock?.attrs).toEqual({ use: 'scoring', view: 'scorer' });
    expect(rubricBlock?.content?.[0]?.content?.[0]?.text).toBe('model answer\n');

    expect(result.changes.some(c => c.code === 'RENAME_ATTRIBUTE' && c.attributeName === 'rubricScoringBlock')).toBe(true);
    expect(result.changes.some(c => c.code === 'ATTRIBUTE_MOVED' && c.attributeName === 'rubricScoringBlock')).toBe(true);
  });

  it('does not rename correctResponse on other interaction types', () => {
    const v2Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'qtiInlineChoiceInteraction',
          attrs: { responseIdentifier: 'RESPONSE_2', correctResponse: 'choice-a' },
        },
      ],
    };

    const result = migrateJsonDocument(v2Doc, { sourceVersion: 2 });

    expect(result.document.content?.[0]?.attrs?.correctResponse).toBe('choice-a');
    expect(result.document.content?.[0]?.attrs?.rubricScoringBlock).toBeUndefined();
    expect(result.document.content?.[1]?.type).not.toBe('qtiRubricBlock');
  });

  it('reads a v2 doc end-to-end and lifts the rubric into a sibling block', () => {
    const v2Doc = {
      type: 'doc',
      schemaVersion: 2,
      content: [
        {
          type: 'qtiExtendedTextInteraction',
          attrs: { responseIdentifier: 'R1', correctResponse: 'antwoord', expectedLines: 3 },
        },
      ],
    };

    const result = readPersistedDoc(v2Doc);

    expect(result.doc?.content?.[0]?.attrs?.rubricScoringBlock).toBeUndefined();
    expect(result.doc?.content?.[0]?.attrs?.correctResponse).toBeUndefined();
    expect(result.doc?.content?.[1]?.type).toBe('qtiRubricBlock');
    expect(result.doc?.content?.[1]?.content?.[0]?.content?.[0]?.text).toBe('antwoord');
    expect(result.compatibility?.sourceVersion).toBe(2);
    expect(result.compatibility?.targetVersion).toBe(CURRENT_JSON_DOCUMENT_VERSION);
  });

  it('also runs the v1→v2 step when loading a v1 doc with extended text', () => {
    const v1Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'qtiExtendedTextInteraction',
          attrs: { 'response-identifier': 'R1', 'correct-response': 'oud antwoord' },
        },
      ],
    };

    const result = migrateJsonDocument(v1Doc, { sourceVersion: 1 });

    // v1→v2 renamed hyphenated attrs, v2→v3 renamed correctResponse→rubricScoringBlock,
    // v3→v4 lifted rubricScoringBlock into a sibling qtiRubricBlock node.
    expect(result.document.content?.[0]?.attrs?.responseIdentifier).toBe('R1');
    expect(result.document.content?.[0]?.attrs?.rubricScoringBlock).toBeUndefined();
    expect(result.document.content?.[0]?.attrs?.correctResponse).toBeUndefined();
    expect(result.document.content?.[1]?.type).toBe('qtiRubricBlock');
    expect(result.document.content?.[1]?.content?.[0]?.content?.[0]?.text).toBe('oud antwoord');
    expect(result.appliedStepIds).toEqual([
      'json-v1-to-v2-normalize-legacy-attrs',
      'json-v2-to-v3-extended-text-correctResponse-to-rubricScoringBlock',
      'json-v3-to-v4-extended-text-rubricScoringBlock-to-rubric-block',
      'json-v4-to-v5-flat-list-to-schema-list',
      'json-v5-to-v6-bold-italic-marks-to-strong-em',
    ]);
  });

  it('drops an empty rubricScoringBlock without inserting a qtiRubricBlock', () => {
    const v3Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'qtiExtendedTextInteraction',
          attrs: { responseIdentifier: 'R1', rubricScoringBlock: '   ', expectedLines: 3 },
        },
      ],
    };

    const result = migrateJsonDocument(v3Doc, { sourceVersion: 3 });

    expect(result.document.content?.[0]?.attrs?.rubricScoringBlock).toBeUndefined();
    expect(result.document.content).toHaveLength(1);
    expect(result.changes.some(c => c.code === 'ATTRIBUTE_REMOVED' && c.attributeName === 'rubricScoringBlock')).toBe(true);
  });
});

// ── v4 → v5: prosekit flat list → prosemirror-schema-list ──

describe('v4 → v5 flat list conversion', () => {
  it('converts a bullet flat list to bullet_list with list_item children', () => {
    const v4Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'list',
          attrs: { kind: 'bullet' },
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'one' }] },
            { type: 'paragraph', content: [{ type: 'text', text: 'two' }] },
          ],
        },
      ],
    };

    const result = migrateJsonDocument(v4Doc, { sourceVersion: 4 });

    const list = result.document.content?.[0];
    expect(list?.type).toBe('bullet_list');
    expect(list?.attrs).toBeUndefined();
    expect(list?.content).toHaveLength(2);
    expect(list?.content?.[0]?.type).toBe('list_item');
    expect(list?.content?.[0]?.content?.[0]?.type).toBe('paragraph');
    expect(list?.content?.[0]?.content?.[0]?.content?.[0]?.text).toBe('one');
    expect(result.changes.some(c => c.code === 'RENAME_NODE')).toBe(true);
  });

  it('converts an ordered flat list to ordered_list', () => {
    const v4Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'list',
          attrs: { kind: 'ordered' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }],
        },
      ],
    };

    const result = migrateJsonDocument(v4Doc, { sourceVersion: 4 });

    expect(result.document.content?.[0]?.type).toBe('ordered_list');
  });

  it('coerces task/toggle lists to bullet_list with a warning', () => {
    const v4Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'list',
          attrs: { kind: 'task' },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'todo' }] }],
        },
      ],
    };

    const result = migrateJsonDocument(v4Doc, { sourceVersion: 4 });

    expect(result.document.content?.[0]?.type).toBe('bullet_list');
    expect(result.changes.some(c => c.code === 'NODE_REMOVED' && c.severity === 'warning')).toBe(true);
  });
});

// ── v5 → v6: bold/italic marks → strong/em ──

describe('v5 → v6 mark conversion', () => {
  it('renames bold/italic marks to strong/em', () => {
    const v5Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'x', marks: [{ type: 'bold' }, { type: 'italic' }] },
          ],
        },
      ],
    };

    const result = migrateJsonDocument(v5Doc, { sourceVersion: 5 });

    const text = result.document.content?.[0]?.content?.[0];
    expect(text?.marks).toEqual([{ type: 'strong' }, { type: 'em' }]);
    expect(result.changes.filter(c => c.code === 'RENAME_NODE')).toHaveLength(2);
  });

  it('leaves unrelated marks untouched', () => {
    const v5Doc: NodeJSON = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'x', marks: [{ type: 'code' }] }],
        },
      ],
    };

    const result = migrateJsonDocument(v5Doc, { sourceVersion: 5 });

    expect(result.document.content?.[0]?.content?.[0]?.marks).toEqual([{ type: 'code' }]);
  });
});
