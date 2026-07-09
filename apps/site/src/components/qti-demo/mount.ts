/**
 * Landing-page demo — composition root. Mounts a real pure-ProseMirror QTI
 * editor (the `qti-prosemirror-item` shape, see `/docs/frameworks/vanilla`)
 * into the page, wired to the "Insert choice" / "Insert text entry" /
 * "Download item.xml" buttons.
 */

import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { blockSelectPlugin, nodeAttrsSyncPlugin } from '@citolab/prose-extensions/prosemirror';

import { demoSchema as schema } from './schema.js';
import { descriptors, qtiPlugins, seedDoc, exportQtiItem } from './prosemirror-qti.js';

import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import './qti.css';

const editorPlugins = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
  ...qtiPlugins,
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
  blockSelectPlugin,
  nodeAttrsSyncPlugin,
];

export function mountQtiDemo(root: ParentNode): void {
  const editorHost = root.querySelector<HTMLElement>('[data-qti-demo-editor]');
  const insertChoiceBtn = root.querySelector<HTMLButtonElement>('[data-qti-demo-insert-choice]');
  const insertTextEntryBtn = root.querySelector<HTMLButtonElement>('[data-qti-demo-insert-text-entry]');
  const downloadBtn = root.querySelector<HTMLButtonElement>('[data-qti-demo-download]');
  if (!editorHost) return;

  const view = new EditorView(editorHost, {
    state: EditorState.create({ doc: seedDoc(schema), plugins: editorPlugins }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    },
  });

  const choiceInsert = descriptors.find(d => d.tagName === 'qti-choice-interaction')?.insertCommand;
  const textEntryInsert = descriptors.find(d => d.tagName === 'qti-text-entry-interaction')?.insertCommand;

  insertChoiceBtn?.addEventListener('click', () => {
    view.focus();
    choiceInsert?.(view.state, view.dispatch, view);
  });

  insertTextEntryBtn?.addEventListener('click', () => {
    view.focus();
    textEntryInsert?.(view.state, view.dispatch, view);
  });

  downloadBtn?.addEventListener('click', () => {
    const xml = exportQtiItem(view.state.doc, schema);
    const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
    Object.assign(document.createElement('a'), { href: url, download: 'item.xml' }).click();
    URL.revokeObjectURL(url);
  });
}
