import { definePlugin } from 'prosekit/core';
import { DOMSerializer, type Slice } from 'prosekit/pm/model';
import { Plugin, PluginKey } from 'prosekit/pm/state';

import type { EditorView } from 'prosekit/pm/view';

const pasteDebugPluginKey = new PluginKey('paste-debug');

function sliceToHtml(slice: Slice, view: EditorView): string {
  const serializer = DOMSerializer.fromSchema(view.state.schema);
  const fragment = serializer.serializeFragment(slice.content);
  const container = document.createElement('div');
  container.appendChild(fragment);
  return container.innerHTML;
}

function logPasteStage(stage: string, detail: unknown) {
  console.groupCollapsed(`[paste-debug] ${stage}`);
  console.log(detail);
  console.groupEnd();
}

export function definePasteDebugExtension() {
  return definePlugin(() => new Plugin({
    key: pasteDebugPluginKey,
    props: {
      transformPastedHTML(html, view) {
        logPasteStage('transformPastedHTML:input', html);

        const cleanedHtml = html;

        logPasteStage('transformPastedHTML:output', {
          html: cleanedHtml,
          changed: cleanedHtml !== html,
          schemaNodes: Object.keys(view.state.schema.nodes),
        });

        return cleanedHtml;
      },
      transformPastedText(text, plain) {
        logPasteStage('transformPastedText', { text, plain });
        return text;
      },
      transformPasted(slice, view, plain) {
        logPasteStage('transformPasted', {
          plain,
          openStart: slice.openStart,
          openEnd: slice.openEnd,
          json: slice.content.toJSON(),
          text: slice.content.textBetween(0, slice.content.size, '\n'),
          html: sliceToHtml(slice, view),
        });

        return slice;
      },
      handlePaste(view, event, slice) {
        logPasteStage('handlePaste', {
          eventType: event.type,
          html: event.clipboardData?.getData('text/html') ?? '',
          text: event.clipboardData?.getData('text/plain') ?? '',
          slice: {
            openStart: slice.openStart,
            openEnd: slice.openEnd,
            json: slice.content.toJSON(),
            text: slice.content.textBetween(0, slice.content.size, '\n'),
            html: sliceToHtml(slice, view),
          },
        });

        return false;
      },
    },
  }));
}
