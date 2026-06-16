import { createSchemaFromNodeSpecs } from '@citolab/prose-qti/components/shared/test-support/schema.js';

import { textEntryInteractionDescriptor } from '../../descriptor.js';
import { qtiTextEntryInteractionNodeSpec } from './qti-text-entry-interaction.schema.js';

describe('qtiTextEntryInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(textEntryInteractionDescriptor.nodeSpecs);
    const interaction = schema.node('qtiTextEntryInteraction');

    expect(interaction.attrs).toEqual({
      responseIdentifier: null,
      correctResponse: null,
      caseSensitive: false,
      class: null,
      placeholderText: null,
      score: 1,
    });
  });

  it('serializes authoring attrs to the canonical DOM attribute names', () => {
    const schema = createSchemaFromNodeSpecs(textEntryInteractionDescriptor.nodeSpecs);
    const interaction = schema.node('qtiTextEntryInteraction', {
      responseIdentifier: 'RESPONSE',
      correctResponse: 'answer',
      caseSensitive: true,
      class: 'qti-input-width-6',
      placeholderText: 'Type here',
      score: 4,
    });

    expect(qtiTextEntryInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-text-entry-interaction',
      {
        'response-identifier': 'RESPONSE',
        class: 'qti-input-width-6',
        'case-sensitive': 'true',
        'correct-response': 'answer',
        'placeholder-text': 'Type here',
        score: '4',
      },
    ]);
  });
});
