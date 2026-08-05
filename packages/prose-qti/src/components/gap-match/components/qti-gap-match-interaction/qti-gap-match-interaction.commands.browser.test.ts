/**
 * Backspace in the gap-match pool.
 *
 * Driving the command rather than the editor: the question is what the transaction does to the
 * document, and a mounted editor would only put a keymap and a browser between the assertion and
 * the answer. The schema is the package's own composed schema, so the shapes below are the shapes
 * the editor edits.
 */
import { createEditor } from 'prosekit/core';
import { EditorState, TextSelection } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../../integration/interactions/prosekit.js';
import { deleteGapTextOnBackspace } from './qti-gap-match-interaction.commands.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const gapText = (identifier: string, label?: string) =>
  schema.nodes.qtiGapText.createChecked(
    { identifier, matchMax: 1 },
    label ? schema.text(label) : undefined,
  );

const gap = (identifier: string) => schema.nodes.qtiGap.createChecked({ identifier });

/** A gap-match: a pool, then one sentence holding one gap. */
function buildDoc(pool: PmNode[], correctResponse: string | null = null): PmNode {
  return schema.nodes.doc.createChecked(null, [
    schema.nodes.qtiGapMatchInteraction.createChecked({ responseIdentifier: 'RESPONSE', correctResponse }, [
      ...pool,
      schema.nodes.paragraph.createChecked(null, [schema.text('before '), gap('g1'), schema.text(' after')]),
    ]),
  ]);
}

/** Put the caret at the start of the `index`-th chip in the pool. */
function caretInChip(doc: PmNode, index: number): EditorState {
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (node.type === schema.nodes.qtiGapText) positions.push(pos);
  });
  const state = EditorState.create({ doc, schema });
  // +1 steps inside the chip, which is a textblock — so this is offset 0 within it.
  return state.apply(state.tr.setSelection(TextSelection.create(doc, positions[index] + 1)));
}

/** Run Backspace and report what the pool became, or null when the command declined. */
function pressBackspace(state: EditorState): string[] | null {
  let next: EditorState | null = null;
  const handled = deleteGapTextOnBackspace(state, tr => {
    next = state.apply(tr);
  });
  if (!handled) return null;
  if (!next) throw new Error('command claimed Backspace without dispatching');

  const pool: string[] = [];
  (next as EditorState).doc.descendants(node => {
    if (node.type === schema.nodes.qtiGapText) {
      pool.push(`${node.attrs.identifier ?? 'MISSING-IDENTIFIER'}="${node.textContent}"`);
    }
  });
  return pool;
}

describe('Backspace in a gap-match chip', () => {
  test('removes the chip when it is already empty', () => {
    const state = caretInChip(buildDoc([gapText('a', 'alpha'), gapText('b')]), 1);

    // The chip goes and takes nothing with it — no replacement, no chip without an identifier.
    expect(pressBackspace(state)).toEqual(['a="alpha"']);
  });

  test('removes an empty first chip just as readily as a later one', () => {
    const state = caretInChip(buildDoc([gapText('a'), gapText('b', 'beta')]), 0);

    expect(pressBackspace(state)).toEqual(['b="beta"']);
  });

  test('declines when the chip still has words, so the default deletes a character', () => {
    const state = caretInChip(buildDoc([gapText('a', 'alpha'), gapText('b', 'beta')]), 1);

    expect(pressBackspace(state)).toBeNull();
  });

  test('declines on the last chip, which the content model requires', () => {
    // `qtiPrompt? qtiGapText+ paragraph+` — emptying the pool is not a document ProseMirror would
    // accept, so the command has to refuse rather than have the step refused underneath it.
    const state = caretInChip(buildDoc([gapText('a')]), 0);

    expect(pressBackspace(state)).toBeNull();
  });

  test('leaves the answer key to the interaction, which prunes on any removal', () => {
    const doc = buildDoc([gapText('a', 'alpha'), gapText('b')], 'b g1');
    let next: EditorState | null = null;
    deleteGapTextOnBackspace(caretInChip(doc, 1), tr => {
      next = caretInChip(doc, 1).apply(tr);
    });

    // Untouched here on purpose: pruning runs wherever a chip goes, not only on this path.
    const interaction = (next as unknown as EditorState).doc.firstChild!;
    expect(interaction.attrs.correctResponse).toBe('b g1');
  });
});
