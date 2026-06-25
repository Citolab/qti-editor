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
 * Fields are rendered by value type: boolean → checkbox, number → number
 * input, everything else → text input. The stored value type is preserved on
 * write (boolean ↔ string ↔ number). The only configuration is a generic
 * read-only allowlist (`editableAttrs`). Read-only attrs are rendered disabled.
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

/**
 * PluginView that keeps the side panel in sync with the selection. State and
 * behavior are explicit on the instance (rather than hidden in a closure): the
 * only mutable state is `#signature`, and each responsibility — value sync,
 * full render, section/field construction, attr writes — is its own method.
 *
 * It only fully re-renders when the ancestor chain (types + positions) changes,
 * so typing into a field never steals focus; otherwise field values are
 * refreshed in place.
 */
export class AttributesPanelView {
  readonly #view: EditorView;
  readonly #panelEl: HTMLElement;
  readonly #editableAttrs: Record<string, ReadonlySet<string>>;
  /** Signature of the currently rendered chain; `'\u0000'` forces the first render. */
  #signature = '\u0000';

  constructor(
    view: EditorView,
    panelEl: HTMLElement,
    editableAttrs: Record<string, ReadonlySet<string>>,
  ) {
    this.#view = view;
    this.#panelEl = panelEl;
    this.#editableAttrs = editableAttrs;
    this.#sync();
  }

  /** PluginView contract: called after every editor update. */
  update(): void {
    this.#sync();
  }

  /**
   * Reconcile the panel with the current selection. Full re-render when the
   * ancestor chain changes; otherwise refresh unfocused input values in place.
   */
  #sync(): void {
    const chain = collectAncestorChain(this.#view.state);
    const nextSignature = chainSignature(chain);
    if (nextSignature !== this.#signature) {
      this.#signature = nextSignature;
      this.#render(chain);
      return;
    }
    // Same chain — refresh values of inputs that are not currently focused.
    const sections = this.#panelEl.querySelectorAll('fieldset');
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
  }

  /** Render the stacked attributes panel for the given ancestor chain. */
  #render(chain: ChainEntry[]): void {
    this.#panelEl.replaceChildren();

    const title = document.createElement('h3');
    title.textContent = 'Attributes';
    this.#panelEl.appendChild(title);

    if (chain.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'Place the cursor on a node with attributes.';
      this.#panelEl.appendChild(empty);
      return;
    }

    for (const entry of chain) {
      this.#panelEl.appendChild(this.#buildSection(entry));
    }
  }

  #buildSection(entry: ChainEntry): HTMLElement {
    const editableAttrs = this.#editableAttrs[entry.type];
    const section = document.createElement('fieldset');
    section.dataset.nodeType = entry.type;
    section.style.cssText = 'display:grid; grid-template-columns:auto 1fr; gap:6px 10px; align-items:center;';

    const legend = document.createElement('legend');
    legend.textContent = entry.type;
    section.appendChild(legend);

    for (const [key, value] of Object.entries(entry.attrs)) {
      // No allowlist for this node type → every attribute is editable.
      // Otherwise: attribute outside the allowlist renders disabled (system attr).
      const readOnly = editableAttrs ? !editableAttrs.has(key) : false;
      section.appendChild(this.#buildField(entry, key, value, readOnly));
    }
    return section;
  }

  #buildField(entry: ChainEntry, key: string, value: unknown, readOnly: boolean): HTMLLabelElement {
    const label = document.createElement('label');
    label.style.display = 'contents';

    const span = document.createElement('span');
    span.textContent = key;
    label.appendChild(span);

    const input = document.createElement('input');
    input.dataset.attrKey = key;
    input.disabled = readOnly;

    // Type-aware field: boolean → checkbox, number → number input, everything
    // else → text input. The stored value type is preserved on write.
    if (typeof value === 'boolean') {
      input.type = 'checkbox';
      input.checked = value;
      if (!readOnly) {
        input.addEventListener('change', () => {
          this.#applyAttrChange(entry, key, input.checked);
        });
      }
    } else if (typeof value === 'number') {
      input.type = 'number';
      input.value = String(value);
      if (!readOnly) {
        input.addEventListener('change', () => {
          // Empty input → null (clear). Otherwise parse back to a number so
          // the stored type matches the original attr type.
          const raw = input.value.trim();
          const next = raw === '' ? null : Number(raw);
          this.#applyAttrChange(entry, key, Number.isFinite(next as number) || next === null ? next : input.value);
        });
      }
    } else {
      input.type = 'text';
      input.value = value == null ? '' : String(value);
      if (!readOnly) {
        // `change` fires when editing finishes (blur/Enter), so each edit commits
        // a single transaction rather than one per keystroke.
        input.addEventListener('change', () => {
          this.#applyAttrChange(entry, key, input.value === '' ? null : input.value);
        });
      }
    }

    label.appendChild(input);
    return label;
  }

  /** Apply an attribute change to a node (or the doc) via a transaction. */
  #applyAttrChange(entry: ChainEntry, key: string, value: unknown): void {
    const tr = entry.isDoc
      ? this.#view.state.tr.setDocAttribute(key, value)
      : this.#view.state.tr.setNodeAttribute(entry.pos, key, value);
    this.#view.dispatch(tr);
  }
}

/**
 * Plugin that keeps the side panel in sync with the selection via an
 * {@link AttributesPanelView}. Thin factory wrapper — normalizes the editable
 * allowlist to sets and wires the view.
 *
 * @param panelEl The host element to render the panel into.
 * @param options Editable-attribute allowlist.
 */
export const attributesPanelPlugin = (panelEl: HTMLElement, options: AttributesPanelOptions = {}): Plugin => {
  const editableAttrs: Record<string, ReadonlySet<string>> = Object.fromEntries(
    Object.entries(options.editableAttrs ?? {}).map(([type, attrs]) => [type, new Set(attrs)]),
  );
  return new Plugin({
    view: (view: EditorView) => new AttributesPanelView(view, panelEl, editableAttrs),
  });
};
