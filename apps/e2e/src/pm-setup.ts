import { Schema, type MarkSpec, type NodeSpec } from 'prosemirror-model';
import { type Plugin } from 'prosemirror-state';
import { keymap } from 'prosemirror-keymap';
import { baseKeymap } from 'prosemirror-commands';
import { history, undo, redo } from 'prosemirror-history';
import { nodes } from 'prosemirror-schema-basic';
import {
  listInteractionPluginFactories,
  listInteractionSchemaNodeSpecs,
} from '@citolab/prose-qti/core/interactions/composer';
import { blockSelectPlugin } from '@citolab/prose-extensions/block-select';

const qtiNodes: Record<string, NodeSpec> = Object.fromEntries(
  listInteractionSchemaNodeSpecs().map(({ name, spec }) => [name, spec]),
);

const editorMarks: Record<string, MarkSpec> = {
  bold: {
    parseDOM: [{ tag: 'strong' }, { tag: 'b' }],
    toDOM: () => ['strong', 0],
  },
  italic: {
    parseDOM: [{ tag: 'em' }, { tag: 'i' }],
    toDOM: () => ['em', 0],
  },
};

export const schema = new Schema({
  nodes: { ...nodes, paragraph: { ...nodes.paragraph, group: 'block richtext' }, ...qtiNodes },
  marks: editorMarks,
});

export const plugins: Plugin[] = [
  history(),
  keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Mod-Shift-z': redo }),
  keymap(baseKeymap),
  ...listInteractionPluginFactories().map(factory => factory()),
  blockSelectPlugin,
];
