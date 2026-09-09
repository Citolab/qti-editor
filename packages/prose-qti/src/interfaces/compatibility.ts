/**
 * The change log and the set-aside content a compatibility pass reports.
 *
 * Pure TypeScript — no runtime dependencies.
 *
 * This file used to carry the document-migration vocabulary as well — `CURRENT_SCHEMA_VERSION`,
 * `MigrationStep`, `MigrationContext`, `MigrationResult`, `MigrateDocumentOptions`,
 * `CompatibilityMetadata` and `CompatibilitySourceKind`. All of it moved to the one app that
 * versions and migrates stored documents, at `src/lib/compatibility/types.ts` in the
 * `qti-editor-full-assessment` repository, beside the ladder and the registry that give the types
 * meaning. Nothing in this package ever referenced them: the migration engine was never here, only
 * its type declarations, and a schema version this package cannot bump is a number it should not
 * own. `docs/testing-findings.md` (finding 20) already put the ladder there on purpose.
 *
 * **Nothing in this repository imports these types any more.** `schema-gaps` did, until it was
 * decoupled so it could be lifted out and released on its own; it now declares its own narrowed
 * `SchemaGapChange` and `SchemaGapFragment`. That costs nothing at the boundary, because TypeScript
 * is structural: `SchemaGapCode` is a subset of `CompatibilityChangeCode`, so a gap finding is still
 * assignable to a `CompatibilityChange` with no import and no adapter, and a host that models both a
 * migration ladder and a gap scan can put them in one list.
 *
 * These declarations therefore survive for one reason only: the `qti-editor-full-assessment`
 * application imports `CompatibilityChange` and `CompatibilityReport` from
 * `@citolab/prose-qti/interfaces` today. If that app stops needing them, this file and
 * `compatibility-report.ts` have no consumer left anywhere.
 */

export type CompatibilitySeverity = 'info' | 'warning' | 'error';

export type CompatibilityChangeCode =
  | 'VERSION_DETECTED'
  | 'VERSION_ASSUMED'
  | 'STEP_APPLIED'
  | 'RENAME_NODE'
  | 'RENAME_ATTRIBUTE'
  | 'ATTRIBUTE_MOVED'
  | 'ATTRIBUTE_COERCED'
  | 'NODE_WRAPPED'
  | 'DEFAULT_APPLIED'
  | 'NODE_REMOVED'
  | 'ATTRIBUTE_REMOVED'
  | 'UNKNOWN_NODE_PRESERVED'
  | 'UNKNOWN_ATTRIBUTE_PRESERVED'
  | 'UNSUPPORTED_CONTENT_PRESERVED'
  // A stored document could not be read at all. The only code here that is not about a change made
  // to a document — it reports that no change was made, and why.
  | 'DOCUMENT_UNREADABLE';

export interface CompatibilityChange {
  code: CompatibilityChangeCode;
  severity: CompatibilitySeverity;
  message: string;
  path?: string;
  fromVersion?: number;
  toVersion?: number;
  nodeType?: string;
  attributeName?: string;
  data?: Record<string, unknown>;
}

export interface PreservedFragment {
  path: string;
  reason: string;
  payload: unknown;
  nodeType?: string;
  attributeName?: string;
  sourceVersion?: number;
}
