/**
 * Ancestor Attributes Panel Plugin
 *
 * A pure, generic ProseMirror side panel that shows the selected node AND every
 * ancestor (including the doc node) as stacked sections — outermost (doc) first,
 * innermost (selection) last — with no node switcher/tabs. Each attribute is
 * rendered as a single input with live two-way binding: editing a field
 * dispatches a transaction that updates the node's attrs, and external attr
 * changes refresh the inputs in place.
 *
 * Fields are rendered by value type: boolean attributes become checkboxes and
 * everything else becomes a text input (the stored value type is preserved on
 * write). The only configuration is a generic read-only allowlist
 * (`editableAttrs`). Read-only attrs are rendered disabled.
 *
 * No ProseKit imports — works with raw ProseMirror.
 */

import { NodeSelection, Plugin, type EditorState } from 'prosemirror-state';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

/** Sentinel position for the doc node (it has no addressable document position). */
const DOC_POS = -1;

export interface ChainEntry {
  type: string;
  attrs: Record<string, unknown>;
  pos: number; // DOC_POS for the doc node
  isDoc: boolean;
}

export interface AttributesPanelOptions {
  /**
   * Per-node-type allowlist of user-editable attribute names. When a node type
   * has an entry, only the listed attributes are editable and every other
   * attribute is rendered disabled. Node types without an entry (e.g. the doc
   * node) have all of their attributes editable.
   */
  editableAttrs?: Record<string, readonly string[]>;
}

/** Does this node type define any schema attrs? */
const nodeHasSchemaAttrs = (node: ProseMirrorNode): boolean =>
  Object.keys(node.type.spec.attrs ?? {}).length > 0;

/**
 * Collect the doc node + every ancestor of the selection that defines schema
 * attrs, ordered outermost (doc) → innermost (selection).
 */
export const collectAncestorChain = (state: EditorState): ChainEntry[] => {
  const chain: ChainEntry[] = [];
  const { selection } = state;
  const { $from } = selection;

  // Walk from the doc node (depth 0) down to the innermost ancestor.
  for (let depth = 0; depth <= $from.depth; depth++) {
    const node = $from.node(depth);
    if (!nodeHasSchemaAttrs(node)) continue;
    chain.push({
      type: node.type.name,
      attrs: node.attrs,
      pos: depth === 0 ? DOC_POS : $from.before(depth),
      isDoc: depth === 0,
    });
  }

  // A NodeSelection targets a node directly (e.g. selecting an interaction);
  // append it if it isn't already the innermost ancestor.
  if (selection instanceof NodeSelection) {
    const node = selection.node;
    const pos = selection.from;
    if (nodeHasSchemaAttrs(node) && !chain.some(entry => entry.pos === pos)) {
      chain.push({ type: node.type.name, attrs: node.attrs, pos, isDoc: false });
    }
  }

  return chain;
};

/** Stable signature of the chain (types + positions) — used to avoid needless re-renders. */
const chainSignature = (chain: ChainEntry[]): string =>
  chain.map(entry => `${entry.type}@${entry.pos}`).join('|');

/** Apply an attribute change to a node (or the doc) via a transaction. */
const applyAttrChange = (view: EditorView, entry: ChainEntry, key: string, value: unknown): void => {
  const tr = entry.isDoc
    ? view.state.tr.setDocAttribute(key, value)
    : view.state.tr.setNodeAttribute(entry.pos, key, value);
  view.dispatch(tr);
};

const buildField = (
  view: EditorView,
  entry: ChainEntry,
  key: string,
  value: unknown,
  readOnly: boolean,
): HTMLLabelElement => {
  const label = document.createElement('label');
  label.style.display = 'contents';

  const span = document.createElement('span');
  span.textContent = key;
  label.appendChild(span);

  const input = document.createElement('input');
  input.dataset.attrKey = key;
  input.disabled = readOnly;

  // Type-aware field: boolean attrs render as a checkbox, everything else as a
  // text input. The stored value type is preserved on write (boolean ↔ string).
  if (typeof value === 'boolean') {
    input.type = 'checkbox';
    input.checked = value;
    if (!readOnly) {
      input.addEventListener('change', () => {
        applyAttrChange(view, entry, key, input.checked);
      });
    }
  } else {
    input.type = 'text';
    input.value = value == null ? '' : String(value);
    if (!readOnly) {
      // `change` fires when editing finishes (blur/Enter), so each edit commits
      // a single transaction rather than one per keystroke.
      input.addEventListener('change', () => {
        applyAttrChange(view, entry, key, input.value === '' ? null : input.value);
      });
    }
  }

  label.appendChild(input);
  return label;
};

const buildSection = (
  view: EditorView,
  entry: ChainEntry,
  editableAttrs: ReadonlySet<string> | undefined,
): HTMLElement => {
  const section = document.createElement('fieldset');
  section.dataset.nodeType = entry.type;
  section.style.cssText = 'display:grid; grid-template-columns:auto 1fr; gap:6px 10px; align-items:center;';

  const legend = document.createElement('legend');
  legend.textContent = entry.type;
  section.appendChild(legend);

  for (const [key, value] of Object.entries(entry.attrs)) {
    // No allowlist for this node type → every attribute is editable.
    const readOnly = editableAttrs ? !editableAttrs.has(key) : false;
    section.appendChild(buildField(view, entry, key, value, readOnly));
  }
  return section;
};

/** Render the stacked attributes panel for the current selection. */
const renderAttrsPanel = (
  view: EditorView,
  panelEl: HTMLElement,
  editableAttrs: Record<string, ReadonlySet<string>>,
): void => {
  const chain = collectAncestorChain(view.state);
  panelEl.replaceChildren();

  const title = document.createElement('h3');
  title.textContent = 'Attributes';
  panelEl.appendChild(title);

  if (chain.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'Place the cursor on a node with attributes.';
    panelEl.appendChild(empty);
    return;
  }

  for (const entry of chain) {
    panelEl.appendChild(buildSection(view, entry, editableAttrs[entry.type]));
  }
};

/**
 * Plugin that keeps the side panel in sync with the selection. It only fully
 * re-renders when the ancestor chain (types + positions) changes, so typing into
 * a field never steals focus; otherwise field values are refreshed in place.
 *
 * @param panelEl The host element to render the panel into.
 * @param options Editable-attribute allowlist.
 */
export const attributesPanelPlugin = (panelEl: HTMLElement, options: AttributesPanelOptions = {}): Plugin => {
  const editableAttrs: Record<string, ReadonlySet<string>> = Object.fromEntries(
    Object.entries(options.editableAttrs ?? {}).map(([type, attrs]) => [type, new Set(attrs)]),
  );

  return new Plugin({
    view: (view: EditorView) => {
      let signature = '\u0000'; // force initial render

      const sync = () => {
        const chain = collectAncestorChain(view.state);
        const nextSignature = chainSignature(chain);
        if (nextSignature !== signature) {
          signature = nextSignature;
          renderAttrsPanel(view, panelEl, editableAttrs);
          return;
        }
        // Same chain — refresh values of inputs that are not currently focused.
        const sections = panelEl.querySelectorAll('fieldset');
        chain.forEach((entry, index) => {
          const section = sections[index];
          if (!section) return;
          for (const [key, value] of Object.entries(entry.attrs)) {
            const input = section.querySelector<HTMLInputElement>(`input[data-attr-key="${key}"]`);
            if (!input || input === document.activeElement) continue;
            if (input.type === 'checkbox') {
              input.checked = Boolean(value);
            } else {
              input.value = value == null ? '' : String(value);
            }
          }
        });
      };

      sync();
      return { update: sync };
    },
  });
};
