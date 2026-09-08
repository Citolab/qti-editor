/**
 * Shared building blocks for the per-interaction editor decorators.
 *
 * Every QTI interaction is meant to get a decorator of the same shape — hover shows the boundary
 * and what is inside it, clicking into it shows the add/remove affordances and a floating action
 * pill. Only the add/remove semantics differ per interaction: what "another one of these" means is
 * the interaction's business. Everything else is here, so a new decorator is a short file.
 *
 * What this module owns:
 *
 *   - the icon set and the button factory, so every affordance in every decorator is the same
 *     element with the same event handling
 *   - the **node action pill** and its four default actions — select, settings, copy, delete. These
 *     are node-level operations that mean the same thing for every interaction, so no decorator
 *     should be reimplementing them.
 *   - `QTI_OPEN_NODE_SETTINGS_EVENT`, the host-facing contract. Generic over
 *     `nodeTypeName` / `tagName`, so every decorator emits the same event and a host wires it once.
 *
 * ## Why settings is an event and the others are not
 *
 * Select, copy and delete are self-contained: the correct behaviour follows from the node, the
 * schema and the clipboard, so they do the work themselves and a host gets them for free. Settings
 * has no default — what a properties UI *is* belongs to the host — so the pill only reports that it
 * was asked for. A host with no listener gets an inert settings button and three that work.
 *
 * ## Placement
 *
 * The pill is emitted as a widget *after* the node it acts on, which is what makes the decorated
 * node a preceding sibling. Two things depend on that: CSS anchor positioning refuses to anchor an
 * element to its own ancestor, and the "clicked into" ring is written as
 * `:has(+ .qti-decoration--actions)` — the pill's own presence is the state. Anchor names must be
 * minted per document position, because when several elements share one name the browser binds
 * every anchored box to the last of them.
 */

import { Fragment, Slice } from 'prosemirror-model';
import { NodeSelection, TextSelection } from 'prosemirror-state';
import { Decoration } from 'prosemirror-view';

import { translateQti } from '../i18n/index.js';

import type { Node as ProseMirrorNode } from 'prosemirror-model';
import type { EditorState } from 'prosemirror-state';
import type { EditorView } from 'prosemirror-view';

/** Fired when the settings action of an interaction's pill is clicked. */
export const QTI_OPEN_NODE_SETTINGS_EVENT = 'qti:node-settings:open';

export interface QtiOpenNodeSettingsDetail {
  nodeTypeName: string;
  tagName: string;
  /** Document position of the decorated node at the time of the click. */
  pos: number;
  attrs: Record<string, unknown>;
}

/** Lucide-style stroke glyphs, matching the design prototype. */
const ICON_PATHS = {
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  // Lucide `box-select`: a dashed rectangle, the conventional glyph for "select this box".
  boxSelect:
    '<path d="M5 3a2 2 0 0 0-2 2"/><path d="M19 3a2 2 0 0 1 2 2"/><path d="M21 19a2 2 0 0 1-2 2"/><path d="M5 21a2 2 0 0 1-2-2"/><path d="M9 3h1"/><path d="M9 21h1"/><path d="M14 3h1"/><path d="M14 21h1"/><path d="M3 9v1"/><path d="M21 9v1"/><path d="M3 14v1"/><path d="M21 14v1"/>',
  sliders:
    '<line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="1" x2="7" y1="14" y2="14"/><line x1="9" x2="15" y1="8" y2="8"/><line x1="17" x2="23" y1="16" y2="16"/>',
  copy:
    '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  trash:
    '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
} as const;

export type DecorationIconName = keyof typeof ICON_PATHS;

/**
 * Icon size inside the action pill.
 *
 * Smaller than the standalone affordances: the pill is chrome floating over the author's content, so
 * it should read as a quiet control strip rather than compete with the interaction under it. The
 * stroke weight is set in CSS (`--qti-edit-decoration-icon-stroke`) so it stays tunable with the
 * rest of the look.
 */
const PILL_ICON_SIZE = 14;

export function createDecorationIcon(name: DecorationIconName, size: number): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICON_PATHS[name];
  return svg;
}

export type DecorationButtonOptions = {
  /** Full class list for the button, e.g. `'qti-decoration qti-decoration--remove'`. */
  className: string;
  icon: DecorationIconName;
  iconSize: number;
  /**
   * The accessible name. Carried by `title` and `aria-label` rather than rendered: the pill is a set
   * of icon buttons, and a label beside one of them made it the odd one out and the pill wide enough
   * to overhang the interaction it belongs to.
   */
  label: string;
  /** CSS anchor name this button positions itself against, if any. */
  anchorName?: string;
  onClick: () => void;
};

