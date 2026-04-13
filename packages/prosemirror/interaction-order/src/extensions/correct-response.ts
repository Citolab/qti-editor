import { definePlugin, type Extension } from 'prosekit/core';
import { Plugin, PluginKey } from 'prosekit/pm/state';

import type { EditorView } from 'prosekit/pm/view';

const orderCorrectResponsePluginKey = new PluginKey('order-correct-response');

export const ORDER_RESPONSE_CHANGE_EVENT = 'order-response-change';

function findInteractionNodePos(view: EditorView, interactionElement: HTMLElement): number | null {
  const { state } = view;
  let foundPos: number | null = null;

  state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;
    if (node.type.name === 'qtiOrderInteraction') {
      const domNode = view.nodeDOM(pos);
      if (domNode === interactionElement || (domNode && domNode.contains(interactionElement))) {
        foundPos = pos;
        return false;
      }
    }
    return true;
  });

  return foundPos;
}

export function defineOrderCorrectResponseExtension(): Extension {
  return definePlugin(createOrderCorrectResponsePlugin);
}

export function createOrderCorrectResponsePlugin(): Plugin {
  return new Plugin({
    key: orderCorrectResponsePluginKey,
    view(view) {
      const handleOrderChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ order: string[] }>;
        const interactionElement = customEvent.target as HTMLElement;

        if (!interactionElement.matches('qti-order-interaction')) return;

        const { order } = customEvent.detail;
        const correctResponse = order.length > 0 ? JSON.stringify(order) : null;

        const pos = findInteractionNodePos(view, interactionElement);
        if (pos === null) return;

        const { state, dispatch } = view;
        const node = state.doc.nodeAt(pos);
        if (!node) return;

        dispatch(state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, correctResponse }));
      };

      view.dom.addEventListener(ORDER_RESPONSE_CHANGE_EVENT, handleOrderChange);

      return {
        destroy() {
          view.dom.removeEventListener(ORDER_RESPONSE_CHANGE_EVENT, handleOrderChange);
        },
      };
    },
  });
}
