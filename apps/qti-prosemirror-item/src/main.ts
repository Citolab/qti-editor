/**
 * Minimal ProseMirror editor app — composition root.
 *
 * This module is deliberately ProseMirror-only: it builds the editor (state,
 * view, history, keymaps, menu bar, gap/drop cursors) and wires it into the
 * page layout from `index.html` (item `<select>`, editor pane, attributes
 * `<aside>`). The only non-core plugins it pulls in are the generic
 * attributes-panel and block-select plugins from `@qti-editor/prosemirror-plugins`.
 *
 * QTI-specific concerns are split across two siblings: `prosemirror-qti.ts`
 * owns the descriptor registry, plugins, attribute allowlist, and the QTI 3.0
 * import/export roundtrip; `schema.ts` owns the document topology (basic prose
 * nodes + lists/tables + interaction NodeSpecs, with per-name overrides). Both
 * are consumed here through narrow imports.
 */

import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark, chainCommands } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import {
  menuBar,
  MenuItem,
  Dropdown,
  liftItem,
  selectParentNodeItem,
  undoItem,
  redoItem,
  icons,
  type IconSpec,
  type MenuElement
} from 'prosemirror-menu';
import {
  splitListItem,
  liftListItem,
  sinkListItem,
  wrapInList
} from 'prosemirror-schema-list';
import {
  tableEditing,
  columnResizing,
  goToNextCell,
  addRowAfter,
  addColumnAfter,
  deleteRow,
  deleteColumn,
  deleteTable
} from 'prosemirror-tables';
import { blockSelectPlugin, nodeAttrsSyncPlugin } from '@citolab/prose-extensions/prosemirror';

import { attributesPanelPlugin } from './attributes-panel-plugin.js';
import {
  descriptors,
  editableAttrs,
  qtiPlugins,
  loadQtiItems,
  importQtiItem,
  exportQtiItem
} from './prosemirror-qti.js';
import { appSchema as schema } from './schema.js';
// EXPERIMENT: lockable qti-layout-* div wrappers (non-QTI affordance).
// The node spec is owned by schema.ts; only the plugin is imported here.
import { divLockPlugin } from './qti-layout-div.js';
// Example app-level widget: edit a selected text-entry interaction's correct
// response with a plain <textarea> (the package ships only the data model).
import { textEntryWidgetPlugin } from './text-entry-widget.js';

import 'prosemirror-view/style/prosemirror.css';
import 'prosemirror-gapcursor/style/gapcursor.css';
import 'prosemirror-menu/style/menu.css';
import 'prosemirror-tables/style/tables.css';

import type { MarkType, Node as ProseMirrorNode } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { Plugin } from 'prosemirror-state';

/**
 * Standard ProseMirror list & table editing plugins (not QTI-specific): Enter
 * splits a list item, Tab/Shift-Tab indent list items or move between table
 * cells, plus column resizing and table cell selection/editing. These sit after
 * `qtiPlugins` and before `keymap(baseKeymap)` so unhandled keys fall through.
 */
const tableListPlugins: Plugin[] = [
  keymap({
    Enter: splitListItem(schema.nodes.list_item),
    Tab: chainCommands(sinkListItem(schema.nodes.list_item), goToNextCell(1)),
    'Shift-Tab': chainCommands(liftListItem(schema.nodes.list_item), goToNextCell(-1)),
    'Mod-[': liftListItem(schema.nodes.list_item),
    'Mod-]': sinkListItem(schema.nodes.list_item)
  }),
  columnResizing(),
  tableEditing()
];

/** A mark-toggle menu item that lights up when the mark is active. */
function markItem(markType: MarkType, label: string, title: string): MenuItem {
  return new MenuItem({
    run: toggleMark(markType),
    enable: state => !state.selection.empty,
    active: state => {
      const { from, $from, to, empty } = state.selection;
      return empty
        ? !!markType.isInSet(state.storedMarks ?? $from.marks())
        : state.doc.rangeHasMark(from, to, markType);
    },
    label,
    title
  });
}

/** A command-backed menu item (icon-only) that disables itself when the command can't run. */
function cmdItem(command: Command, icon: IconSpec, title: string): MenuItem {
  return new MenuItem({ run: command, enable: state => command(state), icon, title });
}

