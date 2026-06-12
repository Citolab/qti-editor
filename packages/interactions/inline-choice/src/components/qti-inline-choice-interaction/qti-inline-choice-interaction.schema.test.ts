import { createSchemaFromNodeSpecs } from '@qti-editor/interaction-shared/test-support/schema.js';

import { inlineChoiceInteractionDescriptor } from '../../descriptor.js';
import { qtiInlineChoiceInteractionNodeSpec } from './qti-inline-choice-interaction.schema.js';

describe('qtiInlineChoiceInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(inlineChoiceInteractionDescriptor.nodeSpecs);
    const choice = schema.node('qtiInlineChoice', null, [schema.text('Option A')]);
    const interaction = schema.node('qtiInlineChoiceInteraction', null, [choice]);

    expect(interaction.attrs).toEqual({
      responseIdentifier: null,
      shuffle: false,
      class: null,
      correctResponse: null,
      score: 1,
      dataPrompt: null,
    });
  });

  it('serializes authoring attrs to the canonical DOM attribute names', () => {
    const schema = createSchemaFromNodeSpecs(inlineChoiceInteractionDescriptor.nodeSpecs);
    const choice = schema.node('qtiInlineChoice', { identifier: 'choice-a' }, [schema.text('Option A')]);
    const interaction = schema.node('qtiInlineChoiceInteraction', {
      responseIdentifier: 'RESPONSE',
      shuffle: true,
      class: 'review-mode',
      correctResponse: 'choice-a',
      score: 3,
    }, [choice]);

    expect(qtiInlineChoiceInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-inline-choice-interaction',
      {
        'response-identifier': 'RESPONSE',
        'correct-response': 'choice-a',
        shuffle: 'true',
        class: 'review-mode',
        score: '3',
      },
      0,
    ]);
  });

  it('serializes data-prompt only when set', () => {
    const schema = createSchemaFromNodeSpecs(inlineChoiceInteractionDescriptor.nodeSpecs);
    const choice = schema.node('qtiInlineChoice', { identifier: 'choice-a' }, [schema.text('Option A')]);
    const interaction = schema.node('qtiInlineChoiceInteraction', {
      responseIdentifier: 'RESPONSE',
      dataPrompt: 'kies het juiste antwoord…',
    }, [choice]);

    expect(qtiInlineChoiceInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-inline-choice-interaction',
      {
        'response-identifier': 'RESPONSE',
        shuffle: 'false',
        score: '1',
        'data-prompt': 'kies het juiste antwoord…',
      },
      0,
    ]);
  });
});
