import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorView } from 'prosekit/pm/view';

type ConvertibleBlockKind = 'list' | 'paragraph';

type ConvertibleBlock = {
  kind: ConvertibleBlockKind;
  pos: number;
  end: number;
  node: ProseMirrorNode;
};

function isFlatList(listNode: ProseMirrorNode, listType: any): boolean {
  let hasNestedList = false;
  listNode.descendants((node, pos: number) => {
    if (pos > 0 && node.type === listType) {
      hasNestedList = true;
      return false;
    }
    return !hasNestedList;
  });
  return !hasNestedList;
}

function isConvertibleRootBlock(node: ProseMirrorNode, schema: any): ConvertibleBlockKind | null {
  const paragraphType = schema.nodes.paragraph;
  const listType = schema.nodes.list;
  if (paragraphType && node.type === paragraphType) {
    return 'paragraph';
  }
  if (listType && node.type === listType) {
    const listKind = node.attrs?.kind;
    if (!['bullet', 'ordered'].includes(listKind)) return null;
    if (!isFlatList(node, listType)) return null;
    return 'list';
  }
  return null;
}

function getSelectedConvertibleBlocks(view: EditorView): ConvertibleBlock[] {
  const { state } = view;
  const { selection } = state;
  const schema: any = state.schema;
  const blocks: ConvertibleBlock[] = [];
  const seenPositions = new Set<number>();

  const addBlockIfConvertible = (node: ProseMirrorNode, start: number) => {
    if (seenPositions.has(start)) return;
    const kind = isConvertibleRootBlock(node, schema);
    if (!kind) return;
    seenPositions.add(start);
    blocks.push({
      kind,
      pos: start,
      end: start + node.nodeSize,
      node,
    });
  };

  const getRootBlockAt = (pos: number): { node: ProseMirrorNode; start: number } | null => {
    const safePos = Math.max(0, Math.min(pos, state.doc.content.size));
    const nodeAtPos = state.doc.nodeAt(safePos);
    if (nodeAtPos?.isBlock) {
      return {
        node: nodeAtPos,
        start: safePos,
      };
    }

    const $pos = state.doc.resolve(safePos);
    if ($pos.depth < 1) {
      const after = $pos.nodeAfter;
      if (after?.isBlock) {
        return {
          node: after,
          start: $pos.pos,
        };
      }
      return null;
    }
    return {
      node: $pos.node(1),
      start: $pos.start(1) - 1,
    };
  };

  if (selection.empty) {
    const rootBlock = getRootBlockAt(selection.from);
    if (!rootBlock) return blocks;
    addBlockIfConvertible(rootBlock.node, rootBlock.start);
    return blocks;
  }

  // Block-select plugin uses a custom "node-range" selection with explicit block ranges.
  // Prefer those exact ranges to avoid text-range quirks across custom elements/shadow DOM.
  const selectionJSON = selection.toJSON() as { type?: string };
  if (selectionJSON.type === 'node-range' && Array.isArray(selection.ranges)) {
    for (const range of selection.ranges) {
      const rootBlock = getRootBlockAt(range.$from.pos);
      if (!rootBlock) continue;
      addBlockIfConvertible(rootBlock.node, rootBlock.start);
    }
    if (blocks.length > 0) return blocks;
  }

  state.doc.forEach((node, offset) => {
    const start = offset;
    const end = start + node.nodeSize;
    const intersectsSelection = end > selection.from && start < selection.to;
    if (!intersectsSelection) return;
    addBlockIfConvertible(node, start);
  });

  return blocks;
}

function getChoiceInlineContent(block: ConvertibleBlock, schema: any) {
  if (block.kind === 'paragraph') {
    return block.node.content;
  }

  const paragraphType = schema.nodes.paragraph;
  if (!paragraphType) return null;
  const firstChild = block.node.firstChild;
  if (firstChild && firstChild.type === paragraphType) {
    return firstChild.content;
  }
  return null;
}

export function canConvertFlatListToChoiceInteraction(view: EditorView): boolean {
  const { state } = view;
  const schema: any = state.schema;
  const interactionType = schema.nodes.qtiChoiceInteraction;
  const promptType = schema.nodes.qtiPrompt;
  const promptParagraphType = schema.nodes.qtiPromptParagraph;
  const choiceType = schema.nodes.qtiSimpleChoice;
  const choiceParagraphType = schema.nodes.qtiSimpleChoiceParagraph;

  if (!interactionType || !promptType || !promptParagraphType || !choiceType || !choiceParagraphType) {
    return false;
  }

  const selectedBlocks = getSelectedConvertibleBlocks(view);
  if (selectedBlocks.length === 0) return false;

  const firstBlock = selectedBlocks[0];
  const $pos = state.doc.resolve(firstBlock.pos);
  return $pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, interactionType);
}

export function convertFlatListToChoiceInteraction(view: EditorView): boolean {
  const { state } = view;
  const schema: any = state.schema;
  const interactionType = schema.nodes.qtiChoiceInteraction;
  const promptType = schema.nodes.qtiPrompt;
  const promptParagraphType = schema.nodes.qtiPromptParagraph;
  const choiceType = schema.nodes.qtiSimpleChoice;
  const choiceParagraphType = schema.nodes.qtiSimpleChoiceParagraph;
  if (!interactionType || !promptType || !promptParagraphType || !choiceType || !choiceParagraphType) {
    return false;
  }

  const selectedBlocks = getSelectedConvertibleBlocks(view);
  if (selectedBlocks.length === 0) return false;

  const prompt = promptType.create(
    null,
    promptParagraphType.create(null, schema.text('Select one option'))
  );

  const choices = selectedBlocks.map(block => {
    const inlineContent = getChoiceInlineContent(block, schema);
    const paragraphContent = inlineContent ?? schema.text(block.node.textContent.trim() || 'Option');

    return choiceType.create(
      { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
      choiceParagraphType.create(null, paragraphContent)
    );
  });

  const interaction = interactionType.create(
    { responseIdentifier: `RESPONSE_${crypto.randomUUID()}`, maxChoices: 1 },
    [prompt, ...choices]
  );

  const firstBlock = selectedBlocks[0];
  const $pos = state.doc.resolve(firstBlock.pos);
  if (!$pos.parent.canReplaceWith($pos.index(), $pos.index() + 1, interactionType)) {
    return false;
  }

  const tr = state.tr;
  for (let i = selectedBlocks.length - 1; i >= 0; i -= 1) {
    const block = selectedBlocks[i];
    tr.delete(block.pos, block.end);
  }
  tr.insert(firstBlock.pos, interaction);

  view.dispatch(tr);
  view.focus();
  return true;
}
