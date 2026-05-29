/**
 * Shared types for schema compatibility, document migration, and preservation.
 *
 * Pure TypeScript — no runtime dependencies.
 */

export type CompatibilitySourceKind = 'json' | 'html' | 'xml' | 'dom' | 'unknown';

export type CompatibilitySeverity = 'info' | 'warning' | 'error';

export type CompatibilityChangeCode =
  | 'VERSION_DETECTED'
  | 'VERSION_ASSUMED'
  | 'STEP_APPLIED'
  | 'RENAME_NODE'
  | 'RENAME_ATTRIBUTE'
  | 'ATTRIBUTE_MOVED'
  | 'DEFAULT_APPLIED'
  | 'NODE_REMOVED'
  | 'ATTRIBUTE_REMOVED'
  | 'UNKNOWN_NODE_PRESERVED'
  | 'UNKNOWN_ATTRIBUTE_PRESERVED'
  | 'UNSUPPORTED_CONTENT_PRESERVED';

export interface DocumentVersion {
  value: number;
  label?: string;
}

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

export interface CompatibilityMetadata {
  source: CompatibilitySourceKind;
  documentVersion?: number | null;
  [key: string]: unknown;
}

export interface MigrationResult<TDocument> {
  document: TDocument;
  sourceVersion: number;
  targetVersion: number;
  changes: CompatibilityChange[];
  preservedFragments: PreservedFragment[];
  appliedStepIds: string[];
  metadata: CompatibilityMetadata;
}

export interface MigrationContext {
  readonly sourceVersion: number;
  readonly targetVersion: number;
  readonly metadata: CompatibilityMetadata;
  addChange(change: CompatibilityChange): void;
  preserve(fragment: PreservedFragment): void;
}

export interface MigrationStep<TDocument> {
  id: string;
  fromVersion: number;
  toVersion: number;
  description?: string;
  migrate(document: TDocument, context: MigrationContext): TDocument;
}

export interface MigrateDocumentOptions {
  source: CompatibilitySourceKind;
  targetVersion: number;
  sourceVersion?: number | null;
  fallbackVersion?: number;
  metadata?: Record<string, unknown>;
}
