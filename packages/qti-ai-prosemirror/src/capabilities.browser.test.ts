import { createQtiSchema } from '@citolab/prose-qti/schema';
import { choiceInteractionClassGroups } from '@citolab/prose-qti/components/choice';
import { extendedTextHeightClassOptions } from '@citolab/prose-qti/components/extended-text';
import { textEntryWidthClassOptions } from '@citolab/prose-qti/components/text-entry';
// prosemirror-model's DOMParser, renamed to avoid the browser global of the same name.
import { DOMParser as PmParser, DOMSerializer } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { describe, expect, test } from 'vitest';

import { acceptProposal, captureAuthoringContext, createAuthoringPlugin, prepareProposal } from './index.js';
import { applyVocabulary, attributeValueError, createCapabilities } from './capabilities.js';

/*
 * The effective manifest against the REAL QTI schema, not a toy one.
 *
 * Every interaction the editor ships is in `createQtiSchema()`. The manifest is what the agent is
 * told it may do, so it has to agree with what the schema serializes and with what the attribute
 * panels already know about class tokens.
 */

const schema = createQtiSchema();
const caps = createCapabilities(schema);
const interactions = Object.entries(caps.nodes).filter(([, n]) => n.tag.endsWith('-interaction'));

describe('effective manifest', () => {
  test('covers every interaction in the schema', () => {
    const tags = interactions.map(([, n]) => n.tag).sort();
    expect(tags).toEqual(
      [
        'qti-choice-interaction',
        'qti-extended-text-interaction',
        'qti-gap-match-interaction',
        'qti-hottext-interaction',
        'qti-inline-choice-interaction',
        'qti-match-interaction',
        'qti-match-interaction',
        'qti-order-interaction',
        'qti-select-point-interaction',
        'qti-text-entry-interaction'
      ].sort()
    );
  });

  test('HTML attribute names agree with what toDOM actually serializes', () => {
    const serializer = DOMSerializer.fromSchema(schema);
    for (const [name, node] of Object.entries(caps.nodes)) {
      const type = schema.nodes[name];
      if (!type.spec.toDOM || !type.spec.attrs) continue;
      for (const [attr, cap] of Object.entries(node.attributes)) {
        if (!cap.htmlName) continue;
        // Serialize with a probe value and check the named HTML attribute carries it.
        const probe =
          cap.type === 'boolean' ? true : cap.type === 'integer' || cap.type === 'number' ? 4242 : 'probe-value';
        let dom: HTMLElement | undefined;
        try {
          dom = serializer.serializeNode(type.create({ ...type.create().attrs, [attr]: probe })) as HTMLElement;
        } catch {
          continue; // toDOM rejected the probe for this attribute; the baseline name stands.
        }
        expect(dom.hasAttribute(cap.htmlName), `${name}.${attr} → ${cap.htmlName}`).toBe(true);
      }
    }
  });

  test('every interaction attribute has an explicit type that is not inferred from a null default', () => {
    for (const [, node] of interactions) {
      for (const [attr, cap] of Object.entries(node.attributes)) {
        expect(['string', 'integer', 'number', 'boolean', 'response', 'enum'], attr).toContain(cap.type);
        if (attr === 'correctResponse') expect(cap.type).toBe('response');
        if (['maxChoices', 'minChoices', 'maxAssociations', 'matchMax', 'expectedLength'].includes(attr)) {
          expect(cap.type, attr).toBe('integer');
          expect(cap.min, attr).toBe(0);
        }
      }
    }
  });

  test('identity and class are never directly editable; presentation goes through vocabulary', () => {
    for (const [, node] of interactions) {
      for (const attr of ['responseIdentifier', 'identifier', 'class']) {
        if (attr in node.attributes) expect(node.attributes[attr].editable, attr).toBe(false);
      }
    }
    expect(caps.nodes.qtiSimpleChoice.attributes.identifier.editable).toBe(false);
  });

  test('vocabulary agrees with the attribute panels of prose-qti', () => {
    const choice = caps.nodes.qtiChoiceInteraction.vocabulary;
    for (const group of choiceInteractionClassGroups) {
      const ours = choice.find(g => g.options.some(o => o.value === group.options[0].value));
      expect(ours, group.id).toBeTruthy();
      expect(ours!.options.map(o => o.value).sort()).toEqual(group.options.map(o => o.value).sort());
      expect(ours!.selection).toBe(group.selection);
    }
    const height = caps.nodes.qtiExtendedTextInteraction.vocabulary.find(g => g.id === 'height')!;
    expect(height.options.map(o => o.value)).toEqual([...extendedTextHeightClassOptions]);
    const width = caps.nodes.qtiTextEntryInteraction.vocabulary.find(g => g.id === 'inputWidth')!;
    for (const token of textEntryWidthClassOptions) expect(width.options.map(o => o.value)).toContain(token);
  });

  test('every vocabulary group states its rendering and export support', () => {
    for (const [, node] of interactions) {
      for (const group of node.vocabulary) {
        expect(['components', 'unverified']).toContain(group.support.rendering);
        expect(group.support.export).toBe('standard');
        expect(group.description.en.length).toBeGreaterThan(0);
        expect(group.description.nl.length).toBeGreaterThan(0);
        if (group.selection === 'boolean') expect(group.options).toHaveLength(1);
      }
    }
  });

  test('the fingerprint changes with vocabulary and attribute filtering', () => {
    const noVocab = createCapabilities(schema, { vocabulary: { qtiChoiceInteraction: [] } });
    const noScore = createCapabilities(schema, { allowAttribute: (_n, a) => a !== 'score' });
    expect(noVocab.id).not.toBe(caps.id);
    expect(noScore.id).not.toBe(caps.id);
    expect(createCapabilities(schema).id).toBe(caps.id);
  });
});

