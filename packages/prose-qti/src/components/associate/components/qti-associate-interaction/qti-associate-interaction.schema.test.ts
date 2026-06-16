import { createSchemaFromNodeSpecs } from '../../../shared/test-support/schema.js';
import { associateInteractionDescriptor } from '../../descriptor.js';
import { qtiAssociateInteractionNodeSpec } from './qti-associate-interaction.schema.js';

describe('qtiAssociateInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(
      associateInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: associateInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Create associations.')]),
    ]);
    
    const choiceA = schema.node('qtiSimpleAssociableChoice', { identifier: 'a' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Item A')]),
    ]);
    
    const choiceB = schema.node('qtiSimpleAssociableChoice', { identifier: 'b' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Item B')]),
    ]);
    
    const interaction = schema.node('qtiAssociateInteraction', null, [prompt, choiceA, choiceB]);

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
      associateInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: associateInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Match related items.')]),
    ]);
    
    const choiceA = schema.node('qtiSimpleAssociableChoice', { identifier: 'a' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('A')]),
    ]);
    
    const choiceB = schema.node('qtiSimpleAssociableChoice', { identifier: 'b' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('B')]),
    ]);
    
    const choiceC = schema.node('qtiSimpleAssociableChoice', { identifier: 'c' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('C')]),
    ]);
    
    const interaction = schema.node('qtiAssociateInteraction', {
      maxAssociations: 3,
      minAssociations: 1,
      shuffle: true,
      class: 'review-mode',
      correctResponse: 'a b, b c',
      responseIdentifier: 'RESPONSE',
      score: 2,
    }, [prompt, choiceA, choiceB, choiceC]);

    expect(qtiAssociateInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-associate-interaction',
      {
        'max-associations': '3',
        'min-associations': '1',
        shuffle: 'true',
        class: 'review-mode',
        'correct-response': 'a b, b c',
        'response-identifier': 'RESPONSE',
        score: '2',
      },
      0,
    ]);
  });

  it('serializes multiple associations correctly', () => {
    const schema = createSchemaFromNodeSpecs(
      associateInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: associateInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Match items.')]),
    ]);
    
    const choiceA = schema.node('qtiSimpleAssociableChoice', { identifier: 'a' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('A')]),
    ]);
    
    const choiceB = schema.node('qtiSimpleAssociableChoice', { identifier: 'b' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('B')]),
    ]);
    
    const choiceC = schema.node('qtiSimpleAssociableChoice', { identifier: 'c' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('C')]),
    ]);
    
    const choiceD = schema.node('qtiSimpleAssociableChoice', { identifier: 'd' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('D')]),
    ]);
    
    // Multiple pair associations: (a,b) (c,d) (a,c)
    const interaction = schema.node('qtiAssociateInteraction', {
      correctResponse: 'a b, c d, a c',
      responseIdentifier: 'RESPONSE',
      score: 3,
    }, [prompt, choiceA, choiceB, choiceC, choiceD]);

    const dom = qtiAssociateInteractionNodeSpec.toDOM?.(interaction);
    expect(dom).toBeDefined();
    const [, attrs] = dom as [string, Record<string, string>, number];
    
    // Verify the correct response is preserved
    expect(attrs['correct-response']).toBe('a b, c d, a c');
  });

  it('omits min-associations when zero', () => {
    const schema = createSchemaFromNodeSpecs(
      associateInteractionDescriptor.nodeSpecs,
      { baseSchemaNodeGroups: associateInteractionDescriptor.baseSchemaDependencies?.nodeGroups }
    );
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Match items.')]),
    ]);
    
    const choiceA = schema.node('qtiSimpleAssociableChoice', { identifier: 'a' }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('A')]),
    ]);
    
    const interaction = schema.node('qtiAssociateInteraction', {
      minAssociations: 0,
    }, [prompt, choiceA]);

    const dom = qtiAssociateInteractionNodeSpec.toDOM?.(interaction);
    const [, attrs] = dom as [string, Record<string, string>, number];
    
    expect(attrs['min-associations']).toBeUndefined();
  });
});
