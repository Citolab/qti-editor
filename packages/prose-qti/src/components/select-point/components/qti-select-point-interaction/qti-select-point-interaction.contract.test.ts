import { Schema } from 'prosemirror-model';

import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
} from '@citolab/prose-qti/components/shared';

import { imgSelectPointNodeSpec } from './img-select-point.schema.js';
import { qtiSelectPointInteractionNodeSpec } from './qti-select-point-interaction.schema.js';

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

describe('qtiSelectPointInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = new Schema({
      nodes: {
        ...baseNodes,
        qtiPromptParagraph: qtiPromptParagraphNodeSpec,
        qtiPrompt: qtiPromptNodeSpec,
        imgSelectPoint: imgSelectPointNodeSpec,
        qtiSelectPointInteraction: qtiSelectPointInteractionNodeSpec,
      },
    });

    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Mark the correct point on the image.')]),
    ]);
    const image = schema.node('imgSelectPoint');
    const interaction = schema.node('qtiSelectPointInteraction', null, [prompt, image]);

    expect(interaction.attrs).toEqual({
      responseIdentifier: null,
      maxChoices: 0,
      minChoices: 0,
      class: null,
      areaMappings: '[]',
      correctResponse: null,
      score: 1,
    });
  });

  it('serializes authoring attrs to the canonical DOM attribute names', () => {
    const schema = new Schema({
      nodes: {
        ...baseNodes,
        qtiPromptParagraph: qtiPromptParagraphNodeSpec,
        qtiPrompt: qtiPromptNodeSpec,
        imgSelectPoint: imgSelectPointNodeSpec,
        qtiSelectPointInteraction: qtiSelectPointInteractionNodeSpec,
      },
    });

    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Mark the correct point on the image.')]),
    ]);
    const image = schema.node('imgSelectPoint', {
      imageSrc: 'image.png',
      imageAlt: 'Map',
      imageWidth: 640,
      imageHeight: 480,
    });
    const interaction = schema.node('qtiSelectPointInteraction', {
      responseIdentifier: 'RESPONSE',
      maxChoices: 2,
      minChoices: 1,
      class: 'review-mode',
      areaMappings: '[{"shape":"circle"}]',
      correctResponse: '10 20',
      score: 3,
    }, [prompt, image]);

    expect(qtiSelectPointInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-select-point-interaction',
      {
        'max-choices': '2',
        'min-choices': '1',
        'response-identifier': 'RESPONSE',
        class: 'review-mode',
        'area-mappings': '[{"shape":"circle"}]',
        'correct-response': '10 20',
        score: '3',
      },
      0,
    ]);
  });
});
