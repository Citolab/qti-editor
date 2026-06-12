/**
 * Editor plugins — keymaps, history, gap/drop cursors, the menu bar, and the
 * interaction descriptors' own plugins.
 *
 * The `attributesPanelPlugin` is intentionally NOT included here; it is added
 * per-editor in `editor.ts` because it needs the panel host element.
 */

import { type Plugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { menuBar, MenuItem, liftItem, selectParentNodeItem, undoItem, redoItem, type MenuElement } from 'prosemirror-menu';
import { blockSelectPlugin } from '@qti-editor/prosemirror-plugins';
import { choiceInteractionDescriptor } from '@qti-editor/interaction-choice';

import { schema, descriptors } from './schema.js';

import type { MarkType } from 'prosemirror-model';

/** Enter inserts a new sibling choice; falls back to the base behaviour elsewhere. */
const enterCommand = choiceInteractionDescriptor.enterCommand ?? baseKeymap.Enter;

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

/** The plugin stack shared by every editor instance. */
export const editorPlugins: Plugin[] = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo }),
  keymap({ Enter: enterCommand }),
  keymap(baseKeymap),
  ...descriptors.flatMap(descriptor => descriptor.pluginFactories?.map(factory => factory()) ?? []),
  dropCursor(),
  gapCursor(),
  menuBar({ content: menuContent }),
  blockSelectPlugin
];
