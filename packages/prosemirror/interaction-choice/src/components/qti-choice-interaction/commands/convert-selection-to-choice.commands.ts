import { translateQti } from '@qti-editor/interaction-shared';

import type { Fragment, Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorView } from 'prosekit/pm/view';

type RootBlock = {
  pos: number;
  end: number;
  node: ProseMirrorNode;
};

type ConversionPlan = {
  promptText: string | null;
  blocksToReplace: RootBlock[];
  choiceContents: Array<Fragment | null>;
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

function hasOnlyTextInlineContent(node: ProseMirrorNode): boolean {
  for (let i = 0; i < node.childCount; i++) {
    if (!node.child(i).isText) return false;
  }
  return true;
}

function isPlainTextParagraph(node: ProseMirrorNode, schema: any): boolean {
  const paragraphType = schema.nodes.paragraph;
  return Boolean(paragraphType && node.type === paragraphType && hasOnlyTextInlineContent(node));
}

function isConvertibleList(node: ProseMirrorNode, schema: any): boolean {
  const paragraphType = schema.nodes.paragraph;
  const listType = schema.nodes.list;
  if (!paragraphType || !listType || node.type !== listType) {
    return false;
  }

  const listKind = node.attrs?.kind;
  if (!['bullet', 'ordered'].includes(listKind)) return false;
  if (!isFlatList(node, listType)) return false;

  for (let i = 0; i < node.childCount; i += 1) {
    const child = node.child(i);
    if (child.type !== paragraphType || !hasOnlyTextInlineContent(child)) {
      return false;
    }
  }

  return node.childCount > 0;
}

function getSelectedRootBlocks(view: EditorView): RootBlock[] {
  const { state } = view;
  const { selection } = state;
  const blocks: RootBlock[] = [];
  const seenPositions = new Set<number>();

  const addBlock = (node: ProseMirrorNode, start: number) => {
    if (seenPositions.has(start) || !node.isBlock) return;
    seenPositions.add(start);
    blocks.push({
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
    if (rootBlock) addBlock(rootBlock.node, rootBlock.start);
    return blocks;
  }

  const selectionJSON = selection.toJSON() as { type?: string };
  if (selectionJSON.type === 'node-range' && Array.isArray(selection.ranges)) {
    for (const range of selection.ranges) {
      const rootBlock = getRootBlockAt(range.$from.pos);
      if (rootBlock) addBlock(rootBlock.node, rootBlock.start);
    }
    if (blocks.length > 0) return blocks;
  }

  state.doc.forEach((node, offset) => {
    const start = offset;
    const end = start + node.nodeSize;
    const intersectsSelection = end > selection.from && start < selection.to;
    if (!intersectsSelection) return;
    addBlock(node, start);
  });

  return blocks;
}

function buildConversionPlan(blocks: RootBlock[], schema: any): ConversionPlan | null {
  if (blocks.length === 0) return null;

  // All-paragraph mode: first paragraph → prompt, rest → choices
  if (blocks.every(b => isPlainTextParagraph(b.node, schema))) {
    if (blocks.length < 2) return null;
    const [promptBlock, ...choiceBlocks] = blocks;
    return {
      promptText: promptBlock.node.textContent.trim() || null,
      blocksToReplace: blocks,
      choiceContents: choiceBlocks.map(b => b.node.content.size > 0 ? b.node.content : null),
    };
  }

  // List mode: optional leading plain-text paragraphs as prompt, then list(s)
  const promptBlocks: RootBlock[] = [];
  const listBlocks: RootBlock[] = [];
  let sawList = false;

  for (const block of blocks) {
    if (isPlainTextParagraph(block.node, schema)) {
      if (sawList) return null;
      promptBlocks.push(block);
      continue;
    }

    if (isConvertibleList(block.node, schema)) {
      sawList = true;
      listBlocks.push(block);
      continue;
    }

    return null;
  }

  if (listBlocks.length === 0) return null;

  const promptText = promptBlocks
    .map(block => block.node.textContent.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  const paragraphType = schema.nodes.paragraph;
  const choiceContents = listBlocks.flatMap(block => {
    const contents: Array<Fragment | null> = [];
    for (let i = 0; i < block.node.childCount; i += 1) {
      const child = block.node.child(i);
      if (child.type !== paragraphType) continue;
      contents.push(child.content.size > 0 ? child.content : null);
    }
    return contents;
  });

  return {
    promptText: promptText || null,
    blocksToReplace: [...promptBlocks, ...listBlocks],
    choiceContents,
  };
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

  const plan = buildConversionPlan(getSelectedRootBlocks(view), schema);
  if (!plan) return false;

  const firstBlock = plan.blocksToReplace[0];
  const lastBlock = plan.blocksToReplace[plan.blocksToReplace.length - 1];
  const $from = state.doc.resolve(firstBlock.pos);
  const $to = state.doc.resolve(lastBlock.end);

  if ($from.parent !== $to.parent) return false;

  return $from.parent.canReplaceWith($from.index(), $to.index(), interactionType);
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

  const plan = buildConversionPlan(getSelectedRootBlocks(view), schema);
  if (!plan) return false;

  const promptText = plan.promptText ?? translateQti('prompt.choice.selectOne', { target: view.dom });
  const prompt = promptType.create(null, promptParagraphType.create(null, schema.text(promptText)));

  const choices = plan.choiceContents.map(content => {
    const paragraphContent = content ?? schema.text(translateQti('choice.option', { target: view.dom }));
    return choiceType.create(
      { identifier: `SIMPLE_CHOICE_${crypto.randomUUID()}` },
      choiceParagraphType.create(null, paragraphContent)
    );
  });

  const interaction = interactionType.create(
    { responseIdentifier: `RESPONSE_${crypto.randomUUID()}`, maxChoices: 1 },
    [prompt, ...choices]
  );

  const firstBlock = plan.blocksToReplace[0];
  const lastBlock = plan.blocksToReplace[plan.blocksToReplace.length - 1];
  const $from = state.doc.resolve(firstBlock.pos);
  const $to = state.doc.resolve(lastBlock.end);
  if ($from.parent !== $to.parent || !$from.parent.canReplaceWith($from.index(), $to.index(), interactionType)) {
    return false;
  }

  const tr = state.tr;
  for (let i = plan.blocksToReplace.length - 1; i >= 0; i -= 1) {
    const block = plan.blocksToReplace[i];
    tr.delete(block.pos, block.end);
  }
  tr.insert(firstBlock.pos, interaction);

  view.dispatch(tr);
  view.focus();
  return true;
}