export function createDecorationButton(options: DecorationButtonOptions): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options.className;
  button.contentEditable = 'false';
  button.title = options.label;
  button.setAttribute('aria-label', options.label);
  // `position-anchor` isn't in lib.dom's CSSStyleDeclaration yet.
  if (options.anchorName) button.style.setProperty('position-anchor', options.anchorName);
  button.appendChild(createDecorationIcon(options.icon, options.iconSize));

  // Keep the ProseMirror selection where it is — the pill's visibility depends on it, and every
  // handler resolves its own position anyway.
  button.addEventListener('mousedown', event => event.preventDefault());
  button.addEventListener('click', event => {
    event.preventDefault();
    options.onClick();
  });

  return button;
}

/**
 * The node a decoration widget acts on.
 *
 * Widgets are emitted *after* the node they decorate (see the note at the top), so the node is
 * always the one immediately before the widget's position.
 */
export function nodeBeforeWidget(
  state: EditorState,
  pos: number,
  nodeName: string,
): { node: ProseMirrorNode; from: number; to: number } | null {
  const $pos = state.doc.resolve(pos);
  const node = $pos.nodeBefore;
  if (!node || node.type.name !== nodeName) return null;
  return { node, from: pos - node.nodeSize, to: pos };
}

/* ── Node actions ──────────────────────────────────────────────────────────────────────────── */

export interface NodeActionContext {
  view: EditorView;
  /** Position of the decorated node, resolved at click time rather than at render time. */
  pos: number;
  node: ProseMirrorNode;
  nodeTypeName: string;
  tagName: string;
}

export interface NodeAction {
  /** Modifier suffix: `'settings'` renders `.qti-decoration__action--settings`. */
  name: string;
  icon: DecorationIconName;
  /** i18n key, resolved against the editor's language when the pill renders. */
  labelKey: string;
  /** Marks the destructive action, which CSS colours and separates from the rest. */
  destructive?: boolean;
  run: (context: NodeActionContext) => void | Promise<void>;
}

/**
 * The minting prefix for a node type: `qtiSimpleChoice` -> `SIMPLE_CHOICE`.
 *
 * Same derivation the paste rescue uses, so an identifier minted for a copy is indistinguishable
 * from one minted by a paste or by an insert command.
 */
