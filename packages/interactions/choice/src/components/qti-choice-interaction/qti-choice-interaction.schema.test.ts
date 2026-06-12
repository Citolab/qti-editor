import { createSchemaFromNodeSpecs } from '@qti-editor/interaction-shared/test-support/schema.js';

import { choiceInteractionDescriptor } from '../../descriptor.js';
import { qtiChoiceInteractionNodeSpec } from './qti-choice-interaction.schema.js';

describe('qtiChoiceInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(choiceInteractionDescriptor.nodeSpecs);
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Choose one answer.')]),
    ]);
    const choiceA = schema.node('qtiSimpleChoice', null, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Option A')]),
    ]);
    const interaction = schema.node('qtiChoiceInteraction', null, [prompt, choiceA]);

    expect(interaction.attrs).toEqual({
      maxChoices: 0,
      class: null,
      correctResponse: null,
      responseIdentifier: null,
      score: 1,
      shuffle: false,
    });
  });

  it('serializes authoring attrs to the canonical DOM attribute names', () => {
    const schema = createSchemaFromNodeSpecs(choiceInteractionDescriptor.nodeSpecs);
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Choose one answer.')]),
    ]);
    const choiceA = schema.node('qtiSimpleChoice', { identifier: 'choice-a' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Option A')]),
    ]);
    const choiceB = schema.node('qtiSimpleChoice', { identifier: 'choice-b' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Option B')]),
    ]);
    const interaction = schema.node('qtiChoiceInteraction', {
      maxChoices: 1,
      class: 'single-select',
      correctResponse: 'choice-a',
      responseIdentifier: 'RESPONSE',
      score: 2,
    }, [prompt, choiceA, choiceB]);

    expect(qtiChoiceInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-choice-interaction',
      {
        'max-choices': '1',
        class: 'single-select',
        'correct-response': 'choice-a',
        'response-identifier': 'RESPONSE',
        score: '2',
      },
      0,
    ]);
  });

  it('omits `shuffle` from the serialized DOM when false', () => {
    const schema = createSchemaFromNodeSpecs(choiceInteractionDescriptor.nodeSpecs);
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Choose one answer.')]),
    ]);
    const choiceA = schema.node('qtiSimpleChoice', { identifier: 'choice-a' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Option A')]),
    ]);
    const interaction = schema.node('qtiChoiceInteraction', null, [prompt, choiceA]);

    const [, attrs] = qtiChoiceInteractionNodeSpec.toDOM?.(interaction) as [string, Record<string, string>, number];
    expect('shuffle' in attrs).toBe(false);
  });

  it('serializes `shuffle="true"` when set', () => {
    const schema = createSchemaFromNodeSpecs(choiceInteractionDescriptor.nodeSpecs);
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Choose one answer.')]),
    ]);
    const choiceA = schema.node('qtiSimpleChoice', { identifier: 'choice-a' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Option A')]),
    ]);
    const interaction = schema.node('qtiChoiceInteraction', { shuffle: true }, [prompt, choiceA]);

    const [, attrs] = qtiChoiceInteractionNodeSpec.toDOM?.(interaction) as [string, Record<string, string>, number];
    expect(attrs.shuffle).toBe('true');
  });
});
