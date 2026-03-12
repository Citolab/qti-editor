import { baseKeymap, toggleMark, undo, redo } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { blockSelectPlugin } from '@qti-editor/prosemirror-block-select';
import { nodeAttrsSyncPlugin } from '@qti-editor/prosemirror-node-attrs-sync';

import type { Schema } from 'prosemirror-model';
import type { Plugin } from 'prosemirror-state';
import { insertChoiceInteraction } from '../../components/qti-choice-interaction/qti-choice-interaction.commands.js';

export function createMarkKeymaps(schema: Schema): Plugin {
  const bindings: Record<string, unknown> = {};
  if (schema.marks.bold) bindings['Mod-b'] = toggleMark(schema.marks.bold);
  if (schema.marks.italic) bindings['Mod-i'] = toggleMark(schema.marks.italic);
  return keymap(bindings);
}

export function createHistoryKeymap(): Plugin {
  return keymap({
    'Mod-z': undo,
    'Mod-Shift-z': redo,
    'Mod-y': redo,
    'Mod-Shift-c': insertChoiceInteraction,
  });
}

export function createBasePlugins(schema: Schema): Plugin[] {
  return [
    history(),
    createHistoryKeymap(),
    createMarkKeymaps(schema),
    gapCursor(),
    dropCursor(),
    keymap(baseKeymap),
    blockSelectPlugin,
    nodeAttrsSyncPlugin,
  ];
}
