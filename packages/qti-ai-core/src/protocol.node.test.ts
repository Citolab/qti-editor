import { describe, expect, it } from 'vitest';

import { parseAuthoringReply, readAuthoringStream } from './index.js';
const reply = {
  version: 1,
  requestId: 'r',
  capabilityId: 'c',
  summary: 'Columns',
  operations: [{ kind: 'setVocabulary', target: 'n1', group: 'columns', value: 'qti-choices-stacking-2' }],
  suggestions: []
};
describe('authoring protocol', () => {
  it('never exposes payload at any streaming boundary', () => {
    const raw = 'I suggest two columns.\n```qti-authoring\n' + JSON.stringify(reply) + '\n```';
    for (let n = 0; n <= raw.length; n++) {
      expect(readAuthoringStream(raw.slice(0, n)).prose).not.toContain('```');
      expect(readAuthoringStream(raw.slice(0, n)).prose).not.toContain('operations');
    }
    expect(readAuthoringStream(raw, true).reply).toEqual(reply);
  });
  it('rejects truncated and multiple envelopes', () => {
    expect(() => readAuthoringStream('```qti-authoring\n{}', true)).toThrow();
    expect(() => readAuthoringStream('```qti-authoring\n{}\n```\n```qti-authoring\n{}\n```', true)).toThrow();
  });
  it('rejects unknown operations and clarification with edits', () => {
    expect(() => parseAuthoringReply({ ...reply, operations: [{ kind: 'execute', target: 'n1' }] })).toThrow();
    expect(() =>
      parseAuthoringReply({ ...reply, clarification: { id: 'q', question: 'Topic?', options: [], allowOther: true } })
    ).toThrow();
  });
  it('allows explanations with dynamic suggestions', () => {
    expect(
      parseAuthoringReply({
        ...reply,
        operations: [],
        suggestions: [{ id: 's', label: 'Explain', prompt: 'Explain the answer' }]
      }).suggestions
    ).toHaveLength(1);
  });
});
