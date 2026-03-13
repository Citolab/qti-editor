import type { ToolbarExtensionOptions, ToolbarInsertMenu } from './';
import { insertChoiceInteraction } from '@qti-editor/interactions-qti-choice';
import { insertExtendedTextInteraction } from '@qti-editor/interactions-qti-extended-text';
import { insertMatchInteraction } from '@qti-editor/interactions-qti-match';
import { insertInlineChoiceInteraction } from '@qti-editor/core/interactions';
import { insertSelectPointInteraction } from '@qti-editor/interactions-qti-select-point';

type ToolbarInsertItemsProvider = NonNullable<ToolbarExtensionOptions['getInsertItems']>;

function canInsert(view: Parameters<ToolbarInsertItemsProvider>[0], nodeType: any): boolean {
  const { $from } = view.state.selection;
  for (let d = $from.depth; d >= 0; d--) {
    const index = $from.index(d);
    if ($from.node(d).canReplaceWith(index, index, nodeType)) {
      return true;
    }
  }
  return false;
}

const getQtiToolbarItems: ToolbarInsertItemsProvider = view => {
  const schema: any = view.state.schema;
  const items = [];

  if (
    schema.nodes.qtiChoiceInteraction &&
    schema.nodes.qtiPrompt &&
    schema.nodes.qtiSimpleChoice &&
    schema.nodes.qtiPromptParagraph &&
    schema.nodes.qtiSimpleChoiceParagraph
  ) {
    const nodeType = schema.nodes.qtiChoiceInteraction;
    items.push({
      label: 'Choice Interaction',
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertChoiceInteraction(view.state, view.dispatch);
        view.focus();
      }
    });
  }

  if (schema.nodes.qtiTextEntryInteraction) {
    const nodeType = schema.nodes.qtiTextEntryInteraction;
    items.push({
      label: 'Text Entry',
      canInsert: canInsert(view, nodeType),
      command: () => {
        const node = nodeType.createAndFill({ responseIdentifier: `RESPONSE_${crypto.randomUUID()}` });
        if (node) {
          view.dispatch(view.state.tr.replaceSelectionWith(node));
          view.focus();
        }
      }
    });
  }

  if (schema.nodes.qtiSelectPointInteraction) {
    const nodeType = schema.nodes.qtiSelectPointInteraction;
    items.push({
      label: 'Select Point',
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertSelectPointInteraction(view.state, view.dispatch);
        view.focus();
      }
    });
  }

  if (schema.nodes.qtiInlineChoiceInteraction && schema.nodes.qtiInlineChoice) {
    const nodeType = schema.nodes.qtiInlineChoiceInteraction;
    items.push({
      label: 'Inline Choice',
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertInlineChoiceInteraction(view.state, view.dispatch);
        view.focus();
      }
    });
  }

  if (schema.nodes.qtiMatchInteraction && schema.nodes.qtiSimpleMatchSet && schema.nodes.qtiSimpleAssociableChoice) {
    const nodeType = schema.nodes.qtiMatchInteraction;
    items.push({
      label: 'Match Interaction',
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertMatchInteraction(view.state, view.dispatch);
        view.focus();
      }
    });
  }

  if (schema.nodes.qtiExtendedTextInteraction) {
    const nodeType = schema.nodes.qtiExtendedTextInteraction;
    items.push({
      label: 'Extended Text',
      canInsert: canInsert(view, nodeType),
      command: () => {
        insertExtendedTextInteraction(view.state, view.dispatch);
        view.focus();
      }
    });
  }

  return items;
};

export const toolbarInsertMenus: ToolbarInsertMenu[] = [
  {
    id: 'qti-interactions',
    tooltip: 'Insert QTI Interaction',
    icon: 'i-lucide-plus size-5 block',
    getItems: getQtiToolbarItems
  }
];
