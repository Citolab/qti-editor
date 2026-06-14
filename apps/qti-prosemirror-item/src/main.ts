/**
 * Minimal ProseMirror editor app — composition root.
 *
 * This module is deliberately ProseMirror-only: it builds the editor (state,
 * view, history, keymaps, menu bar, gap/drop cursors) and wires it into the
 * page layout from `index.html` (item `<select>`, editor pane, attributes
 * `<aside>`). The only non-core plugins it pulls in are the generic
 * attributes-panel and block-select plugins from `@qti-editor/prosemirror-plugins`.
 *
 * Everything QTI-specific — the interaction schema, the descriptors' plugins,
 * and the QTI 3.0 import/export roundtrip — lives in `prosemirror-qti.ts` and is
 * consumed here through a single import. That import list is the complete set of
 * touchpoints needed to add QTI interaction support (with import and export) to
 * an otherwise plain ProseMirror editor.
 */

import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { menuBar, MenuItem, liftItem, selectParentNodeItem, undoItem, redoItem, type MenuElement } from 'prosemirror-menu';
import { attributesPanelPlugin, blockSelectPlugin, nodeAttrsSyncPlugin } from '@qti-editor/prosemirror-plugins';

import { schema, editableAttrs, qtiPlugins, loadQtiItems, importQtiItem, exportQtiItem } from './prosemirror-qti.js';

import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-menu/style/menu.css';

import type { MarkType, Node as ProseMirrorNode } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';

/** A mark-toggle menu item that lights up when the mark is active. */
function markItem(markType: MarkType, label: string, title: string): MenuItem {
  return new MenuItem({
    run: toggleMark(markType),
    enable: state => !state.selection.empty,
    active: state => {
      const { from, $from, to, empty } = state.selection;
      return empty ? !!markType.isInSet(state.storedMarks ?? $from.marks()) : state.doc.rangeHasMark(from, to, markType);
    },
    label,
    title
  });
}

/** A tiny menu bar: bold/italic, undo/redo, plus lift / select-parent structural helpers. */
const menuContent: MenuElement[][] = [
  [markItem(schema.marks.strong, 'B', 'Toggle bold'), markItem(schema.marks.em, 'i', 'Toggle italic')],
  [undoItem, redoItem],
  [liftItem, selectParentNodeItem]
];

/**
 * The plugin stack shared by every editor instance. `qtiPlugins` (the choice
 * Enter keymap + interaction plugins) are placed before `keymap(baseKeymap)` so
 * the Enter override wins; the attributes panel plugin is added per-editor in
 * `mountEditor` since it needs the panel host element.
 */
const editorPlugins: Plugin[] = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
  ...qtiPlugins,
  keymap(baseKeymap),
  dropCursor(),
  gapCursor(),
  menuBar({ content: menuContent }),
  blockSelectPlugin,
  // Applies inline interaction attr edits (e.g. hottext radio clicks) that are
  // dispatched as `qti-prosemirror-node-attrs-change` events to the document.
  nodeAttrsSyncPlugin
];

/** Mount an editor for `doc` into `container`, wiring the attributes panel into `panelEl`. */
function mountEditor(container: HTMLElement, doc: ProseMirrorNode, panelEl: HTMLElement): EditorView {
  const view = new EditorView(container, {
    state: EditorState.create({
      doc,
      plugins: [...editorPlugins, attributesPanelPlugin(panelEl, { editableAttrs })]
    }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr));
    }
  });
  return view;
}

const itemList = document.querySelector<HTMLSelectElement>('#item-list')!;
const editorTitle = document.querySelector<HTMLElement>('#editor-title')!;
const editorHost = document.querySelector<HTMLElement>('#editor-host')!;
const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!;
const attributesPanel = document.querySelector<HTMLElement>('#attributes-panel')!;

let view: EditorView | null = null;

exportBtn.addEventListener('click', () => {
  if (!view) return;
  const xml = exportQtiItem(view.state.doc);
  console.dirxml(new DOMParser().parseFromString(xml, 'application/xml').documentElement);
});

const items = await loadQtiItems();

itemList.innerHTML = items
  .map(item => `<option value="${item.href}">${item.identifier}</option>`)
  .join('');

itemList.addEventListener('change', () => {
  if (itemList.value) void openItem(itemList.value);
});

async function openItem(href: string): Promise<void> {
  attributesPanel.innerHTML = '';

  const doc = await importQtiItem(href);

  view?.destroy();
  editorHost.innerHTML = '';
  view = mountEditor(editorHost, doc, attributesPanel);
  editorTitle.textContent = href;
  exportBtn.disabled = false;
}
