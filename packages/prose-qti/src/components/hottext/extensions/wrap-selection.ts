import { Plugin, PluginKey, TextSelection } from 'prosemirror-state';

import { HOTTEXT_REMOVE_EVENT } from '../components/qti-hottext/qti-hottext.js';
import { parseCorrectResponse } from '../utils/parse-correct-response.js';

import type { Fragment } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

export const HOTTEXT_WRAP_SELECTION_EVENT = 'qti:hottext:wrap-selection';

const hottextWrapSelectionPluginKey = new PluginKey('hottext-wrap-selection');

function findInteractionNodePos(view: EditorView, interactionElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;

  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;
    if (node.type.name !== 'qtiHottextInteraction') return true;

    const domNode = view.nodeDOM(pos);
    if (domNode === interactionElement || (domNode instanceof Node && domNode.contains(interactionElement))) {
      foundPos = pos;
      return false;
    }

    return true;
  });

  return foundPos;
}

function isTextOnlyFragment(fragment: Fragment): boolean {
  for (let index = 0; index < fragment.childCount; index += 1) {
    const child = fragment.child(index);
    if (!child.isText) {
      return false;
    }
  }

  return fragment.childCount > 0;
}

function selectionHasAncestor(state: EditorView['state'], nodeTypeName: string): boolean {
  const { $from, $to } = state.selection;

  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeTypeName) {
      return true;
    }
  }

  for (let depth = $to.depth; depth >= 0; depth -= 1) {
    if ($to.node(depth).type.name === nodeTypeName) {
      return true;
    }
  }

  return false;
}

function wrapSelectedTextAsHottext(view: EditorView, interactionElement: HTMLElement): boolean {
  const { state, dispatch } = view;
  const hottextType = state.schema.nodes.qtiHottext;
  if (!hottextType || state.selection.empty) {
    return false;
  }

  const interactionPos = findInteractionNodePos(view, interactionElement);
  if (interactionPos == null) {
    return false;
  }

  const interactionNode = state.doc.nodeAt(interactionPos);
  if (!interactionNode) {
    return false;
  }

  const interactionStart = interactionPos + 1;
  const interactionEnd = interactionPos + interactionNode.nodeSize - 1;
  if (state.selection.from < interactionStart || state.selection.to > interactionEnd) {
    return false;
  }

  if (selectionHasAncestor(state, 'qtiHottext')) {
    return false;
  }

  const { $from, $to } = state.selection;

  // Selection must be within a single paragraph — can't wrap across block boundaries
  if ($from.parent !== $to.parent) {
    return false;
  }

  // Extract the inline content directly from the parent node to avoid paragraph wrappers
  const inlineContent = $from.parent.content.cut($from.parentOffset, $to.parentOffset);
  if (!isTextOnlyFragment(inlineContent)) {
    return false;
  }

  const hottextNode = hottextType.create(
    { identifier: `HOTTEXT_${crypto.randomUUID()}` },
    inlineContent,
  );

  const tr = state.tr.replaceRangeWith(state.selection.from, state.selection.to, hottextNode);
  tr.setSelection(
    TextSelection.create(
      tr.doc,
      state.selection.from + 1,
      state.selection.from + hottextNode.nodeSize - 1,
    ),
  ).scrollIntoView();
  dispatch(tr);
  return true;
}

function findHottextNodePos(view: EditorView, hottextElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;

  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;
    if (node.type.name !== 'qtiHottext') return true;

    const domNode = view.nodeDOM(pos);
    if (domNode === hottextElement || (domNode instanceof Node && domNode.contains(hottextElement))) {
      foundPos = pos;
      return false;
    }

    return true;
  });

  return foundPos;
}

function unwrapHottext(view: EditorView, hottextElement: HTMLElement): boolean {
  const hottextPos = findHottextNodePos(view, hottextElement);
  if (hottextPos == null) {
    return false;
  }

  const { state, dispatch } = view;
  const hottextNode = state.doc.nodeAt(hottextPos);
  if (!hottextNode || hottextNode.type.name !== 'qtiHottext') {
    return false;
  }

  const hottextIdentifier = hottextNode.attrs.identifier as string | null;
  const $hottextPos = state.doc.resolve(hottextPos);

  let interactionDepth: number | null = null;
  for (let depth = $hottextPos.depth; depth >= 0; depth -= 1) {
    if ($hottextPos.node(depth).type.name === 'qtiHottextInteraction') {
      interactionDepth = depth;
      break;
    }
  }

  const tr = state.tr;

  if (interactionDepth !== null && hottextIdentifier) {
    const interactionPos = $hottextPos.before(interactionDepth);
    const interactionNode = state.doc.nodeAt(interactionPos);

    if (interactionNode) {
      const nextIdentifiers = parseCorrectResponse(
        interactionNode.attrs.correctResponse as string | string[] | null,
      ).filter(identifier => identifier !== hottextIdentifier);

      tr.setNodeMarkup(interactionPos, undefined, {
        ...interactionNode.attrs,
        correctResponse: nextIdentifiers.length > 0 ? nextIdentifiers.join(',') : null,
      });
    }
  }

  tr.replaceWith(hottextPos, hottextPos + hottextNode.nodeSize, hottextNode.content as Fragment);
  dispatch(tr.scrollIntoView());
  return true;
}

export function createHottextWrapSelectionPlugin(): Plugin {
  return new Plugin({
    key: hottextWrapSelectionPluginKey,
    view(view) {
      const handleWrapSelection = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const interactionElement = target.closest('qti-hottext-interaction');
        if (!(interactionElement instanceof HTMLElement)) return;

        wrapSelectedTextAsHottext(view, interactionElement);
      };

      const handleRemoveHottext = (event: Event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const hottextElement = target.closest('qti-hottext');
        if (!(hottextElement instanceof HTMLElement)) return;

        unwrapHottext(view, hottextElement);
      };

      view.dom.addEventListener(HOTTEXT_WRAP_SELECTION_EVENT, handleWrapSelection);
      view.dom.addEventListener(HOTTEXT_REMOVE_EVENT, handleRemoveHottext);

      return {
        destroy() {
          view.dom.removeEventListener(HOTTEXT_WRAP_SELECTION_EVENT, handleWrapSelection);
          view.dom.removeEventListener(HOTTEXT_REMOVE_EVENT, handleRemoveHottext);
        },
      };
    },
  });
}