/** Dropdown of every registered interaction (descriptors that have an insert command). */
const insertInteractionDropdown = new Dropdown(
  descriptors.map(descriptor => {
    const command = descriptor.insertCommand!;
    return new MenuItem({
      run: command,
      enable: state => command(state),
      label: descriptor.tagName,
      title: `Insert ${descriptor.tagName} interaction`
    });
  }),
  { label: 'Insert' }
);

const insertImage: Command = (state, dispatch) => {
  const src = window.prompt('Image URL');
  if (!src) return false;
  if (dispatch) dispatch(state.tr.replaceSelectionWith(schema.nodes.image.create({ src })));
  return true;
};

/** Insert a 3×3 table (first row as header cells) at the selection. */
const insertTable: Command = (state, dispatch) => {
  const { table, table_row, table_cell, table_header } = schema.nodes;
  const cells = (cell: typeof table_cell) => Array.from({ length: 3 }, () => cell.createAndFill()!);
  const rows = [
    table_row.create(null, cells(table_header)),
    table_row.create(null, cells(table_cell)),
    table_row.create(null, cells(table_cell))
  ];
  if (dispatch) dispatch(state.tr.replaceSelectionWith(table.create(null, rows)).scrollIntoView());
  return true;
};

/** A tiny menu bar: insert dropdown, marks, undo/redo, structural helpers, lists, and tables. */
const menuContent: MenuElement[][] = [
  [insertInteractionDropdown],
  [markItem(schema.marks.strong, 'B', 'Toggle bold'), markItem(schema.marks.em, 'i', 'Toggle italic')],
  [undoItem, redoItem],
  [
    cmdItem(wrapInList(schema.nodes.bullet_list), icons.bulletList, 'Wrap in bullet list'),
    cmdItem(wrapInList(schema.nodes.ordered_list), icons.orderedList, 'Wrap in ordered list'),
    cmdItem(insertImage, { text: '🖼' }, 'Insert image')
  ],
  [
    cmdItem(insertTable, { text: '\u25A6' }, 'Insert table'),
    cmdItem(addRowAfter, { text: '\u2261' }, 'Add row after'),
    cmdItem(addColumnAfter, { text: '\u2980' }, 'Add column after'),
    cmdItem(deleteRow, { text: '\u2796\u2261' }, 'Delete row'),
    cmdItem(deleteColumn, { text: '\u2796\u2980' }, 'Delete column'),
    cmdItem(deleteTable, { text: '\u2715' }, 'Delete table')
  ],
  [liftItem, selectParentNodeItem]
];

/**
 * The plugin stack shared by every editor instance. `qtiPlugins` (the choice
 * Enter keymap + interaction plugins) and `tableListPlugins` (list-split + table
 * editing) are placed before `keymap(baseKeymap)` so their overrides win and
 * unhandled keys fall through; the attributes panel plugin is added per-editor in
 * `mountEditor` since it needs the panel host element.
 */
const editorPlugins: Plugin[] = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
  ...qtiPlugins,
  // Example: textarea widget for a selected text-entry interaction's correct response.
  textEntryWidgetPlugin(),
  // EXPERIMENT: keep qti-layout-* divs immutable while their content stays editable.
  divLockPlugin,
  ...tableListPlugins,
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
const editorHost = document.querySelector<HTMLElement>('#editor-host')!;
const exportBtn = document.querySelector<HTMLButtonElement>('#export-btn')!;
const attributesPanel = document.querySelector<HTMLElement>('#attributes-panel')!;

let view: EditorView | null = null;

exportBtn.addEventListener('click', () => {
  if (!view) return;
  const xml = exportQtiItem(view.state.doc, schema);
  const url = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: 'item.xml' });
  link.click();
  URL.revokeObjectURL(url);
});

const items = await loadQtiItems();

itemList.innerHTML = items.map(item => `<option value="${item.href}">${item.identifier}</option>`).join('');

itemList.addEventListener('change', () => {
  if (itemList.value) void openItem(itemList.value);
});

async function openItem(href: string): Promise<void> {
  attributesPanel.innerHTML = '';

  const doc = await importQtiItem(href, schema);

  view?.destroy();
  editorHost.innerHTML = '';
  view = mountEditor(editorHost, doc, attributesPanel);
  exportBtn.disabled = false;
}
