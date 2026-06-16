import { describe, expect, it } from 'vitest';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';

import { createInsertSiblingOnEnterCommand } from './enter';

import type { NodeSpec } from 'prosemirror-model';

// Minimal schema mirroring the choice structure: an isolating "interaction"
// block holding one-or-more textblock "item"s, plus a top-level paragraph the
// exit affordance can drop the cursor into.
const nodes = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0] as const
  },
  item: {
    content: 'inline*',
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0] as const
  },
  interaction: {
    group: 'block',
    content: 'item+',
    isolating: true,
    parseDOM: [{ tag: 'interaction' }],
    toDOM: () => ['interaction', 0] as const
  }
} satisfies Record<string, NodeSpec>;

const schema = new Schema({ nodes });

const command = createInsertSiblingOnEnterCommand({
  ancestorNodeName: 'item',
  selectionOffset: 1,
  createSiblingNode: state => state.schema.nodes.item.create(),
  createExitNode: state => state.schema.nodes.paragraph.create()
});

function stateWith(itemTexts: string[], cursorPos: number): EditorState {
  const items = itemTexts.map(text =>
    schema.node('item', null, text.length ? [schema.text(text)] : undefined)
  );
  const doc = schema.node('doc', null, [schema.node('interaction', null, items)]);
  const state = EditorState.create({ schema, doc });
  return state.apply(state.tr.setSelection(TextSelection.create(state.doc, cursorPos)));
}

function run(state: EditorState): { handled: boolean; next: EditorState } {
  let next = state;
  const handled = command(state, tr => {
    next = state.apply(tr);
  });
  return { handled, next };
}

describe('createInsertSiblingOnEnterCommand', () => {
  it('inserts a sibling item when the last item is not empty', () => {
    // interaction[ item("a"), item("b") ], cursor at end of "b" (pos 6).
    const { handled, next } = run(stateWith(['a', 'b'], 6));
    const interaction = next.doc.firstChild!;

    expect(handled).toBe(true);
    expect(interaction.childCount).toBe(3);
    expect(interaction.lastChild!.textContent).toBe('');
    // No paragraph was added after the interaction.
    expect(next.doc.childCount).toBe(1);
  });

  it('exits into a new paragraph when Enter is pressed on an empty trailing item', () => {
    // interaction[ item("a"), item("") ], cursor in the empty last item (pos 5).
    const { handled, next } = run(stateWith(['a', ''], 5));
    const interaction = next.doc.firstChild!;

    expect(handled).toBe(true);
    // The empty trailing item is removed.
    expect(interaction.childCount).toBe(1);
    expect(interaction.firstChild!.textContent).toBe('a');
    // A fresh paragraph now sits after the interaction.
    expect(next.doc.childCount).toBe(2);
    expect(next.doc.child(1).type.name).toBe('paragraph');
    expect(next.doc.child(1).textContent).toBe('');
    // The cursor jumped into that paragraph.
    expect(next.selection.$from.parent.type.name).toBe('paragraph');
    expect(next.selection.empty).toBe(true);
  });

  it('keeps the last remaining item instead of exiting (minSiblings guard)', () => {
    // interaction[ item("") ] — only child, so exiting would empty the
    // interaction. Instead a sibling item is inserted.
    const { handled, next } = run(stateWith([''], 2));
    const interaction = next.doc.firstChild!;

    expect(handled).toBe(true);
    expect(interaction.childCount).toBe(2);
    // No paragraph was added; the interaction still holds all content.
    expect(next.doc.childCount).toBe(1);
  });

  it('returns false when the selection is not inside the configured ancestor', () => {
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('hi')])]);
    const state = EditorState.create({ schema, doc });

    expect(command(state, () => {})).toBe(false);
  });
});
