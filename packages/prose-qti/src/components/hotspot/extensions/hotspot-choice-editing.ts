/**
 * The ProseMirror side of the hotspot editor: selecting, adding and removing hotspot choices, and
 * keeping the answer key in step with the choices that exist.
 *
 * The interaction's Lit component draws the choices, but it has no view, so it cannot change the
 * document or the selection itself. An attribute change goes through the shared
 * `qti-prosemirror-node-attrs-change` event (moving or resizing a choice, marking it correct), and
 * that event can only rewrite the attributes of an existing node. Everything else the component
 * asks for with {@link QTI_HOTSPOT_CHOICES_EDIT_EVENT}, and this plugin, which has the view,
 * performs it:
 *
 *   select  a press on an area puts a `NodeSelection` on its choice; a press on the picture
 *           elsewhere puts one on the interaction. ProseMirror's selection is then where the author
 *           is working: the attributes panel shows that node, the decorator treats the interaction
 *           as clicked into, and the keys act there. The component reads which area is selected
 *           back from the `ProseMirror-selectednode` class, so the selection lives in one place.
 *   add     a drawn area becomes a new choice, with an identifier made here, and is selected.
 *   remove  the choice is deleted and the interaction selected.
 *
 * With a choice selected, ProseMirror's own Delete / Backspace remove it. Whatever removes a choice —
 * those keys, cut, the toolbar, an undo — the `appendTransaction` here drops it from its
 * interaction's correct response in the same history step: an answer key naming a choice that no
 * longer exists would make the item unanswerable. Typing and paste do nothing while a choice is
 * selected (ProseMirror would replace the area with whatever fits, which is nothing).
 *
 * Keys and clipboard events from inside the component's shadow root — its drawing surface while a
 * polygon is drawn, its toolbar buttons — are the component's: ProseMirror leaves them alone, since
 * it would apply them to its own selection, which is not what the author is working on there (Enter
 * would add a paragraph after the interaction, a letter would replace it). They are not stopped, so
 * document-level listeners still see them. Undo and redo act on the document as a whole and go on.
 *
 * In `pluginFactories`, not `decoratorPluginFactories`: the drawing tools are part of the
 * interaction's editor component, which every host renders, so the plugin that carries out their
 * requests has to be there too.
 */
import { NodeSelection, Plugin, PluginKey } from 'prosemirror-state';

import { iterResponseValues, parseResponseAttribute } from '@citolab/prose-qti/components/shared/response/codec.js';

import type { Node as PmNode } from 'prosemirror-model';
import type { EditorState, Transaction } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

export const QTI_HOTSPOT_CHOICES_EDIT_EVENT = 'qti-hotspot-choices-edit';

export type QtiHotspotChoicesEditDetail =
  /** Select a choice, or with `identifier: null` the interaction itself. */
  | { op: 'select'; identifier: string | null }
  | { op: 'add'; shape: string; coords: string }
  | { op: 'remove'; identifier: string };

const INTERACTION_NODE_TYPE = 'qtiHotspotInteraction';
const CHOICE_NODE_TYPE = 'qtiHotspotChoice';

/** The identifier a newly drawn choice gets. */
export function createHotspotChoiceIdentifier(): string {
  return `HOTSPOT_${crypto.randomUUID()}`;
}

function findChoice(interaction: PmNode, interactionPos: number, identifier: string): number | null {
  let found: number | null = null;
  interaction.forEach((child, offset) => {
    if (found == null && child.type.name === CHOICE_NODE_TYPE && child.attrs.identifier === identifier) {
      found = interactionPos + 1 + offset;
    }
  });
  return found;
}

function choiceIdentifiers(interaction: PmNode): Set<string> {
  const identifiers = new Set<string>();
  interaction.forEach(child => {
    if (child.type.name === CHOICE_NODE_TYPE) identifiers.add(String(child.attrs.identifier));
  });
  return identifiers;
}

/**
 * The transaction that applies `edit` to the hotspot interaction at `interactionPos`, or `null` when
 * there is nothing to do. Pure, so it can be tested without a view. Tagged with the `pointer` meta,
 * as ProseMirror tags a selection made with the mouse, which is what each of these is.
 */
export function applyHotspotChoicesEdit(
  state: EditorState,
  interactionPos: number,
  edit: QtiHotspotChoicesEditDetail,
): Transaction | null {
  const interaction = state.doc.nodeAt(interactionPos);
  const choiceType = state.schema.nodes[CHOICE_NODE_TYPE];
  if (!interaction || interaction.type.name !== INTERACTION_NODE_TYPE || !choiceType) return null;

  if (edit.op === 'select') {
    const pos = edit.identifier == null ? interactionPos : findChoice(interaction, interactionPos, edit.identifier);
    if (pos == null) return null;
    return state.tr.setSelection(NodeSelection.create(state.doc, pos)).setMeta('pointer', true);
  }

  if (edit.op === 'add') {
    const taken = choiceIdentifiers(interaction);
    let identifier = createHotspotChoiceIdentifier();
    while (taken.has(identifier)) identifier = createHotspotChoiceIdentifier();
    const end = interactionPos + interaction.nodeSize - 1;
    const tr = state.tr.insert(end, choiceType.create({ identifier, shape: edit.shape, coords: edit.coords }));
    return tr.setSelection(NodeSelection.create(tr.doc, end)).setMeta('pointer', true);
  }

  const choicePos = findChoice(interaction, interactionPos, edit.identifier);
  if (choicePos == null) return null;
  const tr = state.tr.delete(choicePos, choicePos + state.doc.nodeAt(choicePos)!.nodeSize);
  return tr.setSelection(NodeSelection.create(tr.doc, interactionPos)).setMeta('pointer', true);
}

