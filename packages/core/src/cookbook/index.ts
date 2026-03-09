import type { NodeSpec } from 'prosemirror-model';
import type { Command, EditorState } from 'prosemirror-state';
import type { SidePanelNodeDetail } from '../attributes/index.js';
import {
  insertChoiceInteraction,
  qtiChoiceInteractionNodeSpec,
} from '@qti-editor/interactions-qti-choice';
import {
  imgSelectPointNodeSpec,
  insertSelectPointInteraction,
  qtiSelectPointInteractionNodeSpec,
} from '@qti-editor/interactions-qti-select-point';
import {
  insertInlineChoiceInteraction,
  qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceNodeSpec,
  qtiInlineChoiceParagraphNodeSpec,
} from '@qti-editor/interactions-qti-inline-choice';
import {
  insertTextEntryInteraction,
  qtiTextEntryInteractionNodeSpec,
} from '@qti-editor/interactions-qti-text-entry';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
} from '@qti-editor/interactions-shared';

export interface CookbookInsertAction {
  id: string;
  label: string;
  command: Command;
}

export const cookbookBaseNodes: Record<string, NodeSpec> = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0],
  },
};

export const cookbookQtiNodes: Record<string, NodeSpec> = {
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
};

export function createCookbookInsertActions(): CookbookInsertAction[] {
  return [
    { id: 'choice', label: 'Choice Interaction', command: insertChoiceInteraction },
    { id: 'inline-choice', label: 'Inline Choice', command: insertInlineChoiceInteraction },
    { id: 'text-entry', label: 'Text Entry', command: insertTextEntryInteraction },
    { id: 'select-point', label: 'Select Point', command: insertSelectPointInteraction },
  ];
}

export function collectSelectionNodesWithSchemaAttrs(state: EditorState): SidePanelNodeDetail[] {
  const nodes: SidePanelNodeDetail[] = [];
  const { selection } = state;
  const { $from } = selection;
  const selectedNode = (selection as EditorState['selection'] & { node?: any }).node;

  if (selectedNode && Object.keys(selectedNode.type.spec.attrs ?? {}).length > 0) {
    nodes.push({
      type: selectedNode.type.name,
      attrs: selectedNode.attrs,
      pos: selection.from,
    });
  }

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (Object.keys(node.type.spec.attrs ?? {}).length === 0) continue;
    const pos = $from.before(depth);
    if (nodes.some(existing => existing.pos === pos && existing.type === node.type.name)) continue;
    nodes.push({
      type: node.type.name,
      attrs: node.attrs,
      pos,
    });
  }

  return nodes;
}

