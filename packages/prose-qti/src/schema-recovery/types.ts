/**
 * SCHEMA RECOVERY — shared types.
 *
 * Recovery is what happens when content and schema disagree: the schema no longer has a node the
 * stored document uses, or the imported XML uses an element no node spec can parse. ProseMirror's
 * two entry points disagree about that case — `DOMParser` unwraps what it cannot represent and keeps
 * going, while `Node.fromJSON` throws and loses the whole document — and neither tells anyone what
 * it did.
 *
 * These types are the record of what was lost, and where. They are deliberately free of QTI
 * vocabulary and of any storage concern: a host decides what versions mean, where documents live,
 * and how to phrase the news. This layer only answers "what could this schema not represent, and
 * where in the result did that content used to be".
 */

import type { CompatibilityChange, PreservedFragment } from '@citolab/prose-qti/interfaces';

/**
 * Loose structural view of a ProseMirror node's JSON form.
 *
 * Declared here rather than imported so this module needs nothing but `prosemirror-model` — the
 * plain-ProseMirror host has no ProseKit to borrow `NodeJSON` from, and salvage runs *before* the
 * document is parsed, so every field has to be optional anyway.
 */
export interface NodeJson {
  type: string;
  attrs?: Record<string, unknown>;
  content?: NodeJson[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
}

/**
 * A place in the recovered document where content was removed.
 *
 * Carries a child-index path rather than a ProseMirror position because it is produced while
 * salvaging plain JSON — there is no document to take positions in yet. `resolveRecoverySites`
 * turns these into positions once the document exists.
 */
export interface RecoverySite {
  /** Correlates the site with the `CompatibilityChange` that describes it (`change.data.siteId`). */
  id: string;
  kind: RecoverySiteKind;
  /**
   * Child indexes from the document root down to the first affected node, in the *salvaged*
   * document's coordinates. An unwrapped node's children keep its place, so the path points at
   * them, not at where it used to be in the original.
   */
  path: number[];
  /**
   * How many sibling nodes at `path` the site covers. `0` means nothing survived there — the site
   * is a gap between siblings, and marking it is the only way to show the content is gone.
   */
  span: number;
  /**
   * Type name expected at `path` in the salvaged document. `resolveRecoverySites` checks it and
   * discards the site if it does not match, so a host that rewrites the document after salvage
   * (adding a required header, normalising siblings) loses its markers rather than mismarking.
   */
  expectedType?: string;
  /** The node, mark or attribute type that was removed. */
  removedType?: string;
  /** A short quote of the removed content, for naming it to a person. */
  excerpt?: string;
}

export type RecoverySiteKind =
  | 'unwrapped-node'
  | 'dropped-mark'
  | 'reset-attribute'
  | 'dropped-attribute'
  | 'dropped-entry';

/**
 * What kind of removal a change describes.
 *
 * The reason this exists as a declared field rather than something a reader works out: it was
 * *inferable* and that is not the same as knowable. A dropped mark was `UNKNOWN_NODE_PRESERVED` plus
 * the presence of `data.markType`; a reset attribute was `UNKNOWN_ATTRIBUTE_PRESERVED` plus the
 * presence of `data.rejectedValue`. Both correct, both requiring a reader to reverse-engineer which
 * optional fields distinguish which case — fine for the one host that grew up alongside the code, and
 * an unwritten contract for anyone else.
 *
 * With `kind`, a message table is a total function over a closed union: `switch` on it, let the
 * compiler find the case you forgot.
 *
 * `unrepresentable-element` is the DOM scan's, and it is deliberately not folded into
 * `unwrapped-node` even though `DOMParser` unwraps it the same way. The two want different sentences:
 * one is *"this element has no equivalent in this editor"* about a file being imported, the other is
 * *"this was removed from your saved document"* about work already done.
 */
export type RecoveryChangeKind = RecoverySiteKind | 'unrepresentable-element';

/**
 * A `CompatibilityChange` from the recovery layer, which always says what kind it is.
 *
 * Assignable to `CompatibilityChange` everywhere, so a host that does not care sees no difference —
 * `kind` is a widening, not a fork.
 */
export type RecoveryChange = CompatibilityChange & { kind: RecoveryChangeKind };

/**
 * Replaces a change's message. Return `undefined` or `null` to keep the built-in English.
 *
 * Receives the whole change rather than `(code, data)` — the shape the migration ladder's
 * `getMessage` uses — because `code` alone cannot tell these cases apart: three of the five share
 * `UNKNOWN_NODE_PRESERVED` / `UNKNOWN_ATTRIBUTE_PRESERVED`, and `nodeType` / `attributeName` are
 * fields on the change rather than entries in `data`. A resolver written against the ladder's
 * signature adapts in one line: `change => existing(change.code, change.data ?? {})`.
 *
 * The built-in message is already set when this is called, so a resolver can defer to it selectively
 * — override the two kinds you care about, return `undefined` for the rest.
 */
export type RecoveryMessageResolver = (change: RecoveryChange) => string | null | undefined;

/** Options common to the functions that produce recovery changes. */
export interface RecoveryMessageOptions {
  /**
   * Localise or reword every message this call produces. See {@link RecoveryMessageResolver}.
   *
   * A per-call option rather than a registry, deliberately: two consumers on one page would fight
   * over a module-level table, and a test would have to remember to reset it.
   */
  getMessage?: RecoveryMessageResolver;
}

/** What `salvageJsonDocument` recovered, and at what cost. */
export interface SalvageOutcome {
  /** The document as the schema can hold it. */
  document: NodeJson;
  changes: RecoveryChange[];
  /** Everything removed, verbatim, so a later migration step has something to run against. */
  preservedFragments: PreservedFragment[];
  /** Where in `document` each removal happened. */
  sites: RecoverySite[];
}

/** What a schema cannot represent in a DOM tree it is about to parse. */
export interface SchemaGapOutcome {
  changes: RecoveryChange[];
  preservedFragments: PreservedFragment[];
}

/** Reads the site id a change was recorded with, if any. */
export function siteIdOf(change: CompatibilityChange): string | undefined {
  const id = change.data?.siteId;
  return typeof id === 'string' ? id : undefined;
}

/**
 * Reads the kind off a change, if it carries one.
 *
 * For the round trip: a change that has travelled through a `CompatibilityReport`, an event, or JSON
 * arrives typed as a plain `CompatibilityChange`, and this narrows it back. Returns `undefined` for
 * changes from the migration ladder, which describe edits rather than removals and have no kind.
 */
export function recoveryKindOf(change: CompatibilityChange): RecoveryChangeKind | undefined {
  const kind = (change as Partial<RecoveryChange>).kind;
  return kind && RECOVERY_CHANGE_KINDS.has(kind) ? kind : undefined;
}

const RECOVERY_CHANGE_KINDS = new Set<RecoveryChangeKind>([
  'unwrapped-node',
  'dropped-mark',
  'reset-attribute',
  'dropped-attribute',
  'dropped-entry',
  'unrepresentable-element',
]);

/** Reads the content excerpt a change was recorded with, if any. */
export function excerptOf(change: CompatibilityChange): string | undefined {
  const excerpt = change.data?.excerpt;
  return typeof excerpt === 'string' && excerpt.length > 0 ? excerpt : undefined;
}