/**
 * For every hotspot interaction in `oldState` that is still there in `newState`, drop from its
 * correct response the identifiers of the choices it lost; `null` when none did. `transactions`
 * are the ones that led from `oldState` to `newState`. Only lost choices are dropped: an answer key
 * that already named a choice that was never there is left as the author's.
 */
export function pruneRemovedChoices(
  oldState: EditorState,
  newState: EditorState,
  transactions: readonly Transaction[],
): Transaction | null {
  const interactionType = newState.schema.nodes[INTERACTION_NODE_TYPE];
  if (!interactionType) return null;

  let tr: Transaction | null = null;
  oldState.doc.descendants((before, oldPos) => {
    if (before.type !== interactionType) return true;
    const pos = mapThrough(transactions, oldPos);
    const after = pos == null ? null : newState.doc.nodeAt(pos);
    if (pos == null || !after || after.type !== interactionType) return false;

    const kept = choiceIdentifiers(after);
    const lost = [...choiceIdentifiers(before)].filter(identifier => !kept.has(identifier));
    const correct = Array.from(iterResponseValues(after.attrs.correctResponse));
    const next = correct.filter(identifier => !lost.includes(identifier));
    if (next.length !== correct.length) {
      tr ??= newState.tr;
      tr.setNodeMarkup(pos, undefined, { ...after.attrs, correctResponse: parseResponseAttribute(next.join(',')) });
    }
    // Interactions don't nest.
    return false;
  });
  return tr;
}

/** Where the node starting at `pos` starts after `transactions`; `null` when they deleted it. */
function mapThrough(transactions: readonly Transaction[], pos: number): number | null {
  let mapped = pos;
  for (const tr of transactions) {
    const result = tr.mapping.mapResult(mapped, 1);
    if (result.deleted) return null;
    mapped = result.pos;
  }
  return mapped;
}

function findInteractionPos(view: EditorView, host: Element): number | null {
  try {
    const $pos = view.state.doc.resolve(view.posAtDOM(host, 0));
    for (let depth = $pos.depth; depth > 0; depth -= 1) {
      if ($pos.node(depth).type.name === INTERACTION_NODE_TYPE) return $pos.before(depth);
    }
    const node = view.state.doc.nodeAt($pos.pos);
    return node?.type.name === INTERACTION_NODE_TYPE ? $pos.pos : null;
  } catch {
    return null;
  }
}

/** Whether `event` comes from inside a hotspot interaction's own shadow root, not from its prompt. */
function fromHotspotComponent(event: Event): boolean {
  const origin = event.composedPath()[0];
  const root = origin instanceof Node ? origin.getRootNode() : null;
  return root instanceof ShadowRoot && root.host.localName === 'qti-hotspot-interaction';
}

/** Ctrl/Cmd+Z, Ctrl/Cmd+Y and Ctrl/Cmd+Shift+Z. */
function isUndoRedo(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  return (event.ctrlKey || event.metaKey) && !event.altKey && (key === 'z' || key === 'y');
}

/** Whether the selection is a hotspot choice, which holds no text. */
function choiceSelected(state: EditorState): boolean {
  const { selection } = state;
  return selection instanceof NodeSelection && selection.node.type.name === CHOICE_NODE_TYPE;
}

export function createHotspotChoiceEditingPlugin(): Plugin {
  return new Plugin({
    key: new PluginKey('qti-hotspot-choice-editing'),
    appendTransaction(transactions, oldState, newState) {
      if (!transactions.some(tr => tr.docChanged)) return null;
      return pruneRemovedChoices(oldState, newState, transactions);
    },
    props: {
      handleTextInput: view => choiceSelected(view.state),
      handlePaste: view => choiceSelected(view.state),
      handleDOMEvents: {
        keydown: (_view, event) => fromHotspotComponent(event) && !isUndoRedo(event),
        keypress: (_view, event) => fromHotspotComponent(event),
        cut: (_view, event) => fromHotspotComponent(event),
        copy: (_view, event) => fromHotspotComponent(event),
        paste: (_view, event) => fromHotspotComponent(event),
      },
    },
    view(view) {
      const onEdit = (event: Event) => {
        const detail = (event as CustomEvent<QtiHotspotChoicesEditDetail>).detail;
        const target = event.target;
        if (!detail || !(target instanceof Element)) return;

        const host = target.closest('qti-hotspot-interaction');
        if (!host) return;

        const interactionPos = findInteractionPos(view, host);
        if (interactionPos == null) return;

        const tr = applyHotspotChoicesEdit(view.state, interactionPos, detail);
        if (!tr) return;
        view.dispatch(tr);
        // The press that asked for this was kept from ProseMirror, so the editor may not have focus;
        // without it the keys would not reach the selection just made.
        if (!view.hasFocus()) view.focus();
      };

      view.dom.addEventListener(QTI_HOTSPOT_CHOICES_EDIT_EVENT, onEdit);
      return {
        destroy() {
          view.dom.removeEventListener(QTI_HOTSPOT_CHOICES_EDIT_EVENT, onEdit);
        },
      };
    },
  });
}
