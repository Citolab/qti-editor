import { createSchemaFromNodeSpecs } from '@qti-editor/interaction-shared/test-support/schema.js';

import { orderInteractionDescriptor } from '../../descriptor.js';
import { qtiOrderInteractionNodeSpec } from './qti-order-interaction.schema.js';

describe('qtiOrderInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(orderInteractionDescriptor.nodeSpecs);
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Put the steps in order.')]),
    ]);
    const choice = schema.node('qtiSimpleChoice', null, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Step 1')]),
    ]);
    const interaction = schema.node('qtiOrderInteraction', null, [prompt, choice]);

    expect(interaction.attrs).toEqual({
      shuffle: false,
      orientation: 'vertical',
      class: null,
      correctResponse: null,
      responseIdentifier: null,
      score: 1,
    });
  });

  it('serializes only the non-default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(orderInteractionDescriptor.nodeSpecs);
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Put the steps in order.')]),
    ]);
    const choiceA = schema.node('qtiSimpleChoice', { identifier: 'choice-a' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Step 1')]),
    ]);
    const choiceB = schema.node('qtiSimpleChoice', { identifier: 'choice-b' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Step 2')]),
    ]);
    const interaction = schema.node('qtiOrderInteraction', {
      shuffle: true,
      orientation: 'horizontal',
      class: 'review-mode',
      correctResponse: '["choice-a","choice-b"]',
      responseIdentifier: 'RESPONSE',
      score: 2,
    }, [prompt, choiceA, choiceB]);

    expect(qtiOrderInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-order-interaction',
      {
        'response-identifier': 'RESPONSE',
        shuffle: 'true',
        orientation: 'horizontal',
        class: 'review-mode',
        'correct-response': '["choice-a","choice-b"]',
        score: '2',
      },
      0,
    ]);
  });

  it('handles JSON array format for correct-response', () => {
    const schema = createSchemaFromNodeSpecs(orderInteractionDescriptor.nodeSpecs);
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Put the steps in order.')]),
    ]);
    const choiceA = schema.node('qtiSimpleChoice', { identifier: 'CHOICE_123' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Step 1')]),
    ]);
    const choiceB = schema.node('qtiSimpleChoice', { identifier: 'CHOICE_456' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Step 2')]),
    ]);
    const choiceC = schema.node('qtiSimpleChoice', { identifier: 'CHOICE_789' }, [
      schema.node('qtiSimpleChoiceParagraph', null, [schema.text('Step 3')]),
    ]);

    // Test that JSON array format is preserved as-is
    const interaction = schema.node('qtiOrderInteraction', {
      correctResponse: '["CHOICE_123","CHOICE_456","CHOICE_789"]',
      responseIdentifier: 'RESPONSE',
      score: 1,
    }, [prompt, choiceA, choiceB, choiceC]);

    const dom = qtiOrderInteractionNodeSpec.toDOM?.(interaction);
    const [, domAttrs] = dom as [string, Record<string, string>, number];
    
    // Should preserve JSON array format
    expect(domAttrs['correct-response']).toBe('["CHOICE_123","CHOICE_456","CHOICE_789"]');
  });
});
