import { createQtiSchema } from '@citolab/prose-qti/schema';
// prosemirror-model's DOMParser, renamed to avoid the browser global of the same name.
import { DOMParser as PmParser, type Node as PmNode } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { describe, expect, test } from 'vitest';

import {
  acceptProposal,
  captureAuthoringContext,
  createAuthoringPlugin,
  prepareProposal,
  responseEntries
} from './index.js';

/*
 * Structural operations against the real QTI schema: removing children remaps the answer key,
 * converting an interaction keeps the response identifier and is validated for the new type.
 */

const schema = createQtiSchema();

const CHOICE =
  '<qti-choice-interaction response-identifier="RESPONSE" max-choices="2" correct-response="B,C" score="2" class="custom">' +
  '<qti-prompt><p>Which are capitals?</p></qti-prompt>' +
  '<qti-simple-choice identifier="A"><p>Lyon</p></qti-simple-choice>' +
  '<qti-simple-choice identifier="B"><p>Paris</p></qti-simple-choice>' +
  '<qti-simple-choice identifier="C"><p>Madrid</p></qti-simple-choice>' +
  '</qti-choice-interaction>';

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

function find(doc: PmNode, type: string): PmNode | undefined {
  let found: PmNode | undefined;
  doc.descendants(n => {
    if (!found && n.type.name === type) found = n;
  });
  return found;
}

function proposal(view: EditorView, operations: unknown[]) {
  const context = captureAuthoringContext(view);
  const target = (type: string, index = 0) => context.targets.filter(t => t.nodeType === type)[index]!.id;
  return {
    target,
    reply: {
      version: 1,
      requestId: context.requestId,
      capabilityId: context.capabilityId,
      summary: 'Structural',
      suggestions: [],
      operations
    }
  };
}

describe('remove', () => {
  test('removing a correct choice drops it from the answer key and keeps the rest', () => {
    const { view, close } = mount(CHOICE);
    try {
      const context = captureAuthoringContext(view);
      const choiceB = context.targets.filter(t => t.nodeType === 'qtiSimpleChoice')[1].id;
      const reply = {
        version: 1,
        requestId: context.requestId,
        capabilityId: context.capabilityId,
        summary: 'Drop Paris',
        suggestions: [],
        operations: [{ kind: 'remove', target: choiceB }]
      };
      acceptProposal(view, prepareProposal(view, reply));
      const interaction = find(view.state.doc, 'qtiChoiceInteraction')!;
      expect(interaction.childCount, 'prompt + two choices').toBe(3);
      expect(responseEntries(interaction.attrs.correctResponse)).toEqual(['C']);
      expect(interaction.attrs.class, 'unrelated attributes untouched').toBe('custom');
      expect(interaction.attrs.maxChoices).toBe(2);
    } finally {
      close();
    }
  });

  test('removing the last correct choice leaves a null answer key, not a ghost', () => {
    const { view, close } = mount(CHOICE.replace('correct-response="B,C"', 'correct-response="B"'));
    try {
      const context = captureAuthoringContext(view);
      const choiceB = context.targets.filter(t => t.nodeType === 'qtiSimpleChoice')[1].id;
      acceptProposal(
        view,
        prepareProposal(view, {
          version: 1,
          requestId: context.requestId,
          capabilityId: context.capabilityId,
          summary: '',
          suggestions: [],
          operations: [{ kind: 'remove', target: choiceB }]
        })
      );
      expect(find(view.state.doc, 'qtiChoiceInteraction')!.attrs.correctResponse).toBeNull();
    } finally {
      close();
    }
  });

  test('removing a gap drops the pairs that used it', () => {
    const { view, close } = mount(
      '<qti-gap-match-interaction response-identifier="R" correct-response="T1 G1,T2 G2" max-associations="0">' +
        '<qti-gap-text identifier="T1">sun</qti-gap-text><qti-gap-text identifier="T2">moon</qti-gap-text>' +
        '<p>The <qti-gap identifier="G1"></qti-gap> shines by day, the <qti-gap identifier="G2"></qti-gap> by night.</p>' +
        '</qti-gap-match-interaction>'
    );
    try {
      const context = captureAuthoringContext(view);
      const gap2 = context.targets.filter(t => t.nodeType === 'qtiGap')[1].id;
      acceptProposal(
        view,
        prepareProposal(view, {
          version: 1,
          requestId: context.requestId,
          capabilityId: context.capabilityId,
          summary: '',
          suggestions: [],
          operations: [{ kind: 'remove', target: gap2 }]
        })
      );
      expect(responseEntries(find(view.state.doc, 'qtiGapMatchInteraction')!.attrs.correctResponse)).toEqual(['T1 G1']);
    } finally {
      close();
    }
  });

  test('the whole item cannot be removed', () => {
    const { view, close } = mount(CHOICE);
    try {
      const { reply } = proposal(view, [{ kind: 'remove', target: 'document' }]);
      expect(() => prepareProposal(view, reply)).toThrow(/whole item/);
    } finally {
      close();
    }
  });
});