function identifierPrefix(typeName: string): string {
  return typeName
    .replace(/^qti/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

/** Comma- and whitespace-separated tokens, which covers plain identifiers and directed pairs. */
function remapTokens(raw: string, mapping: Map<string, string>): string {
  return raw.replace(/[^\s,]+/g, token => mapping.get(token) ?? token);
}

function remapValue(value: unknown, mapping: Map<string, string>): unknown {
  if (typeof value === 'string') return remapTokens(value, mapping);
  if (Array.isArray(value)) return value.map(entry => (typeof entry === 'string' ? remapTokens(entry, mapping) : entry));
  return value;
}

/** Every identifier in `node`'s subtree, mapped to a freshly minted replacement. */
function collectIdentifierMapping(node: ProseMirrorNode): Map<string, string> {
  const mapping = new Map<string, string>();

  const visit = (current: ProseMirrorNode) => {
    const { identifier, responseIdentifier } = current.attrs;
    if (typeof identifier === 'string' && identifier && !mapping.has(identifier)) {
      mapping.set(identifier, `${identifierPrefix(current.type.name)}_${crypto.randomUUID()}`);
    }
    if (typeof responseIdentifier === 'string' && responseIdentifier && !mapping.has(responseIdentifier)) {
      mapping.set(responseIdentifier, `RESPONSE_${crypto.randomUUID()}`);
    }
    current.forEach(child => visit(child));
  };

  visit(node);
  return mapping;
}

/**
 * A copy of `node` whose identifiers are new, and whose references to them still point inside it.
 *
 * Without this, copying an interaction and pasting it beside the original is invalid QTI rather than
 * merely untidy: the two would share one `responseIdentifier`, so delivery would bind them to a
 * single response variable, and the copy's `correctResponse` would name the original's choices. So the walk mints a fresh
 * identifier for every node in the subtree that carries one, then rewrites every *other* attribute
 * through the same mapping — which is what carries `correctResponse` across, including the
 * space-joined directed pairs the match and gap-match interactions use.
 *
 * The author's own identifier is deliberately not preserved. Every identifier in a copy that is
 * pasted beside its original collides, so there is nothing to keep; minting `SIMPLE_CHOICE_<uuid>`
 * instead makes the result identical in shape to a freshly inserted interaction and idempotent under
 * repeated copying, where preserving a stem would grow it each time.
 */
export function remintIdentifiers(node: ProseMirrorNode): ProseMirrorNode {
  const mapping = collectIdentifierMapping(node);
  if (mapping.size === 0) return node.copy(node.content);

  const rebuild = (current: ProseMirrorNode): ProseMirrorNode => {
    // Text nodes carry no attributes and are immutable, so they are shared rather than rebuilt —
    // and `NodeType.create` refuses to construct one anyway.
    if (current.isText) return current;

    const attrs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(current.attrs)) {
      if (key === 'identifier' || key === 'responseIdentifier') {
        attrs[key] = typeof value === 'string' && mapping.has(value) ? mapping.get(value) : value;
      } else {
        attrs[key] = remapValue(value, mapping);
      }
    }

    const children: ProseMirrorNode[] = [];
    current.forEach(child => children.push(rebuild(child)));
    return current.type.create(attrs, children, current.marks);
  };

  return rebuild(node);
}

/** Report that the host should open its properties UI for this node. The pill mutates nothing. */
export function openNodeSettings({ view, pos, node, nodeTypeName, tagName }: NodeActionContext): void {
  const detail: QtiOpenNodeSettingsDetail = {
    nodeTypeName,
    tagName,
    pos,
    attrs: { ...node.attrs },
  };

  view.dom.dispatchEvent(
    new CustomEvent<QtiOpenNodeSettingsDetail>(QTI_OPEN_NODE_SETTINGS_EVENT, {
      detail,
      bubbles: true,
      composed: true,
    }),
  );
}

/**
 * Write the node to the system clipboard, so the author chooses where it lands.
 *
 * A real clipboard write rather than an insert-below: where a copy belongs is the author's decision,
 * and often it is another item entirely. `view.serializeForClipboard` produces exactly what a
 * Ctrl-C over the node would have — including the `data-pm-slice` attribute ProseMirror reads back
 * on paste to reconstruct the slice faithfully — so pasting inside the editor restores the node, and
 * pasting into anything else yields sensible HTML.
 *
 * The identifiers are re-minted before serialising, so the pasted interaction is valid alongside the
 * original rather than a second claimant to the same response variable. Note the consequence: two
 * pastes of one copy carry the same minted identifiers, and the second needs another copy. Fixing
 * that for good means re-minting on paste instead, which belongs with the paste rescue in the schema
 * package rather than here.
 */
export async function copyNodeToClipboard({ view, node }: NodeActionContext): Promise<void> {
  const slice = new Slice(Fragment.from(remintIdentifiers(node)), 0, 0);
  const { dom, text } = view.serializeForClipboard(slice);
  const html = dom.innerHTML;

  view.focus();

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' }),
      }),
    ]);
  } catch {
    // The async clipboard is unavailable (older Safari, an insecure origin) or was refused. The
    // execCommand route still works from inside a click handler, and copying a selected
    // contenteditable subtree is what puts `text/html` on the clipboard rather than plain text.
    writeHtmlWithExecCommand(html, text);
  }
}

/** Legacy clipboard write: select a detached contenteditable holding `html`, then copy it. */
function writeHtmlWithExecCommand(html: string, text: string): void {
  const staging = document.createElement('div');
  staging.contentEditable = 'true';
  staging.innerHTML = html;
  // Off-screen rather than hidden: `display: none` and `visibility: hidden` are both unselectable,
  // and an unselectable subtree copies nothing.
  staging.setAttribute('style', 'position:fixed;left:-9999px;top:0;opacity:0;');
  document.body.appendChild(staging);

  const selection = window.getSelection();
  const saved = selection && selection.rangeCount > 0 ? selection.getRangeAt(0).cloneRange() : null;

  const range = document.createRange();
  range.selectNodeContents(staging);
  selection?.removeAllRanges();
  selection?.addRange(range);

  try {
    document.execCommand('copy');
  } catch {
    // Nothing left to try; fall back to text so the action is not silently inert.
    void navigator.clipboard?.writeText?.(text).catch(() => {});
  }

  selection?.removeAllRanges();
  if (saved) selection?.addRange(saved);
  staging.remove();
}

/**
 * Select the whole node, as a click on a leaf node's border would.
 *
 * A `NodeSelection` over the interaction is what makes the node itself the thing the editor acts on
 * rather than the text inside it: Backspace/Delete then removes it, Ctrl-C copies it verbatim
 * (identifiers and all, unlike the pill's copy), and a drag moves it. Useful for exactly the cases
 * the pill has no button for.
 *
 * The pill survives the change: its emit rule is "the selection sits inside the node", and a
 * `NodeSelection` on the node spans it exactly.
 */