describe('typed validation', () => {
  const maxChoices = caps.nodes.qtiChoiceInteraction.attributes.maxChoices;
  const orientation = caps.nodes.qtiOrderInteraction.attributes.orientation;
  const placeholder = caps.nodes.qtiExtendedTextInteraction.attributes.placeholderText;

  test('integers reject fractions, strings, negatives and null', () => {
    expect(attributeValueError('maxChoices', maxChoices, 2)).toBeUndefined();
    expect(attributeValueError('maxChoices', maxChoices, 0)).toBeUndefined();
    expect(attributeValueError('maxChoices', maxChoices, 1.5)).toMatch(/integer/);
    expect(attributeValueError('maxChoices', maxChoices, '2')).toMatch(/integer/);
    expect(attributeValueError('maxChoices', maxChoices, -1)).toMatch(/at least 0/);
    expect(attributeValueError('maxChoices', maxChoices, null)).toMatch(/null/);
  });

  test('enums and nullable strings', () => {
    expect(attributeValueError('orientation', orientation, 'horizontal')).toBeUndefined();
    expect(attributeValueError('orientation', orientation, 'diagonal')).toMatch(/one of/);
    expect(attributeValueError('placeholderText', placeholder, null)).toBeUndefined();
    expect(attributeValueError('placeholderText', placeholder, 3)).toMatch(/string/);
  });

  test('vocabulary replacement keeps unrelated tokens and clears a group with null', () => {
    const columns = caps.nodes.qtiChoiceInteraction.vocabulary.find(g => g.id === 'columns')!;
    expect(applyVocabulary('custom qti-choices-stacking-1 qti-labels-none', columns, 'qti-choices-stacking-3')).toBe(
      'custom qti-labels-none qti-choices-stacking-3'
    );
    expect(applyVocabulary('custom qti-choices-stacking-3', columns, null)).toBe('custom');
    expect(applyVocabulary(null, columns, null)).toBeNull();
    expect(() => applyVocabulary(null, columns, 'qti-choices-stacking-9')).toThrow(/Unsupported/);
  });
});