describe('convert', () => {
  const ORDER =
    '<qti-order-interaction response-identifier="WRONG" correct-response="B,C,A" shuffle="true">' +
    '<qti-prompt><p>Order the cities by population.</p></qti-prompt>' +
    '<qti-simple-choice identifier="A"><p>Lyon</p></qti-simple-choice>' +
    '<qti-simple-choice identifier="B"><p>Paris</p></qti-simple-choice>' +
    '<qti-simple-choice identifier="C"><p>Madrid</p></qti-simple-choice>' +
    '</qti-order-interaction>';

  test('choice to order keeps the response identifier and the score, validates the ordering', () => {
    const { view, close } = mount(CHOICE);
    try {
      const { target, reply } = proposal(view, []);
      reply.operations.push({
        kind: 'convert',
        target: target('qtiChoiceInteraction'),
        to: 'qtiOrderInteraction',
        html: ORDER
      });
      const prepared = prepareProposal(view, reply);
      expect(prepared.changes[0]).toContain('convert → qtiOrderInteraction');
      acceptProposal(view, prepared);
      expect(find(view.state.doc, 'qtiChoiceInteraction')).toBeUndefined();
      const order = find(view.state.doc, 'qtiOrderInteraction')!;
      expect(order.attrs.responseIdentifier, 'identifier of the item, not of the model').toBe('RESPONSE');
      expect(responseEntries(order.attrs.correctResponse)).toEqual(['B', 'C', 'A']);
      expect(order.attrs.score, 'score carried from the source').toBe(2);
      expect(order.attrs.shuffle).toBe(true);
    } finally {
      close();
    }
  });

  test('an order response that is not a full permutation is refused', () => {
    const { view, close } = mount(CHOICE);
    try {
      const { target, reply } = proposal(view, []);
      reply.operations.push({
        kind: 'convert',
        target: target('qtiChoiceInteraction'),
        to: 'qtiOrderInteraction',
        html: ORDER.replace('correct-response="B,C,A"', 'correct-response="B,C"')
      });
      expect(() => prepareProposal(view, reply)).toThrow(/every choice exactly once/);
    } finally {
      close();
    }
  });

  test('the produced type must match, be an interaction, and differ from the source', () => {
    const { view, close } = mount(CHOICE);
    try {
      const { target, reply } = proposal(view, []);
      const t = target('qtiChoiceInteraction');
      expect(() =>
        prepareProposal(view, {
          ...reply,
          operations: [{ kind: 'convert', target: t, to: 'qtiTextEntryInteraction', html: ORDER }]
        })
      ).toThrow(/exactly one qtiTextEntryInteraction/);
      expect(() =>
        prepareProposal(view, {
          ...reply,
          operations: [{ kind: 'convert', target: t, to: 'paragraph', html: '<p>Just text</p>' }]
        })
      ).toThrow(/exactly one paragraph/);
      expect(() =>
        prepareProposal(view, {
          ...reply,
          operations: [{ kind: 'convert', target: t, to: 'qtiChoiceInteraction', html: CHOICE }]
        })
      ).toThrow(/different interaction type/);
      expect(() =>
        prepareProposal(view, {
          ...reply,
          operations: [{ kind: 'convert', target: t, to: 'qtiOrderInteraction', html: ORDER + '<p>extra</p>' }]
        })
      ).toThrow(/exactly one/);
    } finally {
      close();
    }
  });

  test('choice to text entry inside a paragraph keeps the identifier; a paragraph cannot be converted', () => {
    const { view, close } = mount(CHOICE);
    try {
      const { target, reply } = proposal(view, []);
      // A text entry is inline, so the conversion target is the interaction and the result is one
      // block that carries the inline interaction. That is a replace with a wrapper, which convert
      // deliberately refuses: the model must aim `to` at the node it produces.
      expect(() =>
        prepareProposal(view, {
          ...reply,
          operations: [
            {
              kind: 'convert',
              target: target('qtiChoiceInteraction'),
              to: 'qtiTextEntryInteraction',
              html: '<p>Capital: <qti-text-entry-interaction response-identifier="X" correct-response="Paris"></qti-text-entry-interaction></p>'
            }
          ]
        })
      ).toThrow(/exactly one qtiTextEntryInteraction/);
    } finally {
      close();
    }
  });
});
