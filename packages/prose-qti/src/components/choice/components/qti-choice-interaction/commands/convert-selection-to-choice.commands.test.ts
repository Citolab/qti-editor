import { Schema } from 'prosemirror-model';
import { AllSelection, EditorState } from 'prosemirror-state';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec
} from '@citolab/prose-qti/components/shared';

import {
  canConvertListToChoiceInteraction,
  convertListToChoiceInteraction
} from './convert-selection-to-choice.commands';
import { qtiChoiceInteractionNodeSpec } from '../qti-choice-interaction.schema';

import type { NodeSpec } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

const baseNodes = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'text*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0] as const
  },
  bullet_list: {
    group: 'block',
    content: 'list_item+',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0] as const
  },
  ordered_list: {
    group: 'block',
    content: 'list_item+',
    parseDOM: [{ tag: 'ol' }],
    toDOM: () => ['ol', 0] as const
  },
  list_item: {
    content: 'paragraph',
    defining: true,
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0] as const
  }
} satisfies Record<string, NodeSpec>;

function createSchema() {
  return new Schema({
    nodes: {
      ...baseNodes,
      qtiPromptParagraph: qtiPromptParagraphNodeSpec,
      qtiPrompt: qtiPromptNodeSpec,
      qtiSimpleChoiceParagraph: qtiSimpleChoiceParagraphNodeSpec,
      qtiSimpleChoice: qtiSimpleChoiceNodeSpec,
      qtiChoiceInteraction: qtiChoiceInteractionNodeSpec
    }
  });
}

function createView(state: EditorState) {
  let currentState = state;

  const view = {
    get state() {
      return currentState;
    },
    dom: {} as HTMLElement,
    dispatch(tr) {
      currentState = currentState.apply(tr);
    },
    focus() {}
  } as Pick<EditorView, 'state' | 'dom' | 'dispatch' | 'focus'>;

  return {
    view: view as EditorView,
    getState: () => currentState
  };
}

describe('convertListToChoiceInteraction', () => {
  it('uses leading paragraph text as the prompt and converts list items into choices', () => {
    const schema = createSchema();
    let state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, schema.text('Which option is correct?')),
        schema.node('bullet_list', null, [
          schema.node('list_item', null, schema.node('paragraph', null, schema.text('Option A'))),
          schema.node('list_item', null, schema.node('paragraph', null, schema.text('Option B')))
        ])
      ])
    });

    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)));

    const { view, getState } = createView(state);

    expect(canConvertListToChoiceInteraction(view)).toBe(true);
    expect(convertListToChoiceInteraction(view)).toBe(true);

    const nextState = getState();
    const interaction = nextState.doc.firstChild;

    expect(interaction?.type.name).toBe('qtiChoiceInteraction');
    expect(interaction?.childCount).toBe(3);
    expect(interaction?.child(0).type.name).toBe('qtiPrompt');
    expect(interaction?.child(0).textContent).toBe('Which option is correct?');
    expect(interaction?.child(1).textContent).toBe('Option A');
    expect(interaction?.child(2).textContent).toBe('Option B');
  });

  it('converts an ordered list the same way as a bullet list', () => {
    const schema = createSchema();
    let state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        schema.node('ordered_list', null, [
          schema.node('list_item', null, schema.node('paragraph', null, schema.text('First'))),
          schema.node('list_item', null, schema.node('paragraph', null, schema.text('Second')))
        ])
      ])
    });

    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)));

    const { view, getState } = createView(state);

    expect(canConvertListToChoiceInteraction(view)).toBe(true);
    expect(convertListToChoiceInteraction(view)).toBe(true);

    const interaction = getState().doc.firstChild;
    expect(interaction?.type.name).toBe('qtiChoiceInteraction');
    expect(interaction?.childCount).toBe(3); // prompt + 2 choices
  });

  it('rejects selections with plain text blocks after the list', () => {
    const schema = createSchema();
    let state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, schema.text('Choose one answer.')),
        schema.node('ordered_list', null, [
          schema.node('list_item', null, schema.node('paragraph', null, schema.text('First'))),
          schema.node('list_item', null, schema.node('paragraph', null, schema.text('Second')))
        ]),
        schema.node('paragraph', null, schema.text('This explanation should not be absorbed.'))
      ])
    });

    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)));

    const { view, getState } = createView(state);

    expect(canConvertListToChoiceInteraction(view)).toBe(false);
    expect(convertListToChoiceInteraction(view)).toBe(false);
    expect(getState().doc.childCount).toBe(3);
    expect(getState().doc.firstChild?.type.name).toBe('paragraph');
  });
});