describe('operations across interactions', () => {
  function mount(html: string) {
    const host = document.createElement('div');
    document.body.append(host);
    const container = document.createElement('div');
    container.innerHTML = html;
    const view = new EditorView(host, {
      state: EditorState.create({
        schema,
        doc: PmParser.fromSchema(schema).parse(container),
        plugins: [createAuthoringPlugin()]
      })
    });
    return { view, close: () => (view.destroy(), host.remove()) };
  }

  test('text entry width and extended text height are vocabulary operations, with typed attributes alongside', () => {
    const { view, close } = mount(
      '<p>Fill in: <qti-text-entry-interaction response-identifier="R1" correct-response="Paris" class="fancy"></qti-text-entry-interaction></p>' +
        '<qti-extended-text-interaction response-identifier="R2" expected-lines="3"></qti-extended-text-interaction>'
    );
    try {
      const context = captureAuthoringContext(view);
      const entry = context.targets.find(t => t.nodeType === 'qtiTextEntryInteraction')!;
      const extended = context.targets.find(t => t.nodeType === 'qtiExtendedTextInteraction')!;
      expect(entry, 'text entry target').toBeTruthy();
      expect(extended, 'extended text target').toBeTruthy();

      const prepared = prepareProposal(view, {
        version: 1,
        requestId: context.requestId,
        capabilityId: context.capabilityId,
        summary: 'Wider input, taller answer',
        operations: [
          { kind: 'setVocabulary', target: entry.id, group: 'inputWidth', value: 'qti-input-width-10' },
          { kind: 'setVocabulary', target: extended.id, group: 'height', value: 'qti-height-lines-6' },
          { kind: 'setAttributes', target: extended.id, attributes: { expectedLines: 6, placeholderText: 'Explain…' } }
        ],
        suggestions: []
      });
      acceptProposal(view, prepared);

      let entryNode: { attrs: Record<string, unknown> } | undefined;
      let extendedNode: { attrs: Record<string, unknown> } | undefined;
      view.state.doc.descendants(n => {
        if (n.type.name === 'qtiTextEntryInteraction') entryNode = n;
        if (n.type.name === 'qtiExtendedTextInteraction') extendedNode = n;
      });
      expect(entryNode!.attrs.class).toBe('fancy qti-input-width-10');
      expect(entryNode!.attrs.correctResponse, 'unrelated attributes untouched').toBe('Paris');
      expect(extendedNode!.attrs.class).toBe('qti-height-lines-6');
      expect(extendedNode!.attrs.expectedLines).toBe(6);
      expect(extendedNode!.attrs.placeholderText).toBe('Explain…');
    } finally {
      close();
    }
  });

  test('a wrong type or an unknown group fails the whole proposal', () => {
    const { view, close } = mount(
      '<qti-extended-text-interaction response-identifier="R2"></qti-extended-text-interaction>'
    );
    try {
      const context = captureAuthoringContext(view);
      const target = context.targets.find(t => t.nodeType === 'qtiExtendedTextInteraction')!.id;
      const base = {
        version: 1,
        requestId: context.requestId,
        capabilityId: context.capabilityId,
        summary: '',
        suggestions: []
      };
      expect(() =>
        prepareProposal(view, {
          ...base,
          operations: [{ kind: 'setAttributes', target, attributes: { expectedLines: '6' } }]
        })
      ).toThrow(/integer/);
      expect(() =>
        prepareProposal(view, {
          ...base,
          operations: [{ kind: 'setVocabulary', target, group: 'columns', value: 'qti-choices-stacking-2' }]
        })
      ).toThrow(/vocabulary group/);
      expect(() =>
        prepareProposal(view, {
          ...base,
          operations: [{ kind: 'setAttributes', target, attributes: { responseIdentifier: 'X' } }]
        })
      ).toThrow(/directly/);
    } finally {
      close();
    }
  });
});
