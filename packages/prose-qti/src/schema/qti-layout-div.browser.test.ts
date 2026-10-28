/**
 * What ProseMirror puts in a layout column when it has to fill one.
 *
 * Deleting a column's only block, or creating a column with `createAndFill`, makes ProseMirror pick
 * a filler from the content expression: the first admitted type without required attributes. For
 * `block+` that is whichever `block` node sorts first in the schema — an accident of registration
 * order, not a decision. The ProseKit hosts register this node after `defineQtiExtension()`, and
 * ProseKit puts a later registration first, so there the first `block` is the layout div itself:
 * filling a column means filling a column, and it never ends.
 *
 * Built like those hosts build it, because a schema that happens to sort `paragraph` first (the
 * plain-ProseMirror `createQtiSchema`) passes on luck alone.
 */
import { createEditor, defineNodeSpec, union } from 'prosekit/core';
import { NodeSelection } from 'prosemirror-state';
import { afterEach, describe, expect, test } from 'vitest';
import { userEvent } from 'vitest/browser';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { qtiLayoutDivNodeSpec } from './qti-layout-div.js';

import type { Node as PmNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

const extension = () =>
  union(defineQtiExtension(), defineNodeSpec({ name: 'qtiLayoutDiv', ...qtiLayoutDivNodeSpec }));

const mounted: Array<{ view: EditorView; host: HTMLElement }> = [];

afterEach(() => {
  for (const { view, host } of mounted.splice(0)) {
    view.destroy();
    host.remove();
  }
});

describe('filling an empty layout column', () => {
  test('the filler is a paragraph', () => {
    const { schema } = createEditor({ extension: extension() });
    const column = schema.nodes.qtiLayoutDiv.createAndFill({ class: 'qti-layout-col6' });

    expect(column?.childCount).toBe(1);
    expect(column?.firstChild?.type.name).toBe('paragraph');
  });

  test('deleting the only block in a column leaves an empty paragraph', async () => {
    const editor = createEditor({ extension: extension() });
    const { schema } = editor;
    const host = document.createElement('div');
    document.body.appendChild(host);
    editor.mount(host);
    const view = (editor as unknown as { view: EditorView }).view;
    mounted.push({ view, host });

    const source = document.createElement('div');
    source.innerHTML = `
      <div class="qti-layout-row">
        <div class="qti-layout-col6">
          <qti-extended-text-interaction response-identifier="RESPONSE"></qti-extended-text-interaction>
        </div>
        <div class="qti-layout-col6"><p>Tekst</p></div>
      </div>`;
    editor.setContent(source.firstElementChild!.outerHTML);

    const columnOf = (doc: PmNode): PmNode => doc.child(0).child(0);
    expect(columnOf(view.state.doc).firstChild?.type.name).toBe('qtiExtendedTextInteraction');

    // Row at 0, column at 1, the interaction at 2.
    view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, 2)));
    view.focus();
    await userEvent.keyboard('{Backspace}');

    const column = columnOf(view.state.doc);
    expect(column.type.name).toBe('qtiLayoutDiv');
    expect(column.childCount).toBe(1);
    expect(column.firstChild?.type.name).toBe('paragraph');
    expect(column.textContent).toBe('');
  });
});
