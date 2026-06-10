import { createMigrationRegistry } from './index.js';
import { JSON_MIGRATION_STEPS } from './migrations/index.js';

import { CURRENT_SCHEMA_VERSION, type MigrationResult } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

/** The schema version every persisted document is migrated up to. */
export const CURRENT_JSON_DOCUMENT_VERSION = CURRENT_SCHEMA_VERSION;

/**
 * PERSISTED DOCUMENT FORMAT
 *
 * Documents are stored as the raw ProseMirror `NodeJSON` with a single extra
 * top-level property, `schemaVersion`, recording the schema version at save
 * time:
 *
 *   { "type": "doc", "schemaVersion": 6, "content": [ ... ] }
 *
 * `stampSchemaVersion` adds the marker before writing; `readPersistedDoc`
 * reads it back, strips it, and runs migration up to `CURRENT_SCHEMA_VERSION`.
 *
 * There is no separate storage envelope — the version travels with the doc.
 * Never stamp a document before migrating it: doing so marks it as current and
 * prevents future migration from running.
 */

/** Result of reading a stored document, including any migration that ran. */
export interface ReadPersistedDocStateResult {
  doc?: NodeJSON;
  /** The schema version the document had at save time (before migration). */
  schemaVersion?: number;
  /** Present only when migration actually ran (sourceVersion < targetVersion). */
  compatibility?: MigrationResult<NodeJSON>;
}

const jsonDocumentMigrationRegistry = createMigrationRegistry<NodeJSON>({
  targetVersion: CURRENT_SCHEMA_VERSION,
  detectVersion(document, options) {
    if (typeof options?.sourceVersion === 'number') return options.sourceVersion;
    if (typeof options?.metadata?.documentVersion === 'number') return options.metadata.documentVersion;
    const candidate = document as { schemaVersion?: unknown };
    return typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : null;
  },
  steps: JSON_MIGRATION_STEPS,
});

/**
 * Migrates a raw ProseMirror `NodeJSON` document to the current schema version.
 *
 * Pass `sourceVersion` when it is known. If omitted, the pipeline reads an
 * embedded `schemaVersion`, then falls back to `fallbackVersion` (default 1)
 * with a `VERSION_ASSUMED` warning.
 */
export function migrateJsonDocument(
  document: NodeJSON,
  options: {
    sourceVersion?: number | null;
    fallbackVersion?: number;
    metadata?: Record<string, unknown>;
  } = {},
): MigrationResult<NodeJSON> {
  return jsonDocumentMigrationRegistry.migrate(document, {
    source: 'json',
    sourceVersion: options.sourceVersion,
    fallbackVersion: options.fallbackVersion ?? 1,
    metadata: options.metadata,
  });
}

/**
 * Stamps the current schema version onto a (migrated) document for storage.
 * Always call this *after* migration — never before.
 */
export function stampSchemaVersion(doc: NodeJSON): NodeJSON {
  return { ...(doc as unknown as Record<string, unknown>), schemaVersion: CURRENT_SCHEMA_VERSION } as unknown as NodeJSON;
}

/**
 * Reads a stored value (a doc carrying an embedded `schemaVersion`, a bare
 * legacy `NodeJSON`, or unknown garbage) and returns the migrated document
 * plus any compatibility metadata.
 *
 * Safe to call with untrusted input — returns `{}` for anything unparseable.
 */
export function readPersistedDoc(value: unknown): ReadPersistedDocStateResult {
  if (!isNodeJson(value)) return {};

  const { schemaVersion: embeddedVersion, ...rawDoc } = value as unknown as Record<string, unknown>;
  const schemaVersion = typeof embeddedVersion === 'number' ? embeddedVersion : 1;
  const doc = rawDoc as unknown as NodeJSON;

  const compatibility = migrateJsonDocument(doc, {
    sourceVersion: typeof embeddedVersion === 'number' ? embeddedVersion : undefined,
  });

  return {
    doc: compatibility.document,
    schemaVersion,
    compatibility,
  };
}

function isNodeJson(value: unknown): value is NodeJSON {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.type === 'string';
}
