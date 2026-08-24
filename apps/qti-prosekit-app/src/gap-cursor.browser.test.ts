/**
 * The gap cursor, in this app's real schema.
 *
 * Two things have to hold for the collapsed space between two interactions to be usable, and they
 * are decided in different places, so both are pinned here against the schema the editor actually
 * builds — the locked header's doc spec plus every QTI interaction.
 *
 *   REACHABLE. `GapCursor.valid` first checks the neighbours are closed, which every interaction is
 *   (`isolating`), and then guesses whether a textblock could go here by asking whether
 *   `contentMatchAt(index).defaultType` is one. In `block*` that default is `qtiItemDivider`, which
 *   is not, so the guess says no at every position and there was no gap cursor anywhere in the
 *   document. `allowGapCursor: true` on the containers overrides the guess.
 *
 *   WRITABLE, and writable into the right node. Typing goes through `replaceRange`, which wraps the
 *   text with `findWrapping` — shortest wrapping wins, ties broken by schema registration order. In
 *   this schema that order hands it to `qtiGapText` — a gap-match chip — so
 *   `defineGapCursorParagraph` names the paragraph outright. The third test below asserts the
 *   default really is wrong here, which is the whole reason the plugin is in the chain; without that
 *   assertion a future reordering could make the plugin redundant and nothing would say so.
 */
import { createEditor, union } from 'prosekit/core';
import { GapCursor } from 'prosemirror-gapcursor';
import { expect, test } from 'vitest';

import { defineItemDividerExtension } from './extensions/item-divider-extension.js';
import { defineBasicExtension } from './extensions/basic-extension.js';
import { defineLockedHeaderExtension, LOCKED_HEADER_DEFAULT_CONTENT } from './extensions/locked-header-extension.js';
import { defineQtiInteractionsExtension } from './extensions/qti-interactions-extension.js';

import type { Node as PmNode } from 'prosemirror-model';

function mount() {
  const editor = createEditor({
    // The same four the app unions for the schema; the rest of its chain is behaviour that does not
    // change the node types, and the locked header must come last because it rewrites doc content.
    extension: union(
      defineBasicExtension(),
      defineQtiInteractionsExtension(),
      defineItemDividerExtension(),
      defineLockedHeaderExtension(),
    ),
    defaultContent: LOCKED_HEADER_DEFAULT_CONTENT,
  });
  const element = document.createElement('div');
  document.body.appendChild(element);
  editor.mount(element);
  return {
    editor,
    view: (editor as unknown as { view: any }).view,
    destroy: () => {
      (editor as unknown as { view?: { destroy(): void } }).view?.destroy();
      element.remove();
    },
  };
}

/** The locked prefix, then two adjacent match interactions with nothing between them. */
function docWithTwoInteractions(schema: PmNode['type']['schema']): PmNode {
  const choice = (identifier: string, matchMax: number, label: string) =>
    schema.nodes.qtiSimpleAssociableChoice.createChecked(
      { identifier, matchMax },
      schema.nodes.qtiSimpleAssociableChoiceParagraph.createChecked(null, schema.text(label)),
    );
  const interaction = (n: number) =>
    schema.nodes.qtiMatchInteraction.createChecked({ responseIdentifier: `RESPONSE_${n}` }, [
      schema.nodes.qtiSimpleMatchSet.createChecked(null, [choice(`S${n}`, 1, 'source')]),
      schema.nodes.qtiSimpleMatchSet.createChecked(null, [choice(`T${n}`, 1, 'target')]),
    ]);
  return schema.nodes.doc.createChecked(null, [
    schema.nodes.heading.createChecked({ level: 1 }),
    schema.nodes.paragraph.createChecked(),
    schema.nodes.qtiItemDivider.createChecked({ title: '', identifier: '' }),
    interaction(1),
    interaction(2),
  ]);
}

/** Position of the boundary between the two interactions. */
function gapBetweenInteractions(doc: PmNode): number {
  let pos = 0;
  for (let i = 0; i < 4; i++) pos += doc.child(i).nodeSize;
  return pos;
}

test('the containers that hold interactions allow a gap cursor', () => {
  const { editor, destroy } = mount();
  try {
    // Without these there is no gap cursor anywhere: the defaultType guess says no everywhere.
    expect(editor.schema.nodes.doc.spec.allowGapCursor).toBe(true);
    expect(editor.schema.nodes.qtiLayoutDiv.spec.allowGapCursor).toBe(true);

    // Tables deliberately do NOT get it — no textblock may sit between two rows or two cells, so
    // there the default guess is correct and must keep denying.
    expect(editor.schema.nodes.table.spec.allowGapCursor).toBeUndefined();
    expect(editor.schema.nodes.tableRow.spec.allowGapCursor).toBeUndefined();
  } finally {
    destroy();
  }
});

test('a gap cursor is valid between two adjacent interactions', () => {
  const { editor, destroy } = mount();
  try {
    const doc = docWithTwoInteractions(editor.schema);
    const $gap = doc.resolve(gapBetweenInteractions(doc));

    expect(GapCursor.valid($gap)).toBe(true);
  } finally {
    destroy();
  }
});

test('the ProseMirror default would wrap typed text in a qtiGapText, not a paragraph', () => {
  const { editor, destroy } = mount();
  try {
    const schema = editor.schema;
    const doc = docWithTwoInteractions(schema);
    const $gap = doc.resolve(gapBetweenInteractions(doc));

    // The computation `replaceRange` performs, and therefore what typing inserts unaided.
    const wrapping = $gap.parent.contentMatchAt($gap.index()).findWrapping(schema.nodes.text);

    expect(wrapping).not.toBeNull();
    /*
     * A gap-match CHIP, from one keystroke between two interactions — `qtiGapText` is
     * `group: 'block'` and registers before `paragraph`, so it wins the tie. Loose at item-body
     * level it is not valid QTI.
     *
     * Recorded as the value it actually is rather than something milder, because the name is the
     * evidence for the plugin. Taking `qtiGapText` out of the block group (which is right on its own
     * merits) only promotes the next candidate — measured: `qtiSimpleChoiceParagraph`, then
     * `heading` — so pruning the group cannot fix this and the override is not avoidable. If this
     * assertion ever reads `paragraph`, the schema has changed enough that the plugin is redundant.
     */
    expect(wrapping![0].name).toBe('qtiGapText');
  } finally {
    destroy();
  }
});

test('typing at that gap inserts a paragraph between the interactions', () => {
  const { view, editor, destroy } = mount();
  try {
    const doc = docWithTwoInteractions(editor.schema);
    const gapPos = gapBetweenInteractions(doc);

    let state = view.state;
    state = state.apply(state.tr.replaceWith(0, state.doc.content.size, doc.content));
    state = state.apply(state.tr.setSelection(new GapCursor(state.doc.resolve(gapPos))));
    view.updateState(state);

    const handled = view.someProp('handleTextInput', (f: any) => f(view, gapPos, gapPos, 'between'));

    expect(handled).toBe(true);
    const children = [...Array(view.state.doc.childCount)].map((_, i) => view.state.doc.child(i).type.name);
    expect(children).toEqual([
      'heading',
      'paragraph',
      'qtiItemDivider',
      'qtiMatchInteraction',
      'paragraph',
      'qtiMatchInteraction',
    ]);
    expect(view.state.doc.child(4).textContent).toBe('between');
  } finally {
    destroy();
  }
});
