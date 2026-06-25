import { createSchemaFromNodeSpecs } from '../../../shared/test-support/schema.js';
import { gapMatchInteractionDescriptor } from '../../descriptor.js';
import { qtiGapMatchInteractionNodeSpec } from './qti-gap-match-interaction.schema.js';

describe('qtiGapMatchInteractionNodeSpec', () => {
  it('applies stable default authoring attrs', () => {
    const schema = createSchemaFromNodeSpecs(gapMatchInteractionDescriptor.nodeSpecs);
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Fill in the gaps.')]),
    ]);
    
    const gapText1 = schema.node('qtiGapText', { identifier: 'gap-1' }, [schema.text('dog')]);
    const gapText2 = schema.node('qtiGapText', { identifier: 'gap-2' }, [schema.text('cat')]);
    
    const gap1 = schema.node('qtiGap', { identifier: 'gap-a' });
    
    const paragraph = schema.node('paragraph', null, [
      schema.text('The '),
      gap1,
      schema.text(' barks.'),
    ]);
    
    const interaction = schema.node('qtiGapMatchInteraction', null, [prompt, gapText1, gapText2, paragraph]);

    expect(interaction.attrs).toEqual({
      maxAssociations: 0,
      shuffle: false,
      class: null,
      correctResponse: null,
      responseIdentifier: null,
      score: 1,
    });
  });

  it('serializes authoring attrs to the canonical DOM attribute names', () => {
    const schema = createSchemaFromNodeSpecs(gapMatchInteractionDescriptor.nodeSpecs);
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Drag words into the gaps.')]),
    ]);
    
    const gapText1 = schema.node('qtiGapText', { identifier: 'word-1' }, [schema.text('noun')]);
    const gapText2 = schema.node('qtiGapText', { identifier: 'word-2' }, [schema.text('verb')]);
    
    const gap1 = schema.node('qtiGap', { identifier: 'gap-1' });
    const gap2 = schema.node('qtiGap', { identifier: 'gap-2' });
    
    const paragraph = schema.node('paragraph', null, [
      schema.text('A '),
      gap1,
      schema.text(' is a '),
      gap2,
      schema.text('.'),
    ]);
    
    const interaction = schema.node('qtiGapMatchInteraction', {
      maxAssociations: 2,
      shuffle: true,
      class: 'fill-in-blank',
      correctResponse: '["word-1 gap-1","word-2 gap-2"]',
      responseIdentifier: 'RESPONSE',
      score: 3,
    }, [prompt, gapText1, gapText2, paragraph]);

    expect(qtiGapMatchInteractionNodeSpec.toDOM?.(interaction)).toEqual([
      'qti-gap-match-interaction',
      {
        'max-associations': '2',
        shuffle: 'true',
        class: 'fill-in-blank',
        'correct-response': '["word-1 gap-1","word-2 gap-2"]',
        'response-identifier': 'RESPONSE',
        score: '3',
      },
      0,
    ]);
  });

  it('serializes multiple gap associations correctly', () => {
    const schema = createSchemaFromNodeSpecs(gapMatchInteractionDescriptor.nodeSpecs);
    
    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Fill the gaps.')]),
    ]);
    
    const gapText1 = schema.node('qtiGapText', { identifier: 'a' }, [schema.text('A')]);
    const gapText2 = schema.node('qtiGapText', { identifier: 'b' }, [schema.text('B')]);
    
    const gap1 = schema.node('qtiGap', { identifier: 'gap-1' });
    const gap2 = schema.node('qtiGap', { identifier: 'gap-2' });
    const gap3 = schema.node('qtiGap', { identifier: 'gap-3' });
    
    const paragraph = schema.node('paragraph', null, [
      gap1,
      schema.text(' '),
      gap2,
      schema.text(' '),
      gap3,
    ]);
    
    // Multiple associations: a→gap-1, b→gap-2, a→gap-3 (same gap text in multiple gaps)
    const interaction = schema.node('qtiGapMatchInteraction', {
      correctResponse: '["a gap-1","b gap-2","a gap-3"]',
      responseIdentifier: 'RESPONSE',
      score: 2,
    }, [prompt, gapText1, gapText2, paragraph]);

    const dom = qtiGapMatchInteractionNodeSpec.toDOM?.(interaction);
    expect(dom).toBeDefined();
    const [, attrs] = dom as [string, Record<string, string>, number];
    
    // Verify the correct response is preserved
    expect(attrs['correct-response']).toBe('["a gap-1","b gap-2","a gap-3"]');
  });

  it('emits max-associations="0" by default and never emits min-associations', () => {
    const schema = createSchemaFromNodeSpecs(gapMatchInteractionDescriptor.nodeSpecs);

    const prompt = schema.node('qtiPrompt', null, [
      schema.node('qtiPromptParagraph', null, [schema.text('Fill gaps.')]),
    ]);

    const gapText1 = schema.node('qtiGapText', { identifier: 'word1' }, [schema.text('word1')]);
    const gapText2 = schema.node('qtiGapText', { identifier: 'word2' }, [schema.text('word2')]);
    const gap = schema.node('qtiGap', { identifier: 'gap' });
    const paragraph = schema.node('paragraph', null, [gap]);

    const interaction = schema.node('qtiGapMatchInteraction', null, [prompt, gapText1, gapText2, paragraph]);

    const dom = qtiGapMatchInteractionNodeSpec.toDOM?.(interaction);
    const [, attrs] = dom as [string, Record<string, string>, number];

    expect(attrs['max-associations']).toBe('0');
    expect(attrs['min-associations']).toBeUndefined();
  });
});
