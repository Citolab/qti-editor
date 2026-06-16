import { createSchemaFromNodeSpecs } from '../../../shared/test-support/schema.js';
import { matchInteractionDescriptor } from '../../descriptor.js';
import { qtiMatchInteractionNodeSpec } from './qti-match-interaction.schema.js';

describe('qtiMatchInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(
      matchInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: matchInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Match the items.')]),
    ]);
    
    const matchSetA = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: 'source-a' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Item A')]),
      ]),
    ]);
    
    const matchSetB = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: 'target-1' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Target 1')]),
      ]),
    ]);
    
    const interaction = schema.node('qtiMatchInteraction', null, [prompt, matchSetA, matchSetB]);

    expect(interaction.attrs).toEqual({
      maxAssociations: 1,
      minAssociations: 0,
      shuffle: false,
      class: null,
      correctResponse: null,
      responseIdentifier: null,
      score: 1,
    });
  });

  it('serializes authoring attrs to the canonical DOM attribute names', () => {
    const schema = createSchemaFromNodeSpecs(
      matchInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: matchInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Match characters to plays.')]),
    ]);
    
    const matchSetA = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: 'source-a' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Hamlet')]),
      ]),
      schema.node('qtiSimpleAssociableChoice', { identifier: 'source-b' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Ophelia')]),
      ]),
    ]);
    
    const matchSetB = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: 'target-1' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Hamlet')]),
      ]),
      schema.node('qtiSimpleAssociableChoice', { identifier: 'target-2' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Macbeth')]),
      ]),
    ]);
    
    const interaction = schema.node('qtiMatchInteraction', {
      maxAssociations: 2,
      minAssociations: 1,
      shuffle: true,
      class: 'review-mode',
      correctResponse: '["source-a target-1","source-b target-1"]',
      responseIdentifier: 'RESPONSE',
      score: 3,
    }, [prompt, matchSetA, matchSetB]);

    expect(qtiMatchInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-match-interaction',
      {
        'max-associations': '2',
        'min-associations': '1',
        shuffle: 'true',
        class: 'review-mode',
        'correct-response': '["source-a target-1","source-b target-1"]',
        'response-identifier': 'RESPONSE',
        score: '3',
      },
      0,
    ]);
  });

  it('serializes multiple sources pointing to the same target correctly', () => {
    const schema = createSchemaFromNodeSpecs(
      matchInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: matchInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Match items.')]),
    ]);
    
    const matchSetA = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: 'a' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('A')]),
      ]),
      schema.node('qtiSimpleAssociableChoice', { identifier: 'b' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('B')]),
      ]),
      schema.node('qtiSimpleAssociableChoice', { identifier: 'c' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('C')]),
      ]),
    ]);
    
    const matchSetB = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: 'target-x' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('X')]),
      ]),
      schema.node('qtiSimpleAssociableChoice', { identifier: 'target-y' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Y')]),
      ]),
    ]);
    
    // Multiple sources (a, b) point to the same target (target-x)
    const interaction = schema.node('qtiMatchInteraction', {
      correctResponse: '["a target-x","b target-x","c target-y"]',
      responseIdentifier: 'RESPONSE',
      score: 2,
    }, [prompt, matchSetA, matchSetB]);

    const dom = qtiMatchInteractionNodeSpec.toDOM?.(interaction);
    expect(dom).toBeDefined();
    const [, attrs] = dom as [string, Record<string, string>, number];
    
    // Verify the JSON is preserved correctly (not corrupted by comma stripping)
    expect(attrs['correct-response']).toBe('["a target-x","b target-x","c target-y"]');
    
    // Verify it's valid JSON
    expect(() => JSON.parse(attrs['correct-response'])).not.toThrow();
    
    // Verify the parsed structure
    const parsed = JSON.parse(attrs['correct-response']);
    expect(parsed).toEqual(['a target-x', 'b target-x', 'c target-y']);
  });

  it('omits min-associations when zero', () => {
    const schema = createSchemaFromNodeSpecs(
      matchInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: matchInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Match items.')]),
    ]);
    
    const matchSetA = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: 'a' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('A')]),
      ]),
    ]);
    
    const matchSetB = schema.node('qtiSimpleMatchSet', null, [
      schema.node('qtiSimpleAssociableChoice', { identifier: '1' }, [
        schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('1')]),
      ]),
    ]);
    
    const interaction = schema.node('qtiMatchInteraction', {
      minAssociations: 0,
    }, [prompt, matchSetA, matchSetB]);

    const dom = qtiMatchInteractionNodeSpec.toDOM?.(interaction);
    const [, attrs] = dom as [string, Record<string, string>, number];
    
    expect(attrs['min-associations']).toBeUndefined();
  });
});
