import { createMigrationRegistry } from './index.js';

import type { CompatibilityChange, MigrationResult } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

export const CURRENT_JSON_DOCUMENT_VERSION = 2;
export const CURRENT_PERSISTED_STATE_VERSION = 2;

/**
 * DB SNAPSHOT ENVELOPE FORMAT
 *
 * All persisted documents are wrapped in this envelope before writing to
 * storage (localStorage, Firestore, etc.):
 *
 *   { "version": 2, "schemaVersion": 2, "doc": { ...NodeJSON } }
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

type JsonNode = NodeJSON & {
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

const LEGACY_ATTRIBUTE_RENAMES: Readonly<Record<string, string>> = {
  'response-identifier': 'responseIdentifier',
  'correct-response': 'correctResponse',
  'case-sensitive': 'caseSensitive',
  'area-mappings': 'areaMappings',
  'match-max': 'matchMax',
  'max-choices': 'maxChoices',
  'min-choices': 'minChoices',
  'expected-length': 'expectedLength',
  'expected-lines': 'expectedLines',
};

const jsonDocumentMigrationRegistry = createMigrationRegistry<NodeJSON>({
  targetVersion: CURRENT_JSON_DOCUMENT_VERSION,
  detectVersion(document, options) {
    if (typeof options?.sourceVersion === 'number') return options.sourceVersion;
    if (typeof options?.metadata?.documentVersion === 'number') return options.metadata.documentVersion;
    const candidate = document as { schemaVersion?: unknown };
    return typeof candidate.schemaVersion === 'number' ? candidate.schemaVersion : null;
  },
  steps: [
    {
      id: 'json-v1-to-v2-normalize-legacy-attrs',
      fromVersion: 1,
      toVersion: 2,
      description: 'Normalize legacy hyphenated snapshot attribute names to canonical JSON attrs.',
      migrate(document, context) {
        return renameLegacyAttributes(document, context.addChange.bind(context));
      },
    },
  ],
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

function renameLegacyAttributes(
  document: NodeJSON,
  addChange: (change: CompatibilityChange) => void,
): NodeJSON {
  return visitJsonNode(document as JsonNode, '$', addChange);
}

function visitJsonNode(
  node: JsonNode,
  path: string,
  addChange: (change: CompatibilityChange) => void,
): JsonNode {
  const nextAttrs = node.attrs ? renameNodeAttributes(node.attrs, path, node.type, addChange) : node.attrs;
  const nextContent = Array.isArray(node.content)
    ? node.content.map((child, index) => visitJsonNode(child, `${path}.content[${index}]`, addChange))
    : node.content;

  if (nextAttrs === node.attrs && nextContent === node.content) return node;

  return {
    ...node,
    ...(nextAttrs ? { attrs: nextAttrs } : {}),
    ...(nextContent ? { content: nextContent } : {}),
  };
}

function renameNodeAttributes(
  attrs: Record<string, unknown>,
  path: string,
  nodeType: string,
  addChange: (change: CompatibilityChange) => void,
): Record<string, unknown> {
  let changed = false;
  const nextAttrs: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attrs)) {
    const canonicalKey = LEGACY_ATTRIBUTE_RENAMES[key] ?? key;
    if (canonicalKey !== key) {
      changed = true;
      addChange({
        code: 'RENAME_ATTRIBUTE',
        severity: 'info',
        message: `Renamed legacy attribute "${key}" to "${canonicalKey}".`,
        path,
        nodeType,
        attributeName: canonicalKey,
        data: { previousAttributeName: key },
      });
    }

    if (!(canonicalKey in nextAttrs)) {
      nextAttrs[canonicalKey] = value;
      continue;
    }

    if (canonicalKey !== key) {
      addChange({
        code: 'ATTRIBUTE_REMOVED',
        severity: 'warning',
        message: `Dropped legacy attribute "${key}" because canonical attribute "${canonicalKey}" already existed.`,
        path,
        nodeType,
        attributeName: key,
        data: { keptAttributeName: canonicalKey },
      });
      changed = true;
      continue;
    }

    nextAttrs[key] = value;
  }

  return changed ? nextAttrs : attrs;
}

function isNodeJson(value: unknown): value is NodeJSON {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.type === 'string';
}
