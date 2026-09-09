import { DOMParser, DOMSerializer, type Node as PmNode, type Schema } from 'prosemirror-model';
import { Plugin, PluginKey, type Transaction } from 'prosemirror-state';
import { parseAuthoringReply, type AuthoringReply, type Operation } from '@citolab/qti-ai-core';

import {
  applyVocabulary,
  attributeValueError,
  createCapabilities,
  tagOf,
  type CapabilityOptions
} from './capabilities.js';
import {
  childIdentifiers,
  isInteraction,
  remapResponse,
  responseIdentifiers,
  validateResponses,
  withUniqueResponseIdentifiers
} from './structural.js';

import type { Fragment } from 'prosemirror-model';
import type { EditorView } from 'prosemirror-view';

export * from './capabilities.js';
export {
  childIdentifiers,
  isInteraction,
  remapResponse,
  responseEntries,
  responseIdentifiers,
  validateResponses,
  withUniqueResponseIdentifiers
} from './structural.js';
export { BASELINE_VERSION, attributeAnnotations, vocabularyBaseline } from './baseline.js';

export interface AuthoringOptions extends CapabilityOptions {
  /** Host veto/semantic validator. Throw to prevent preparing or accepting an invalid result. */
  validateDocument?: (doc: PmNode) => void;
}
interface Target {
  id: string;
  pos: number;
  node: PmNode;
  deleted: boolean;
}
export interface AuthoringSnapshot {
  requestId: string;
  capabilityId: string;
  doc: PmNode;
  targets: Map<string, Target>;
}
interface SessionState {
  snapshots: AuthoringSnapshot[];
  used: Set<string>;
}
const key = new PluginKey<SessionState>('qti-authoring');
/** Mapping snapshots through author transactions lets unrelated edits survive proposal acceptance. */
export function createAuthoringPlugin(): Plugin<SessionState> {
  return new Plugin<SessionState>({
    key,
    state: {
      init: () => ({ snapshots: [], used: new Set<string>() }),
      apply(tr, state) {
        let snapshots = state.snapshots.map(s => ({
          ...s,
          targets: new Map(
            [...s.targets].map(([id, t]) => {
              if (t.pos < 0) return [id, t];
              const mapped = tr.mapping.mapResult(t.pos, 1);
              return [id, { ...t, pos: mapped.pos, deleted: t.deleted || mapped.deletedAfter }];
            })
          )
        }));
        const meta = tr.getMeta(key) as { capture?: AuthoringSnapshot; used?: string; clear?: boolean } | undefined;
        if (meta?.clear) snapshots = [];
        if (meta?.capture) snapshots = [...snapshots.slice(-7), meta.capture];
        const used = new Set(state.used);
        if (meta?.used) {
          used.add(meta.used);
          snapshots = snapshots.filter(s => s.requestId !== meta.used);
        }
        return { snapshots, used };
      }
    }
  });
}
function serialize(node: PmNode, schema: Schema, document: Document): string {
  const div = document.createElement('div');
  div.append(DOMSerializer.fromSchema(schema).serializeFragment(node.content, { document }));
  return div.innerHTML;
}
export function captureAuthoringContext(
  view: EditorView,
  options: AuthoringOptions = {},
  requestId = crypto.randomUUID()
) {
  if (!key.getState(view.state)) throw new Error('Install createAuthoringPlugin before capturing context.');
  const capabilities = createCapabilities(view.state.schema, options);
  const targets = new Map<string, Target>();
  targets.set('document', { id: 'document', pos: -1, node: view.state.doc, deleted: false });
  view.state.doc.descendants((node, pos) => {
    if (node.isText) return;
    const id = `n${targets.size}`;
    targets.set(id, { id, pos, node, deleted: false });
  });
  const snapshot: AuthoringSnapshot = { requestId, capabilityId: capabilities.id, doc: view.state.doc, targets };
  view.dispatch(view.state.tr.setMeta(key, { capture: snapshot }));
  const { from, to } = view.state.selection;
  return {
    requestId,
    capabilityId: capabilities.id,
    capabilities,
    documentHtml: serialize(view.state.doc, view.state.schema, view.dom.ownerDocument),
    targets: [...targets.values()].map(t => ({
      id: t.id,
      nodeType: t.node.type.name,
      attributes: t.node.attrs,
      text: t.node.textContent.slice(0, 180),
      selected: t.pos >= 0 && t.pos <= to && t.pos + t.node.nodeSize >= from
    })),
    responseRules:
      'correctResponse: comma-separated identifiers, or strings for text entry; order: every choice identifier exactly once, comma-separated, in the intended order (e.g. "B,C,A"); directed pairs are comma-separated "source target". maxChoices: 1 radio, 0 unlimited checkboxes, n>1 at most n checkboxes. Preserve identifiers and the response identifier on replacements and conversions; mint unique identifiers for insertions. score defaults to 1.'
  };
}
function lookup(view: EditorView, reply: AuthoringReply, options: AuthoringOptions): AuthoringSnapshot {
  const state = key.getState(view.state);
  if (state?.used.has(reply.requestId)) throw new Error('This proposal has already been settled.');
  const snapshot = state?.snapshots.find(s => s.requestId === reply.requestId);
  if (
    !snapshot ||
    snapshot.capabilityId !== reply.capabilityId ||
    createCapabilities(view.state.schema, options).id !== reply.capabilityId
  )
    throw new Error('The request or editor capabilities have changed. Please ask again.');
  return snapshot;
}
function targetAt(tr: Transaction, snapshot: AuthoringSnapshot, id: string): { node: PmNode; pos: number } {
  const target = snapshot.targets.get(id);
  if (!target || target.deleted) throw new Error('The target no longer exists. Please ask again.');
  if (target.pos === -1) {
    if (!tr.before.eq(snapshot.doc))
      throw new Error('The item changed while the proposal was prepared. Please ask again.');
    return { node: tr.doc, pos: -1 };
  }
  const pos = tr.mapping.map(target.pos);
  const node = tr.doc.nodeAt(pos);
  // Multiple operations on one target are checked against the original current state once below.
  if (!node) throw new Error('Missing target.');
  return { node, pos };
}
function safeHtml(html: string, view: EditorView): Fragment {
  const root = view.dom.ownerDocument.createElement('div');
  root.innerHTML = html;
  const allowed = new Set(Object.keys(view.state.schema.nodes).map(n => tagOf(view.state.schema, n)));
  for (const mark of Object.values(view.state.schema.marks)) {
    const dom = mark.spec.toDOM?.(mark.create(), true);
    if (Array.isArray(dom)) allowed.add(String(dom[0]));
  }
  ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tbody'].forEach(t => allowed.add(t));
  for (const el of root.querySelectorAll('*')) {
    if (!allowed.has(el.localName)) throw new Error(`Unsupported element: ${el.localName}`);
    for (const attr of el.attributes) {
      if (
        /^on/i.test(attr.name) ||
        attr.name === 'style' ||
        /^(javascript|vbscript|data):/i.test(attr.value.trim()) ||
        attr.name === 'srcdoc'
      )
        throw new Error(`Unsafe attribute: ${attr.name}`);
    }
  }
  const parsed = DOMParser.fromSchema(view.state.schema).parseSlice(root, { preserveWhitespace: true });
  if (!parsed.content.size) throw new Error('No supported content in proposal.');
  const result = view.dom.ownerDocument.createElement('div');
  result.append(
    DOMSerializer.fromSchema(view.state.schema).serializeFragment(parsed.content, { document: view.dom.ownerDocument })
  );
  // Reject silently dropped elements/attributes, while permitting serializer defaults and wrappers.
  const output = [...result.querySelectorAll('*')];
  for (const original of root.querySelectorAll('*')) {
    if (original.localName === 'tbody') continue;
    const i = output.findIndex(
      el =>
        el.localName === original.localName &&
        el.textContent === original.textContent &&
        [...original.attributes].every(
          a => el.getAttribute(a.name) === a.value || (a.value === 'false' && !el.hasAttribute(a.name))
        )
    );
    if (i < 0) throw new Error(`The editor cannot preserve ${original.localName} or its attributes.`);
    output.splice(i, 1);
  }
  return parsed.content;
}
function build(view: EditorView, reply: AuthoringReply, options: AuthoringOptions): Transaction {
  const snapshot = lookup(view, reply, options);
  const caps = createCapabilities(view.state.schema, options);
  for (const op of reply.operations) {
    const t = snapshot.targets.get(op.target);
    if (!t || t.deleted || (t.pos >= 0 && !view.state.doc.nodeAt(t.pos)?.eq(t.node)))
      throw new Error('The target has changed. Please ask again.');
  }
  const tr = view.state.tr;
  for (const op of reply.operations) {
    const { node, pos } = targetAt(tr, snapshot, op.target);
    if (op.kind === 'remove') {
      if (pos < 0) throw new Error('Remove a specific node, not the whole item.');
      const $pos = tr.doc.resolve(pos);
      // The enclosing interaction, if any: a gap sits in a paragraph inside its interaction.
      let depth = $pos.depth;
      while (depth > 0 && !isInteraction($pos.node(depth))) depth--;
      const interaction = depth > 0 ? $pos.node(depth) : null;
      tr.delete(pos, pos + node.nodeSize);
      // A removed distractor, gap or hottext must leave the interaction's answer key coherent.
      if (interaction) {
        const removed = childIdentifiers(node);
        if (removed.size) {
          const interactionPos = $pos.before(depth);
          const current = tr.doc.nodeAt(interactionPos)!;
          tr.setNodeMarkup(interactionPos, undefined, {
            ...current.attrs,
            correctResponse: remapResponse(interaction, removed)
          });
        }
      }
    } else if (op.kind === 'convert') {
      if (pos < 0 || !isInteraction(node)) throw new Error('Convert an interaction, not arbitrary content.');
      const taken = responseIdentifiers(tr.doc);
      for (const id of responseIdentifiers(node)) taken.delete(id);
      const content = withUniqueResponseIdentifiers(safeHtml(op.html, view), taken);
      const replacement = content.childCount === 1 ? content.firstChild : null;
      if (!replacement || replacement.type.name !== op.to || !isInteraction(replacement))
        throw new Error(`The conversion must produce exactly one ${op.to}.`);
      if (replacement.type.name === node.type.name) throw new Error('Conversion needs a different interaction type.');
      // The response identifier is the item's, not the model's: keep it so declarations and scoring follow.
      const attrs: Record<string, unknown> = {
        ...replacement.attrs,
        responseIdentifier: node.attrs.responseIdentifier
      };
      // Parsing fills a missing score with the default, so ask the HTML itself whether one was given.
      const probe = view.dom.ownerDocument.createElement('div');
      probe.innerHTML = op.html;
      if ('score' in replacement.attrs && !probe.firstElementChild?.hasAttribute('score'))
        attrs.score = node.attrs.score ?? 1;
      tr.replaceWith(pos, pos + node.nodeSize, replacement.type.create(attrs, replacement.content, replacement.marks));
    } else if (op.kind === 'insert' || op.kind === 'replace') {
      // Identifiers already in the item are taken; a replaced node's own are free again.
      const taken = responseIdentifiers(tr.doc);
      if (op.kind === 'replace' && pos >= 0) for (const id of responseIdentifiers(node)) taken.delete(id);
      const content = withUniqueResponseIdentifiers(safeHtml(op.html, view), taken);
      if (pos < 0) {
        if (op.kind === 'replace') throw new Error('Replace a specific target, not the whole item.');
        if (tr.doc.childCount === 1 && tr.doc.firstChild?.isTextblock && !tr.doc.firstChild.content.size)
          tr.replaceWith(0, tr.doc.content.size, content);
        else tr.insert(tr.doc.content.size, content);
      } else if (op.kind === 'replace') tr.replaceWith(pos, pos + node.nodeSize, content);
      else tr.insert(pos + node.nodeSize, content);
    } else {
      if (pos < 0) throw new Error('Select a node for attribute changes.');
      const next = { ...node.attrs };
      const cap = caps.nodes[node.type.name];
      if (op.kind === 'setVocabulary') {
        const group = cap.vocabulary.find(g => g.id === op.group);
        if (!group) throw new Error(`Unsupported vocabulary group: ${op.group}`);
        next.class = applyVocabulary(next.class, group, op.value);
      } else {
        for (const [attr, value] of Object.entries(op.attributes)) {
          const spec = cap.attributes[attr];
          if (!spec) throw new Error(`Unknown attribute: ${attr}`);
          const error = attributeValueError(attr, spec, value);
          if (error) throw new Error(error);
          next[attr] = value;
        }
      }
      tr.setNodeMarkup(pos, undefined, next);
    }
  }
  tr.doc.check();
  validateResponses(tr.doc);
  options.validateDocument?.(tr.doc);
  return tr;
}
export interface PreparedProposal {
  reply: AuthoringReply;
  changes: string[];
}
export function prepareProposal(view: EditorView, raw: unknown, options: AuthoringOptions = {}): PreparedProposal {
  const reply = parseAuthoringReply(raw);
  build(view, reply, options);
  return {
    reply,
    changes: reply.operations.map((op: Operation) =>
      op.kind === 'setAttributes'
        ? `${op.target}: ${Object.entries(op.attributes)
            .map(([k, v]) => `${k} → ${JSON.stringify(v)}`)
            .join(', ')}`
        : op.kind === 'setVocabulary'
          ? `${op.target}: ${op.group} → ${op.value ?? 'default'}`
          : op.kind === 'convert'
            ? `${op.target}: convert → ${op.to}`
            : `${op.kind}: ${op.target}`
    )
  };
}
export function acceptProposal(view: EditorView, prepared: PreparedProposal, options: AuthoringOptions = {}): void {
  const tr = build(view, prepared.reply, options);
  view.dispatch(tr.setMeta(key, { used: prepared.reply.requestId }).scrollIntoView());
}
export function discardProposal(view: EditorView, requestId: string): void {
  view.dispatch(view.state.tr.setMeta(key, { used: requestId }));
}
export function clearAuthoringContext(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(key, { clear: true }));
}
