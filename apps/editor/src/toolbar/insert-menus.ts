import type { ToolbarExtensionOptions, ToolbarInsertMenu } from '@qti-editor/plugin-toolbar';

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
    schema.nodes.paragraph
  ) {
    const nodeType = schema.nodes.qtiChoiceInteraction;
    items.push({
      label: 'Choice Interaction',
      canInsert: canInsert(view, nodeType),
      command: () => {
        const s = schema;
        const node = nodeType.create({ responseIdentifier: `RESPONSE_${Date.now()}` }, [
          s.nodes.qtiPrompt.create({}, s.nodes.paragraph.create({}, s.text('Enter your question here...'))),
          s.nodes.qtiSimpleChoice.create({ identifier: 'A' }, s.text('Option A')),
          s.nodes.qtiSimpleChoice.create({ identifier: 'B' }, s.text('Option B'))
        ]);
        view.dispatch(view.state.tr.replaceSelectionWith(node));
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
        const node = nodeType.createAndFill({ responseIdentifier: `RESPONSE_${Date.now()}` });
        if (node) {
          view.dispatch(view.state.tr.replaceSelectionWith(node));
          view.focus();
        }
      }
    });
  }

  if (schema.nodes.qtiInlineChoiceInteraction) {
    const nodeType = schema.nodes.qtiInlineChoiceInteraction;
    items.push({
      label: 'Inline Choice',
      canInsert: canInsert(view, nodeType),
      command: () => {
        const node = nodeType.createAndFill({ responseIdentifier: `RESPONSE_${Date.now()}` });
        if (node) {
          view.dispatch(view.state.tr.replaceSelectionWith(node));
          view.focus();
        }
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
