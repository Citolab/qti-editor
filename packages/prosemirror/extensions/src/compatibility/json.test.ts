import {
  CURRENT_JSON_DOCUMENT_VERSION,
  CURRENT_PERSISTED_STATE_VERSION,
  migrateJsonDocument,
  readPersistedDocStateEnvelope,
  writePersistedDocStateEnvelope,
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

  it('reads old persisted envelopes and returns migrated content', () => {
    const result = readPersistedDocStateEnvelope({
      version: 1,
      doc: {
        type: 'doc',
        content: [
          {
            type: 'qtiTextEntryInteraction',
            attrs: {
              'response-identifier': 'TEXT',
              'correct-response': 'answer',
            },
          },
        ],
      },
    });

    expect(result.envelopeVersion).toBe(1);
    expect(result.schemaVersion).toBe(1);
    expect(result.doc?.content?.[0]?.attrs).toEqual({
      responseIdentifier: 'TEXT',
      correctResponse: 'answer',
    });
    expect(result.compatibility?.sourceVersion).toBe(1);
    expect(result.compatibility?.targetVersion).toBe(CURRENT_JSON_DOCUMENT_VERSION);
  });

  it('writes the latest persisted envelope shape', () => {
    const payload = writePersistedDocStateEnvelope({ type: 'doc', content: [] });

    expect(payload).toEqual({
      version: CURRENT_PERSISTED_STATE_VERSION,
      schemaVersion: CURRENT_JSON_DOCUMENT_VERSION,
      doc: { type: 'doc', content: [] },
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

  it('reads a bare NodeJSON (no envelope) via readPersistedDocStateEnvelope without data loss', () => {
    const result = readPersistedDocStateEnvelope(v1RegressionDoc);

    expect(result.envelopeVersion).toBe(1);
    expect(result.doc?.content?.[0]?.attrs?.responseIdentifier).toBe('RESPONSE_1');
    expect(result.doc?.content?.[1]?.attrs?.caseSensitive).toBe(false);
    expect(result.compatibility?.sourceVersion).toBe(1);
    expect(result.compatibility?.targetVersion).toBe(CURRENT_JSON_DOCUMENT_VERSION);
  });

  it('passes through a current-version envelope without running any migration steps', () => {
    const currentDoc: NodeJSON = {
      type: 'doc',
      content: [
        { type: 'qtiTextEntryInteraction', attrs: { responseIdentifier: 'R1', caseSensitive: true } },
      ],
    };
    const envelope = writePersistedDocStateEnvelope(currentDoc);
    const result = readPersistedDocStateEnvelope(envelope);

    expect(result.doc?.content?.[0]?.attrs?.responseIdentifier).toBe('R1');
    expect(result.compatibility?.appliedStepIds).toHaveLength(0);
  });
});
