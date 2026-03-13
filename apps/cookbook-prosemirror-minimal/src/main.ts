import '@qti-components/theme/item.css';
import '@qti-components/base';
import {
  insertChoiceInteraction,
  qtiChoiceEnterCommand,
  qtiChoiceInteractionNodeSpec
} from '@qti-editor/interactions-qti-choice';
import {
  insertExtendedTextInteraction,
  qtiExtendedTextInteractionNodeSpec
} from '@qti-editor/interactions-qti-extended-text';
import {
  insertInlineChoiceInteraction,
  qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceNodeSpec,
  qtiInlineChoiceParagraphNodeSpec
} from '@qti-editor/interactions-qti-inline-choice';
import {
  insertMatchInteraction,
  qtiMatchInteractionNodeSpec
} from '@qti-editor/interactions-qti-match';
import {
  imgSelectPointNodeSpec,
  insertSelectPointInteraction,
  qtiSelectPointInteractionNodeSpec
} from '@qti-editor/interactions-qti-select-point';
import { insertTextEntryInteraction, qtiTextEntryInteractionNodeSpec } from '@qti-editor/interactions-qti-text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleMatchSetNodeSpec
} from '@qti-editor/interactions-shared';
import { blockSelectPlugin } from '@qti-editor/prosemirror-block-select';
import { nodeAttrsSyncPlugin } from '@qti-editor/prosemirror-node-attrs-sync';
import { baseKeymap, toggleMark, wrapIn } from 'prosemirror-commands';
import { history } from 'prosemirror-history';
import { gapCursor } from 'prosemirror-gapcursor';
import { keymap } from 'prosemirror-keymap';
import { Dropdown, MenuItem, menuBar } from 'prosemirror-menu';
import { DOMParser as PMDOMParser, Schema } from 'prosemirror-model';
import { EditorView } from 'prosemirror-view';
import { EditorState } from 'prosemirror-state';

import type { MarkType, NodeSpec } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';
import type { EditorState as PMEditorState } from 'prosemirror-state';

type InsertAction = {
  label: string;
  command: Command;
};

const baseNodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0]
  },
  ordered_list: {
    group: 'block',
    content: 'list_item+',
    attrs: { order: { default: 1 } },
    parseDOM: [
      {
        tag: 'ol',
        getAttrs: dom => ({ order: Number((dom as HTMLOListElement).getAttribute('start') || 1) })
      }
    ],
    toDOM: node => ['ol', node.attrs.order === 1 ? {} : { start: node.attrs.order }, 0]
  },
  bullet_list: {
    group: 'block',
    content: 'list_item+',
    parseDOM: [{ tag: 'ul' }],
    toDOM: () => ['ul', 0]
  },
  list_item: {
    content: 'paragraph block*',
    parseDOM: [{ tag: 'li' }],
    toDOM: () => ['li', 0]
  }
};

const qtiNodes: Record<string, NodeSpec> = {
  qtiChoiceInteraction: qtiChoiceInteractionNodeSpec,
  qtiPromptParagraph: qtiPromptParagraphNodeSpec,
  qtiPrompt: qtiPromptNodeSpec,
  imgSelectPoint: imgSelectPointNodeSpec,
  qtiSelectPointInteraction: qtiSelectPointInteractionNodeSpec,
  qtiSimpleChoiceParagraph: qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleChoice: qtiSimpleChoiceNodeSpec,
  qtiInlineChoiceInteraction: qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceParagraph: qtiInlineChoiceParagraphNodeSpec,
  qtiInlineChoice: qtiInlineChoiceNodeSpec,
  qtiTextEntryInteraction: qtiTextEntryInteractionNodeSpec,
  qtiMatchInteraction: qtiMatchInteractionNodeSpec,
  qtiSimpleMatchSet: qtiSimpleMatchSetNodeSpec,
  qtiSimpleAssociableChoice: qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraph: qtiSimpleAssociableChoiceParagraphNodeSpec,
  qtiExtendedTextInteraction: qtiExtendedTextInteractionNodeSpec
};

function createInsertActions(): InsertAction[] {
  return [
    { label: 'Choice Interaction', command: insertChoiceInteraction },
    { label: 'Inline Choice', command: insertInlineChoiceInteraction },
    { label: 'Text Entry', command: insertTextEntryInteraction },
    { label: 'Select Point', command: insertSelectPointInteraction },
    { label: 'Match Interaction', command: insertMatchInteraction },
    { label: 'Extended Text', command: insertExtendedTextInteraction }
  ];
}

function markIsActive(state: PMEditorState, markType: MarkType): boolean {
  const { from, to, empty } = state.selection;
  if (empty) {
    return !!markType.isInSet(state.storedMarks || state.selection.$from.marks());
  }
  return state.doc.rangeHasMark(from, to, markType);
}

const root = document.querySelector<HTMLDivElement>('#editor-root');
if (!root) {
  throw new Error('Missing #editor-root');
}

const schema = new Schema({
  nodes: {
    ...baseNodes,
    ...qtiNodes
  },
  marks: {
    strong: {
      parseDOM: [
        { tag: 'strong' },
        { tag: 'b' },
        { style: 'font-weight=bold' }
      ],
      toDOM: () => ['strong', 0]
    },
    em: {
      parseDOM: [{ tag: 'i' }, { tag: 'em' }, { style: 'font-style=italic' }],
      toDOM: () => ['em', 0]
    }
  }
});

const formatItems = [
  new MenuItem({
    label: 'Bold',
    title: 'Toggle bold',
    run: toggleMark(schema.marks.strong),
    active: state => markIsActive(state, schema.marks.strong)
  }),
  new MenuItem({
    label: 'Italic',
    title: 'Toggle italic',
    run: toggleMark(schema.marks.em),
    active: state => markIsActive(state, schema.marks.em)
  }),
  new MenuItem({
    label: 'Ordered List',
    title: 'Wrap in ordered list',
    run: wrapIn(schema.nodes.ordered_list),
    enable: state => wrapIn(schema.nodes.ordered_list)(state)
  }),
  new MenuItem({
    label: 'Unordered List',
    title: 'Wrap in unordered list',
    run: wrapIn(schema.nodes.bullet_list),
    enable: state => wrapIn(schema.nodes.bullet_list)(state)
  })
];

const insertItems = createInsertActions().map(
  item =>
    new MenuItem({
      label: item.label,
      title: item.label,
      run: item.command
    })
);

const insertDropdown = new Dropdown(insertItems, {
  label: 'Insert',
  title: 'Insert interaction'
});

const host = document.createElement('div');
host.className = 'pm-host';
root.appendChild(host);

const content = document.createElement('div');
content.innerHTML = '<p></p>';

const state = EditorState.create({
  schema,
  doc: PMDOMParser.fromSchema(schema).parse(content),
  plugins: [
    menuBar({ content: [[insertDropdown], formatItems], floating: false }),
    history(),
    gapCursor(),
    blockSelectPlugin,
    nodeAttrsSyncPlugin,
    keymap({
      Enter: qtiChoiceEnterCommand
    }),
    keymap(baseKeymap)
  ]
});

new EditorView(host, { state });
