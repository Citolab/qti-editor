/**
 * `qtiLayoutDivLockPlugin` and the two transactions it lets through.
 *
 * The lock rejects any transaction that changes how many layout wrappers the document holds, which
 * is right for editing and wrong for two cases: a host command that changes the layout on purpose,
 * and undo/redo of that command. Without a way through for both, a host either cannot offer a
 * layout switch at all, or offers one that cannot be undone.
 *
 * Driven through a mounted ProseKit editor with its real history plugin, because the history meta
 * is read by name and only the real plugin can prove the name is right.
 */
import { createEditor, defineNodeSpec, definePlugin, union } from 'prosekit/core';
import { afterEach, describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { QTI_LAYOUT_DIV_UNLOCK_META, qtiLayoutDivLockPlugin, qtiLayoutDivNodeSpec } from './qti-layout-div.js';

import type { Node as PmNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

const TWO_COLUMNS = `
  <div class="qti-layout-row">
    <div class="qti-layout-col6"><p>Links</p></div>
    <div class="qti-layout-col6"><p>Rechts</p></div>
  </div>`;

const mounted: Array<{ view: EditorView; host: HTMLElement }> = [];

afterEach(() => {
  for (const { view, host } of mounted.splice(0)) {
    view.destroy();
    host.remove();
  }
});

function mount() {
  const editor = createEditor({
    extension: union(
      defineQtiExtension(),
      defineNodeSpec({ name: 'qtiLayoutDiv', ...qtiLayoutDivNodeSpec }),
      definePlugin(qtiLayoutDivLockPlugin),
    ),
    defaultContent: TWO_COLUMNS,
  });
  const host = document.createElement('div');
  document.body.appendChild(host);
  editor.mount(host);
  const view = (editor as unknown as { view: EditorView }).view;
  mounted.push({ view, host });
  return { editor, view };
}

/** The classes of the layout wrappers, in document order. */
function layout(doc: PmNode): string[] {
  const classes: string[] = [];
  doc.descendants(node => {
    if (node.type.name === 'qtiLayoutDiv') classes.push(node.attrs.class as string);
    return true;
  });
  return classes;
}

/** A transaction that deletes the second column — what a "one column" layout switch would do. */
function dropSecondColumn(view: EditorView) {
  const row = view.state.doc.child(0);
  const from = 1 + row.child(0).nodeSize;
  return view.state.tr.delete(from, from + row.child(1).nodeSize);
}

const BEFORE = ['qti-layout-row', 'qti-layout-col6', 'qti-layout-col6'];
const AFTER = ['qti-layout-row', 'qti-layout-col6'];

describe('qtiLayoutDivLockPlugin', () => {
  test('rejects an unmarked transaction that removes a wrapper', () => {
    const { view } = mount();
    expect(layout(view.state.doc)).toEqual(BEFORE);

    view.dispatch(dropSecondColumn(view));

    expect(layout(view.state.doc)).toEqual(BEFORE);
  });

  test('lets a transaction marked with QTI_LAYOUT_DIV_UNLOCK_META through', () => {
    const { view } = mount();

    view.dispatch(dropSecondColumn(view).setMeta(QTI_LAYOUT_DIV_UNLOCK_META, true));

    expect(layout(view.state.doc)).toEqual(AFTER);
  });

  test('lets undo and redo of that change through', () => {
    const { editor, view } = mount();
    view.dispatch(dropSecondColumn(view).setMeta(QTI_LAYOUT_DIV_UNLOCK_META, true));

    expect(editor.commands.undo()).toBe(true);
    expect(layout(view.state.doc)).toEqual(BEFORE);
    expect(view.state.doc.textContent).toBe('LinksRechts');

    expect(editor.commands.redo()).toBe(true);
    expect(layout(view.state.doc)).toEqual(AFTER);
  });
});
