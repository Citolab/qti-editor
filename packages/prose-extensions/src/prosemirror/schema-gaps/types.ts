/**
 * SCHEMA GAPS — shared types.
 *
 * A gap is what a ProseMirror schema cannot represent in markup it is about to parse. ProseMirror's
 * `DOMParser` unwraps such an element and keeps going, which is the right behaviour — losing a
 * wrapper beats losing a document — but it tells nobody what it did. These types are the record of
 * what was lost.
 *
 * ## Why these are declared here rather than imported
 *
 * They used to come from `@citolab/prose-qti/interfaces`, and that import was the only thing tying
 * this module to a QTI package — and to a vocabulary it does not share. `CompatibilityChangeCode` is
 * a fifteen-member union; a gap scan produces two of them. The other thirteen name migration-ladder
 * operations (`RENAME_NODE`, `STEP_APPLIED`, `VERSION_DETECTED`) whose meaning lives with whoever
 * owns the stored documents, and `fromVersion` / `toVersion` are fields no scan ever sets. Inheriting
 * all of that to reach four fields is a dependency on someone else's problem — and it is what kept
 * this module in `prose-qti` when nothing about it is QTI.
 *
 * Declaring them here costs nothing at the boundary, because TypeScript is structural:
 * `SchemaGapCode` is a *subset* of `CompatibilityChangeCode`, so a `SchemaGapChange` is still
 * assignable to a `CompatibilityChange` with no import, no adapter and no cast. A host that models
 * both a migration ladder and a gap scan can put them in one list — `qti-editor-full-assessment`
 * does exactly that, and `prose-extensions` does not have to know it exists.
 */

/** How severe a finding is. Same three levels a `CompatibilityChange` uses, and deliberately so. */
export type SchemaGapSeverity = 'info' | 'warning' | 'error';

/**
 * The codes a gap scan can produce — and only those.
 *
 * A subset of the wider `CompatibilityChangeCode` union, which is what keeps the two assignable.
 * Two scans, two codes: the sentence they want is the same, so they are told apart here rather than
 * by `kind`.
 */
export type SchemaGapCode =
  /** An element the schema has no `parseDOM` rule for. */
  | 'UNKNOWN_NODE_PRESERVED'
  /** Content the editor models no equivalent for at all, such as unsupported response processing. */
  | 'UNSUPPORTED_CONTENT_PRESERVED';

/**
 * What kind of loss a change describes.
 *
 * One member today, and declared as a union anyway so that a `switch` over it stays a total function
 * when a second kind of scan is added. A reader gets the case from a field rather than by inferring
 * it from which optional fields happen to be set, which is the difference between a contract and a
 * habit.
 */
export type SchemaGapKind = 'unrepresentable-element';

/**
 * One finding: what could not be represented, and enough about it to name it to a person.
 *
 * Structurally assignable to `CompatibilityChange` — see the note at the top of this file.
 */
export interface SchemaGapChange {
  kind: SchemaGapKind;
  code: SchemaGapCode;
  severity: SchemaGapSeverity;
  /**
   * English, and a *fallback*: for logs, and for cases a host has written no phrasing for. Nothing
   * reads it programmatically and neither should a host — see {@link SchemaGapMessageResolver}.
   */
  message: string;
  /** A readable trail from the scanned root to what was found, for the audit record. */
  path: string;
  /** The tag name that could not be represented. */
  nodeType?: string;
  /** `excerpt`, `unwrappedChildren`, and whatever else a particular scan has to add. */
  data?: Record<string, unknown>;
}

/**
 * The content itself, kept verbatim.
 *
 * The scan reports what was lost; this is the thing that was lost. Keeping both means a host can
 * show a person what went missing without having to re-read the source file — and, if it ever grows
 * a migration for that content, has something to run it against.
 *
 * Structurally assignable to `PreservedFragment`, for the same reason as above.
 */
export interface SchemaGapFragment {
  path: string;
  /** Why it could not be kept, in a sentence, for a log or a bug report. */
  reason: string;
  payload: unknown;
  nodeType?: string;
}

/**
 * Replaces a change's message. Return `undefined` or `null` to keep the built-in English.
 *
 * Receives the whole change rather than `(code, data)` — the shape a migration step's `getMessage`
 * uses — because `nodeType` is a field on the change rather than an entry in `data`. A resolver
 * written against that older signature adapts in one line:
 * `change => existing(change.code, change.data ?? {})`.
 *
 * The built-in message is already set when this is called, so a resolver can defer to it selectively
 * — override the cases you care about, return `undefined` for the rest.
 */
export type SchemaGapMessageResolver = (change: SchemaGapChange) => string | null | undefined;

/** Options common to the functions that produce gap findings. */
export interface SchemaGapMessageOptions {
  /**
   * Localise or reword every message this call produces. See {@link SchemaGapMessageResolver}.
   *
   * A per-call option rather than a registry, deliberately: two consumers on one page would fight
   * over a module-level table, and a test would have to remember to reset it.
   */
  getMessage?: SchemaGapMessageResolver;
}

/** What a schema cannot represent in a DOM tree it is about to parse. */
export interface SchemaGapOutcome {
  changes: SchemaGapChange[];
  /** Everything removed, verbatim, so the content exists somewhere the document could not hold it. */
  preservedFragments: SchemaGapFragment[];
}
