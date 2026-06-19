import { Schema } from 'prosemirror-model';

import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
} from '../../../shared';
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

    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph'),
    ]);
    const interaction = schema.node('qtiExtendedTextInteraction', null, [prompt]);

    expect(interaction.attrs).toEqual({
      responseIdentifier: null,
      expectedLength: null,
      placeholderText: null,
      patternMask: null,
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

    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph'),
    ]);
    const interaction = schema.node('qtiExtendedTextInteraction', {
      responseIdentifier: 'RESPONSE',
      expectedLength: 120,
      placeholderText: 'Explain your answer',
      patternMask: '[A-Z]+',
      class: 'essay',
      score: 5,
    }, [prompt]);

    expect(qtiExtendedTextInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-extended-text-interaction',
      {
        'response-identifier': 'RESPONSE',
        'expected-length': '120',
        'placeholder-text': 'Explain your answer',
        'pattern-mask': '[A-Z]+',
        class: 'essay',
        score: '5',
      },
      0,
    ]);
  });
});
