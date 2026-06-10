import { Schema } from 'prosemirror-model';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
} from '@qti-editor/interaction-shared';

import { qtiExtendedTextInteractionNodeSpec } from './qti-extended-text-interaction.schema.js';

import type { NodeSpec } from 'prosemirror-model';

const baseNodes = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0] as const,
  },
} satisfies Record<string, NodeSpec>;

describe('qtiExtendedTextInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = new Schema({
      nodes: {
        ...baseNodes,
        qtiPromptParagraph: qtiPromptParagraphNodeSpec,
        qtiPrompt: qtiPromptNodeSpec,
        qtiExtendedTextInteraction: qtiExtendedTextInteractionNodeSpec,
      },
    });

    const interaction = schema.node('qtiExtendedTextInteraction');

    expect(interaction.attrs).toEqual({
      responseIdentifier: null,
      expectedLength: null,
      expectedLines: null,
      placeholderText: null,
      format: 'plain',
      patternMask: null,
      base: 10,
      stringIdentifier: null,
      maxStrings: null,
      minStrings: 0,
      class: null,
      score: 1,
    });
  });

  it('serializes only the non-default authoring attrs', () => {
    const schema = new Schema({
      nodes: {
        ...baseNodes,
        qtiPromptParagraph: qtiPromptParagraphNodeSpec,
        qtiPrompt: qtiPromptNodeSpec,
        qtiExtendedTextInteraction: qtiExtendedTextInteractionNodeSpec,
      },
    });

    const interaction = schema.node('qtiExtendedTextInteraction', {
      responseIdentifier: 'RESPONSE',
      expectedLength: 120,
      expectedLines: 6,
      placeholderText: 'Explain your answer',
      format: 'xhtml',
      patternMask: '[A-Z]+',
      base: 16,
      stringIdentifier: 'STRING_1',
      maxStrings: 3,
      minStrings: 1,
      class: 'essay',
      score: 5,
    });

    expect(qtiExtendedTextInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-extended-text-interaction',
      {
        'response-identifier': 'RESPONSE',
        'expected-length': '120',
        'expected-lines': '6',
        'placeholder-text': 'Explain your answer',
        format: 'xhtml',
        'pattern-mask': '[A-Z]+',
        base: '16',
        'string-identifier': 'STRING_1',
        'max-strings': '3',
        'min-strings': '1',
        class: 'essay',
        score: '5',
      },
      0,
    ]);
  });
});
