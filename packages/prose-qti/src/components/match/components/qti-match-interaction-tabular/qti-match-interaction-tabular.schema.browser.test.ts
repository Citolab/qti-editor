import { DOMParser as PMDOMParser, DOMSerializer } from 'prosemirror-model';
import { describe, expect, it } from 'vitest';

import { createSchemaFromNodeSpecs } from '../../../shared/test-support/schema.js';
import { matchInteractionDescriptor } from '../../descriptor.js';

const schema = createSchemaFromNodeSpecs(
  matchInteractionDescriptor.nodeSpecs,
  { baseSchemaNodeGroups: matchInteractionDescriptor.baseSchemaDependencies?.nodeGroups },
);

function parseBody(innerHtml: string) {
  const container = document.createElement('div');
  container.innerHTML = innerHtml;
  return PMDOMParser.fromSchema(schema).parse(container);
}

function serializeFirstNode(nodeName: string) {
  const prompt = schema.node('qtiPrompt', null, [
    schema.node('qtiPromptParagraph', null, [schema.text('Match characters to plays.')]),
  ]);
  const firstSet = schema.node('qtiSimpleMatchSet', null, [
    schema.node('qtiSimpleAssociableChoice', { identifier: 'C', matchMax: 1 }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Capulet')]),
    ]),
  ]);
  const secondSet = schema.node('qtiSimpleMatchSet', null, [
    schema.node('qtiSimpleAssociableChoice', { identifier: 'R', matchMax: 1 }, [
      schema.node('qtiSimpleAssociableChoiceParagraph', null, [schema.text('Romeo and Juliet')]),
    ]),
  ]);
  const node = schema.node(nodeName, {
    class: 'qti-header-hidden',
    responseIdentifier: 'RESPONSE',
    maxAssociations: 4,
    dataFirstColumnHeader: 'Character',
  }, [prompt, firstSet, secondSet]);

  return DOMSerializer.fromSchema(schema).serializeNode(node) as HTMLElement;
}

describe('qtiMatchInteractionTabularNodeSpec', () => {
  it('imports qti-match-interaction with qti-match-tabular as the tabular editor node', () => {
    const doc = parseBody(`
      <qti-match-interaction class="qti-match-tabular qti-header-hidden" response-identifier="RESPONSE" max-associations="4" data-first-column-header="Character">
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="C" match-max="1"><p>Capulet</p></qti-simple-associable-choice>
        </qti-simple-match-set>
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="R" match-max="1"><p>Romeo and Juliet</p></qti-simple-associable-choice>
        </qti-simple-match-set>
      </qti-match-interaction>
    `);

    const interaction = doc.firstChild!;
    expect(interaction.type.name).toBe('qtiMatchInteractionTabular');
    expect(interaction.attrs.class).toBe('qti-header-hidden');
    expect(interaction.attrs.responseIdentifier).toBe('RESPONSE');
    expect(interaction.attrs.maxAssociations).toBe(4);
    expect(interaction.attrs.dataFirstColumnHeader).toBe('Character');
  });

  it('keeps non-tabular match interactions on the normal editor node', () => {
    const doc = parseBody(`
      <qti-match-interaction class="some-other-class" response-identifier="RESPONSE">
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="C" match-max="1"><p>Capulet</p></qti-simple-associable-choice>
        </qti-simple-match-set>
        <qti-simple-match-set>
          <qti-simple-associable-choice identifier="R" match-max="1"><p>Romeo and Juliet</p></qti-simple-associable-choice>
        </qti-simple-match-set>
      </qti-match-interaction>
    `);

    expect(doc.firstChild!.type.name).toBe('qtiMatchInteraction');
    expect(doc.firstChild!.attrs.class).toBe('some-other-class');
  });

  it('serializes the internal editor node as qti-match-interaction-tabular', () => {
    const element = serializeFirstNode('qtiMatchInteractionTabular');

    expect(element.tagName.toLowerCase()).toBe('qti-match-interaction-tabular');
    expect(element.getAttribute('class')).toBe('qti-header-hidden');
    expect(element.getAttribute('data-first-column-header')).toBe('Character');
    expect(element.getAttribute('class')?.includes('qti-match-tabular')).toBe(false);
  });
});
