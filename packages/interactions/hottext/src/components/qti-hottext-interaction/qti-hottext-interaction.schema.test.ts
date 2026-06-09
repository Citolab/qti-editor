import { createSchemaFromNodeSpecs } from '@qti-editor/interaction-shared/test-support/schema.js';

import { hottextInteractionDescriptor } from '../../descriptor.js';
import { qtiHottextInteractionNodeSpec } from './qti-hottext-interaction.schema.js';

describe('qtiHottextInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(hottextInteractionDescriptor.nodeSpecs);
    const interaction = schema.node('qtiHottextInteraction', null, [
      schema.node('paragraph', null, [schema.text('Select the highlighted phrase.')]),
    ]);

    expect(interaction.attrs).toEqual({
      responseIdentifier: null,
      maxChoices: 1,
      minChoices: 0,
      class: null,
      correctResponse: null,
      score: 1,
    });
  });

  it('serializes authoring attrs to the canonical DOM attribute names', () => {
    const schema = createSchemaFromNodeSpecs(hottextInteractionDescriptor.nodeSpecs);
    const interaction = schema.node('qtiHottextInteraction', {
      responseIdentifier: 'RESPONSE',
      maxChoices: 2,
      minChoices: 1,
      class: 'review-mode',
      correctResponse: 'hottext-a',
      score: 3,
    }, [
      schema.node('paragraph', null, [schema.text('Select the highlighted phrase.')]),
    ]);

    expect(qtiHottextInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-hottext-interaction',
      {
        'max-choices': '2',
        'response-identifier': 'RESPONSE',
        'min-choices': '1',
        class: 'review-mode',
        'correct-response': 'hottext-a',
        score: '3',
      },
      0,
    ]);
  });
});