export function selectNode({ view, pos, node }: NodeActionContext): void {
  const { state } = view;
  if (!NodeSelection.isSelectable(node)) return;

  view.dispatch(state.tr.setSelection(NodeSelection.create(state.doc, pos)).scrollIntoView());
  view.focus();
}

/** Remove the node, leaving the document valid and the caret where it was. */
export function deleteNode({ view, pos, node }: NodeActionContext): void {
  const { state } = view;
  const $pos = state.doc.resolve(pos);
  const index = $pos.index();
  const to = pos + node.nodeSize;
  const tr = state.tr;

  if ($pos.parent.canReplace(index, index + 1)) {
    tr.delete(pos, to);
  } else {
    // The parent's content expression requires something here — `doc` is `block+`, so an item whose
    // only block is this interaction cannot simply lose it. A paragraph is the smallest valid stand-in
    // and gives the caret somewhere to land.
    const paragraphType = state.schema.nodes.paragraph;
    if (!paragraphType) return;
    tr.replaceWith(pos, to, paragraphType.create());
  }

  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(pos, tr.doc.content.size)))).scrollIntoView();

  view.dispatch(tr);
  view.focus();
}

/**
 * Select, settings, copy, delete — in that order, destructive last.
 *
 * Exported so a decorator can extend or replace the set (`[...DEFAULT_NODE_ACTIONS, myAction]`),
 * but the default is the point: these four mean the same thing for every interaction, so a
 * decorator that just wants them passes nothing.
 */
export const DEFAULT_NODE_ACTIONS: readonly NodeAction[] = [
  { name: 'select', icon: 'boxSelect', labelKey: 'node.select', run: selectNode },
  { name: 'settings', icon: 'sliders', labelKey: 'interaction.settings', run: openNodeSettings },
  { name: 'copy', icon: 'copy', labelKey: 'node.copy', run: copyNodeToClipboard },
  { name: 'delete', icon: 'trash', labelKey: 'node.delete', destructive: true, run: deleteNode },
];

export interface NodeActionsPillOptions {
  view: EditorView;
  /** The widget's own position, read at click time — see `nodeBeforeWidget`. */
  getPos: () => number | undefined;
  nodeTypeName: string;
  tagName: string;
  /** CSS anchor name of the decorated node, minted per position by the decorator. */
  anchorName?: string;
  actions?: readonly NodeAction[];
}

export function createNodeActionsPill(options: NodeActionsPillOptions): HTMLElement {
  const { view, getPos, nodeTypeName, tagName, anchorName, actions = DEFAULT_NODE_ACTIONS } = options;

  const pill = document.createElement('div');
  pill.className = 'qti-decoration qti-decoration--actions';
  pill.contentEditable = 'false';
  pill.setAttribute('role', 'toolbar');
  pill.setAttribute('aria-label', translateQti('node.actions', { target: view.dom }));
  if (anchorName) pill.style.setProperty('position-anchor', anchorName);

  for (const action of actions) {
    const classNames = ['qti-decoration__action', `qti-decoration__action--${action.name}`];
    if (action.destructive) classNames.push('qti-decoration__action--destructive');

    pill.appendChild(
      createDecorationButton({
        className: classNames.join(' '),
        icon: action.icon,
        iconSize: PILL_ICON_SIZE,
        label: translateQti(action.labelKey, { target: view.dom }),
        onClick: () => {
          const widgetPos = getPos();
          if (widgetPos == null) return;
          const target = nodeBeforeWidget(view.state, widgetPos, nodeTypeName);
          if (!target) return;
          void action.run({ view, pos: target.from, node: target.node, nodeTypeName, tagName });
        },
      }),
    );
  }

  return pill;
}

/**
 * The action pill as a decoration, ready to push.
 *
 * `pos` is the end of the decorated node. Emit this only while the selection is inside that node:
 * the pill's presence *is* the "clicked into" state, both to the reader and to the CSS.
 */
export function nodeActionsWidget(options: {
  /** Position just after the decorated node. */
  pos: number;
  nodeTypeName: string;
  tagName: string;
  anchorName?: string;
  actions?: readonly NodeAction[];
}): Decoration {
  const { pos, nodeTypeName, tagName, anchorName, actions } = options;

  return Decoration.widget(
    pos,
    (view, getPos) => createNodeActionsPill({ view, getPos, nodeTypeName, tagName, anchorName, actions }),
    { side: 1, key: `qti-node-actions-${nodeTypeName}-${pos}`, ignoreSelection: true, stopEvent: () => true },
  );
}
