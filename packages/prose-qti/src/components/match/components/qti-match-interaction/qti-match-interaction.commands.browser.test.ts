/**
 * The two match insert commands, and the class that tells them apart.
 *
 * Both variants serialise to `<qti-match-interaction>`; `qti-match-tabular` on the class is the only
 * thing in the XML that says which one it is. So the pair of commands and the pair of `parseDOM`
 * rules have to agree, and a round trip is the only assertion that actually proves it — a node
 * exported as tabular and re-imported as drag-drop would still be a valid document, just the wrong
 * question, which no shape assertion on either side alone would catch.
 *
 * Driving the commands rather than a mounted editor, for the reason given in the gap-match
 * equivalent: the question is what lands in the document.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../../integration/interactions/prosekit.js';
import { insertMatchInteraction, insertMatchInteractionTabular } from './qti-match-interaction.commands.js';

import type { Node as PmNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

/** Run an insert command on an empty document and return the interaction it produced. */
function insert(command: Command): PmNode {
  const state = EditorState.create({
    doc: schema.nodes.doc.createChecked(null, [schema.nodes.paragraph.createChecked()]),
    schema,
  });

  let next: EditorState | null = null;
  const handled = command(state, tr => {
    next = state.apply(tr);
  });
  if (!handled) throw new Error('insert command declined');
  if (!next) throw new Error('insert command claimed the position without dispatching');

  const interaction = (next as EditorState).doc.child(0);
  return interaction;
}

/** The two match sets, as `matchMax` per choice — the shape that decides radios vs checkboxes. */
function matchMaxPerSet(interaction: PmNode): number[][] {
  const sets: number[][] = [];
  interaction.forEach(child => {
    if (child.type !== schema.nodes.qtiSimpleMatchSet) return;
    const limits: number[] = [];
    child.forEach(choice => limits.push(choice.attrs.matchMax as number));
    sets.push(limits);
  });
  return sets;
}

/** Serialise to DOM and parse straight back, the way export → import does. */
function roundTrip(interaction: PmNode): PmNode {
  const doc = schema.nodes.doc.createChecked(null, [interaction]);
  const dom = DOMSerializer.fromSchema(schema).serializeFragment(doc.content) as DocumentFragment;
  const host = document.createElement('div');
  host.appendChild(dom);
  return PmDOMParser.fromSchema(schema).parse(host).child(0);
}

describe('inserting a match interaction', () => {
  test('the default variant is the drag-drop node and carries no class', () => {
    const interaction = insert(insertMatchInteraction);

    expect(interaction.type).toBe(schema.nodes.qtiMatchInteraction);
    expect(interaction.attrs.class).toBeNull();
  });

  test('the tabular variant is its own node type and carries the discriminating class', () => {
    const interaction = insert(insertMatchInteractionTabular);

    expect(interaction.type).toBe(schema.nodes.qtiMatchInteractionTabular);
    expect(interaction.attrs.class).toBe('qti-match-tabular');
  });

  test('both variants get a response identifier, a prompt and two match sets', () => {
    for (const command of [insertMatchInteraction, insertMatchInteractionTabular]) {
      const interaction = insert(command);

      expect(interaction.attrs.responseIdentifier).toMatch(/^RESPONSE_/);
      expect(interaction.child(0).type).toBe(schema.nodes.qtiPrompt);
      expect(matchMaxPerSet(interaction)).toHaveLength(2);
    }
  });

  /*
   * A source takes one answer and a target takes all of them. In the tabular grid that is what
   * renders radios rather than checkboxes, and the target limit has to equal the number of sources
   * because `insertSimpleAssociableChoiceOnEnter` gives a column added later exactly that — the
   * template and the Enter command disagreeing would mean the fourth column behaved unlike the
   * first three.
   */
  test('sources take one answer each and targets take as many as there are sources', () => {
    for (const command of [insertMatchInteraction, insertMatchInteractionTabular]) {
      const [sources, targets] = matchMaxPerSet(insert(command));

      expect(sources.every(limit => limit === 1)).toBe(true);
      expect(targets.every(limit => limit === sources.length)).toBe(true);
    }
  });
});

describe('the class survives a round trip', () => {
  test('a tabular interaction comes back tabular', () => {
    const reparsed = roundTrip(insert(insertMatchInteractionTabular));

    expect(reparsed.type).toBe(schema.nodes.qtiMatchInteractionTabular);
    expect(reparsed.attrs.class).toBe('qti-match-tabular');
  });

  test('a drag-drop interaction comes back drag-drop', () => {
    const reparsed = roundTrip(insert(insertMatchInteraction));

    expect(reparsed.type).toBe(schema.nodes.qtiMatchInteraction);
    expect(reparsed.attrs.class).toBeNull();
  });
});
