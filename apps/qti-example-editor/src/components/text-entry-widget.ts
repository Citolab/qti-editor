/**
 * Example widget: edit a text-entry interaction's correct response.
 *
 * When a `qtiTextEntryInteraction` node is node-selected, a small floating
 * `<textarea>` is mounted beside it through a `Decoration.widget`. Each non-empty
 * line is one accepted answer.
 *
 * Updating a node's attributes "the ProseMirror way" is a transaction:
 *
 *     view.dispatch(view.state.tr.setNodeMarkup(pos, undefined, nextAttrs));
 *
 * This widget owns a position handle (`getPos()`), so it builds and dispatches
 * that transaction itself (see the input handler below).
 *
 * The app also wires the shared `nodeAttrsSyncPlugin` (see main.ts). That plugin
 * is the *other* way to reach the same `setNodeMarkup`: a component mutates its
 * own DOM and fires a `qti-prosemirror-node-attrs-change` event; the plugin then
 * resolves the node from the DOM (`target.closest(tagName)`) and dispatches. It
 * exists for interaction elements that render their own DOM and have no position
 * handle. This widget does NOT use it — it already knows its position via
 * `getPos()`, and its textarea lives in a sibling decoration (not inside the
 * `qti-text-entry-interaction` element), so the event's DOM lookup wouldn't find
 * the node anyway. Dispatching directly is both simpler and correct here.
 */

import { Plugin, PluginKey, NodeSelection } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

import type { EditorView } from 'prosemirror-view';

import './text-entry-widget.css';

const NODE_TYPE = 'qtiTextEntryInteraction';

/** Build the floating textarea for the interaction currently at `getPos()`. */
function buildWidget(
  view: EditorView,
  getPos: () => number | undefined,
  value: string | string[] | null,
): HTMLElement {
  // Zero-width anchor; innerHTML declares the structure at a glance.
  const wrapper = document.createElement('span');
  wrapper.className = 'te-widget';
  wrapper.contentEditable = 'false';
  wrapper.innerHTML = `
    <div class="te-widget__panel">
      <textarea class="te-widget__input" rows="3" placeholder="One answer per line"></textarea>
      <p class="te-widget__warning" hidden>Commas aren’t allowed — one answer per line.</p>
    </div>
  `;

  const textarea = wrapper.querySelector<HTMLTextAreaElement>('textarea')!;
  const warning  = wrapper.querySelector<HTMLElement>('p')!;
  textarea.value = Array.isArray(value) ? value.join('\n') : value ?? '';

  textarea.addEventListener('input', () => {
    // Commas separate answers in the serialized `correct-response`, so block them:
    // show the warning and leave the attribute untouched until they're removed.
    warning.hidden = !textarea.value.includes(',');
    if (!warning.hidden) return;

    const pos = getPos();
    if (pos == null) return;
    const node = view.state.doc.nodeAt(pos);
    if (!node || node.type.name !== NODE_TYPE) return;

    const answers = textarea.value.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    const correctResponse = answers.length === 0 ? null : answers.length === 1 ? answers[0] : answers;

    // Update node attrs, then re-assert the NodeSelection so this widget stays
    // mounted (its stable `key` keeps the same textarea, focus, and caret).
    const tr = view.state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, correctResponse });
    tr.setSelection(NodeSelection.create(tr.doc, pos));
    view.dispatch(tr);
  });

  return wrapper;
}

/** Show the widget whenever a text-entry interaction node is selected. */
export function textEntryWidgetPlugin(): Plugin {
  return new Plugin({
    key: new PluginKey(NODE_TYPE),
    props: {
      decorations(state) {
        const { selection } = state;
        if (!(selection instanceof NodeSelection) || selection.node.type.name !== NODE_TYPE) return null;

        return DecorationSet.create(state.doc, [
          Decoration.widget(
            selection.from,
            (view, getPos) => buildWidget(view, getPos, selection.node.attrs.correctResponse),
            // Stable `key` reuses the textarea across re-renders (keeps focus);
            // `stopEvent` lets the textarea handle its own keys; `ignoreSelection`
            // stops ProseMirror from pulling the caret into the widget.
            { key: NODE_TYPE, side: 1, stopEvent: () => true, ignoreSelection: true },
          ),
        ]);
      },
    },
  });
}
