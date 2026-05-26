import { createMigrationRegistry } from './index.js';
import { JSON_MIGRATION_STEPS } from './migrations.js';

import type { MigrationResult } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

/** Derived from the last entry in JSON_MIGRATION_STEPS — do not edit manually. */
export const CURRENT_JSON_DOCUMENT_VERSION = JSON_MIGRATION_STEPS[JSON_MIGRATION_STEPS.length - 1].toVersion;
export const CURRENT_PERSISTED_STATE_VERSION = 2;

/**
 * DB SNAPSHOT ENVELOPE FORMAT
 *
 * All persisted documents are wrapped in this envelope before writing to
 * storage (localStorage, Firestore, etc.):
 *
 *   { "version": 2, "schemaVersion": 3, "doc": { ...NodeJSON } }
 *
 * - `version`       — envelope format version (bumped if the wrapper shape changes)
 * - `schemaVersion` — document schema version at the time the doc was saved;
 *                     used as `sourceVersion` for `migrateJsonDocument` on read
 *
 * `readPersistedDocStateEnvelope` handles three legacy shapes without a version
 * marker: bare NodeJSON → treated as schemaVersion 1; envelope without
 * `schemaVersion` → falls back to `version`; missing both → assumes 1.
 *
 * Never write a file to storage using `writePersistedDocStateEnvelope` before
 * running migration — doing so stamps `schemaVersion: CURRENT` and prevents
 * future migration from running.
 */
export interface PersistedDocStateEnvelope {
  version: number;
  schemaVersion?: number;
  doc?: NodeJSON;
}

/** Result of reading a stored document envelope, including any migration that ran. */
export interface ReadPersistedDocStateResult {
  doc?: NodeJSON;
  envelopeVersion?: number;
  /** The schema version the document had at save time (before migration). */
  schemaVersion?: number;
  /** Present only when migration actually ran (sourceVersion < targetVersion). */
  compatibility?: MigrationResult<NodeJSON>;
}

const jsonDocumentMigrationRegistry = createMigrationRegistry<NodeJSON>({
  targetVersion: CURRENT_JSON_DOCUMENT_VERSION,
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
 * Pass `sourceVersion` when it is known (e.g. from a stored envelope). If
 * omitted, the pipeline attempts to detect it from the document itself, then
 * falls back to `fallbackVersion` (default 1) with a `VERSION_ASSUMED` warning.
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
 * Wraps a migrated document in the current versioned envelope for storage.
 * Always call this *after* migration — never before (see envelope format comment above).
 */
export function writePersistedDocStateEnvelope(doc: NodeJSON): PersistedDocStateEnvelope {
  return {
    version: CURRENT_PERSISTED_STATE_VERSION,
    schemaVersion: CURRENT_JSON_DOCUMENT_VERSION,
    doc,
  };
}

/**
 * Reads a stored value (envelope object, bare NodeJSON, or unknown garbage)
 * and returns the migrated document plus any compatibility metadata.
 *
 * Safe to call with untrusted input — returns `{}` for anything unparseable.
 */
export function readPersistedDocStateEnvelope(value: unknown): ReadPersistedDocStateResult {
  if (isNodeJson(value)) {
    return {
      doc: migrateJsonDocument(value, {
        sourceVersion: 1,
        metadata: { envelopeVersion: 1, envelopeShape: 'bare-doc' },
      }).document,
      envelopeVersion: 1,
      schemaVersion: 1,
      compatibility: migrateJsonDocument(value, {
        sourceVersion: 1,
        metadata: { envelopeVersion: 1, envelopeShape: 'bare-doc' },
      }),
    };
  }

  if (!value || typeof value !== 'object') return {};

  const envelope = value as Record<string, unknown>;
  const doc = envelope.doc;
  if (!isNodeJson(doc)) return {};

  const envelopeVersion = typeof envelope.version === 'number' ? envelope.version : 1;
  const schemaVersion = typeof envelope.schemaVersion === 'number'
    ? envelope.schemaVersion
    : typeof envelope.version === 'number'
      ? envelope.version
      : 1;

  const compatibility = migrateJsonDocument(doc, {
    sourceVersion: schemaVersion,
    metadata: {
      envelopeVersion,
      envelopeShape: 'object',
    },
  });

  return {
    doc: compatibility.document,
    envelopeVersion,
    schemaVersion,
    compatibility,
  };
}

function isNodeJson(value: unknown): value is NodeJSON {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.type === 'string';
}
