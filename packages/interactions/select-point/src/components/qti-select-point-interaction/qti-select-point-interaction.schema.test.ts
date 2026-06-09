import { Schema } from 'prosemirror-model';
import { qtiPromptParagraphNodeSpec, qtiPromptNodeSpec } from '@qti-editor/interaction-shared';

import { imgSelectPointNodeSpec } from './img-select-point.schema';
import { qtiSelectPointInteractionNodeSpec } from './qti-select-point-interaction.schema';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    text: { group: 'inline' },
    paragraph: { group: 'block', content: 'inline*' },
    qtiPromptParagraph: qtiPromptParagraphNodeSpec,
    qtiPrompt: qtiPromptNodeSpec,
    imgSelectPoint: imgSelectPointNodeSpec,
    qtiSelectPointInteraction: qtiSelectPointInteractionNodeSpec
  }
});

function elementLike(
  attrs: Record<string, string | null>,
  nestedImage?: Record<string, string | null>,
  promptText?: string
) {
  return {
    getAttribute: (name: string) => attrs[name] ?? null,
    querySelector: (selector: string) => {
      if (selector === 'qti-prompt' && promptText != null) {
        return { textContent: promptText };
      }
      if (selector === 'img' && nestedImage) {
        return {
          getAttribute: (name: string) => nestedImage[name] ?? null
        };
      }
      return null;
    }
  };
}

describe('qtiSelectPointInteractionNodeSpec', () => {
  it('parses select point interaction attributes', () => {
    const rule = qtiSelectPointInteractionNodeSpec.parseDOM?.[0];
    const attrs = rule?.getAttrs?.(
      elementLike({
        'response-identifier': 'RESPONSE_1',
        'max-choices': '3',
        'min-choices': '1',
        class: 'responsive',
        'area-mappings': '[]',
        'correct-response': '120 100'
      }) as unknown as HTMLElement
    ) as Record<string, unknown>;

    expect(attrs.responseIdentifier).toBe('RESPONSE_1');
    expect(attrs.maxChoices).toBe(3);
    expect(attrs.minChoices).toBe(1);
    expect(attrs.class).toBe('responsive');
    expect(attrs.areaMappings).toBe('[]');
    expect(attrs.correctResponse).toBe('120 100');
  });

  it('builds required qtiPrompt and imgSelectPoint children from source element', () => {
    const rule = qtiSelectPointInteractionNodeSpec.parseDOM?.[0];
    const content = rule?.getContent?.(
      elementLike(
        {
          'response-identifier': 'RESPONSE_2'
        },
        {
          src: '/assets/map.png',
          alt: 'Fallback map',
          width: '206',
          height: '280'
        },
        'Locate Edinburgh'
      ) as unknown as Node,
      schema
    );

    expect(content?.childCount).toBe(2);
    expect(content?.child(0)?.type.name).toBe('qtiPrompt');
    expect(content?.child(0)?.textContent).toBe('Locate Edinburgh');
    expect(content?.child(1)?.type.name).toBe('imgSelectPoint');
    expect(content?.child(1)?.attrs.imageSrc).toBe('/assets/map.png');
    expect(content?.child(1)?.attrs.imageAlt).toBe('Fallback map');
    expect(content?.child(1)?.attrs.imageWidth).toBe(206);
    expect(content?.child(1)?.attrs.imageHeight).toBe(280);
  });

  it('falls back to default prompt text when no qti-prompt or prompt attr exists', () => {
    const rule = qtiSelectPointInteractionNodeSpec.parseDOM?.[0];
    const content = rule?.getContent?.(elementLike({}) as unknown as Node, schema);
    expect(content?.child(0)?.textContent).toBe('Mark the correct point on the image.');
  });

  it('serializes to qti-select-point-interaction attrs only', () => {
    const node = schema.nodes.qtiSelectPointInteraction.create({
      responseIdentifier: 'RESPONSE_3',
      maxChoices: 2,
      minChoices: 0,
      areaMappings: '[]'
    }, [
      schema.nodes.qtiPrompt.create(null, schema.nodes.qtiPromptParagraph.create(null, schema.text('Prompt'))),
      schema.nodes.imgSelectPoint.create()
    ]);

    const domSpec = qtiSelectPointInteractionNodeSpec.toDOM?.(node) as [string, Record<string, string>];
    expect(domSpec[0]).toBe('qti-select-point-interaction');
    expect(domSpec[1]['response-identifier']).toBe('RESPONSE_3');
    expect(domSpec[1]['max-choices']).toBe('2');
    expect(domSpec[1]['min-choices']).toBe('0');
    expect(domSpec[1]['area-mappings']).toBe('[]');
  });

  it('is configured as an isolating block with required children', () => {
    expect(qtiSelectPointInteractionNodeSpec.group).toBe('block');
    expect(qtiSelectPointInteractionNodeSpec.content).toBe('qtiPrompt imgSelectPoint');
    expect(qtiSelectPointInteractionNodeSpec.selectable).toBe(true);
    expect(qtiSelectPointInteractionNodeSpec.isolating).toBe(true);
  });
});
