import { baseKeymap, toggleMark } from 'prosemirror-commands';
import { dropCursor } from 'prosemirror-dropcursor';
import { gapCursor } from 'prosemirror-gapcursor';
import { history, undo, redo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { blockSelectPlugin } from '@qti-editor/prosemirror-block-select';
import { nodeAttrsSyncPlugin } from '@qti-editor/prosemirror-node-attrs-sync';

import { insertInlineChoiceInteraction } from '../../components/qti-inline-choice-interaction/qti-inline-choice-interaction.commands.js';

import type { Schema } from 'prosemirror-model';
import type { Command, Plugin } from 'prosemirror-state';

export function createMarkKeymaps(schema: Schema): Plugin {
  const bindings: Record<string, Command> = {};
  if (schema.marks.bold) bindings['Mod-b'] = toggleMark(schema.marks.bold);
  if (schema.marks.italic) bindings['Mod-i'] = toggleMark(schema.marks.italic);
  return keymap(bindings);
}

export function createHistoryKeymap(): Plugin {
  return keymap({
    'Mod-z': undo,
    'Mod-Shift-z': redo,
    'Mod-y': redo,
    'Mod-Shift-l': insertInlineChoiceInteraction,
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
