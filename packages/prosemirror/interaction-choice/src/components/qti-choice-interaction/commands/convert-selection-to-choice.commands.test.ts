import { Schema } from 'prosemirror-model';
import { AllSelection, EditorState } from 'prosemirror-state';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec
} from '@qti-editor/interaction-shared';

import {
  canConvertFlatListToChoiceInteraction,
  convertFlatListToChoiceInteraction
} from './convert-selection-to-choice.commands';
import { qtiChoiceInteractionNodeSpec } from '../qti-choice-interaction.schema';

import type { Node as ProseMirrorNode, NodeSpec } from 'prosemirror-model';
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
  list: {
    group: 'block',
    content: 'paragraph+',
    attrs: {
      kind: { default: 'bullet' }
    },
    parseDOM: [
      { tag: 'ul', getAttrs: () => ({ kind: 'bullet' }) },
      { tag: 'ol', getAttrs: () => ({ kind: 'ordered' }) }
    ],
    toDOM: (node: ProseMirrorNode) => [node.attrs.kind === 'ordered' ? 'ol' : 'ul', 0] as const
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
    dom: null,
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

describe('convertFlatListToChoiceInteraction', () => {
  it('uses leading paragraph text as the prompt and converts list items into choices', () => {
    const schema = createSchema();
    let state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, schema.text('Which option is correct?')),
        schema.node('list', { kind: 'bullet' }, [
          schema.node('paragraph', null, schema.text('Option A')),
          schema.node('paragraph', null, schema.text('Option B'))
        ])
      ])
    });

    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)));

    const { view, getState } = createView(state);

    expect(canConvertFlatListToChoiceInteraction(view)).toBe(true);
    expect(convertFlatListToChoiceInteraction(view)).toBe(true);

    const nextState = getState();
    const interaction = nextState.doc.firstChild;

    expect(interaction?.type.name).toBe('qtiChoiceInteraction');
    expect(interaction?.childCount).toBe(3);
    expect(interaction?.child(0).type.name).toBe('qtiPrompt');
    expect(interaction?.child(0).textContent).toBe('Which option is correct?');
    expect(interaction?.child(1).textContent).toBe('Option A');
    expect(interaction?.child(2).textContent).toBe('Option B');
  });

  it('rejects selections with plain text blocks after the list', () => {
    const schema = createSchema();
    let state = EditorState.create({
      schema,
      doc: schema.node('doc', null, [
        schema.node('paragraph', null, schema.text('Choose one answer.')),
        schema.node('list', { kind: 'ordered' }, [
          schema.node('paragraph', null, schema.text('First')),
          schema.node('paragraph', null, schema.text('Second'))
        ]),
        schema.node('paragraph', null, schema.text('This explanation should not be absorbed.'))
      ])
    });

    state = state.apply(state.tr.setSelection(new AllSelection(state.doc)));

    const { view, getState } = createView(state);

    expect(canConvertFlatListToChoiceInteraction(view)).toBe(false);
    expect(convertFlatListToChoiceInteraction(view)).toBe(false);
    expect(getState().doc.childCount).toBe(3);
    expect(getState().doc.firstChild?.type.name).toBe('paragraph');
  });
});
