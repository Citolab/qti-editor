/**
 * "Opmaak wissen": full reset of marks/block-type within the selection, except
 * that a spanned interaction is skipped over entirely rather than touched —
 * interaction nodes aren't reliably distinguishable from plain content by
 * schema `group` alone (see the schema notes in `create-qti-schema.ts`), so
 * the only safe rule is "never descend into one".
 */
import { createEditor } from 'prosekit/core';
import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';

import { insertChoiceInteraction } from '../components/choice/components/qti-choice-interaction/qti-choice-interaction.commands.js';
import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { clearFormatting } from './clear-formatting.commands.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

/** Build a valid choice interaction node by running the real insert command on an empty doc. */
function buildChoiceInteraction(): PmNode {
  const state = EditorState.create({
    doc: schema.nodes.doc.createChecked(null, [schema.nodes.paragraph.createChecked()]),
    schema,
  });

  let next: EditorState | null = null;
  const handled = (insertChoiceInteraction as Command)(state, tr => {
    next = state.apply(tr);
  });
  if (!handled || !next) throw new Error('insertChoiceInteraction did not dispatch');

  const interaction = (next as EditorState).doc.child(0);
  if (interaction.type !== schema.nodes.qtiChoiceInteraction) {
    throw new Error(`insertChoiceInteraction produced a ${interaction.type.name}, not the interaction node`);
  }
  return interaction;
}

function run(doc: PmNode, from: number, to: number) {
  const base = EditorState.create({ doc, schema });
  const selected = base.apply(base.tr.setSelection(TextSelection.create(doc, from, to)));

  let next: EditorState | null = null;
  const handled = clearFormatting()(selected, tr => {
    next = selected.apply(tr);
  });

  return { handled, doc: handled ? (next as EditorState).doc : selected.doc };
}

describe('clearFormatting', () => {
  test('resets a heading and strips marks across a plain selection', () => {
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.heading.createChecked({ level: 2 }, [schema.text('Title')]),
      schema.nodes.paragraph.createChecked(null, [schema.text('Bold', [schema.marks.strong.create()])]),
    ]);

    const { handled, doc: result } = run(doc, 0, doc.content.size);

    expect(handled).toBe(true);
    expect(result.childCount).toBe(2);
    expect(result.child(0).type.name).toBe('paragraph');
    expect(result.child(0).textContent).toBe('Title');
    expect(result.child(1).textContent).toBe('Bold');
    expect(result.child(1).firstChild!.marks).toHaveLength(0);
  });

  test('leaves a spanned interaction completely untouched, but still clears formatting around it', () => {
    const interaction = buildChoiceInteraction();
    const doc = schema.nodes.doc.createChecked(null, [
      schema.nodes.heading.createChecked({ level: 3 }, [schema.text('Before')]),
      interaction,
      schema.nodes.paragraph.createChecked(null, [schema.text('After', [schema.marks.strong.create()])]),
    ]);

    const { handled, doc: result } = run(doc, 0, doc.content.size);

    expect(handled).toBe(true);
    expect(result.childCount).toBe(3);
    expect(result.child(0).type.name).toBe('paragraph');
    expect(result.child(0).textContent).toBe('Before');
    expect(result.child(1).toJSON()).toEqual(interaction.toJSON());
    expect(result.child(2).type.name).toBe('paragraph');
    expect(result.child(2).firstChild!.marks).toHaveLength(0);
  });

  test('is a no-op on an empty selection', () => {
    const doc = schema.nodes.doc.createChecked(null, [schema.nodes.paragraph.createChecked(null, [schema.text('hi')])]);
    const { handled } = run(doc, 1, 1);
    expect(handled).toBe(false);
  });

  test('is a no-op when the selection is entirely inside an interaction', () => {
    const interaction = buildChoiceInteraction();
    const doc = schema.nodes.doc.createChecked(null, [interaction]);
    const { handled } = run(doc, 0, doc.content.size);
    expect(handled).toBe(false);
  });
});
