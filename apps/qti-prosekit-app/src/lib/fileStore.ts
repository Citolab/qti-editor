import {
  readPersistedDoc,
  stampSchemaVersion,
} from './compatibility/index.js';

import type { NodeJSON } from 'prosekit/core';
import type { MigrationResult } from '@citolab/prose-qti/interfaces';

/**
 * File management backed by localStorage.
 * Designed so the storage layer can later be swapped for Firestore
 * by replacing these functions with async equivalents and updating
 * the React Query query/mutation functions in App.tsx.
 */

export const GUEST_STORAGE_SCOPE = 'guest';

export type StorageScope = typeof GUEST_STORAGE_SCOPE | `user:${string}`;

const AUTO_SAVE_KEY_SUFFIX = 'prosemirror-doc:v1';
const FILES_KEY_SUFFIX = 'saved-files';
const CURRENT_FILE_ID_KEY_SUFFIX = 'current-file-id';
const QUARANTINE_KEY_SUFFIX = 'prosemirror-doc:quarantine';

let activeStorageScope: StorageScope = GUEST_STORAGE_SCOPE;

function scopedKey(scope: StorageScope, suffix: string): string {
  return `qti-editor:${scope}:${suffix}`;
}

export function getStorageScopeForUser(userId?: string | null): StorageScope {
  return userId ? `user:${userId}` : GUEST_STORAGE_SCOPE;
}

export function setActiveStorageScope(scope: StorageScope): void {
  activeStorageScope = scope;
}

export function getActiveStorageScope(): StorageScope {
  return activeStorageScope;
}

export function getAutoSaveKey(scope: StorageScope = activeStorageScope): string {
  return scopedKey(scope, AUTO_SAVE_KEY_SUFFIX);
}

function getFilesKey(scope: StorageScope = activeStorageScope): string {
  return scopedKey(scope, FILES_KEY_SUFFIX);
}

function getCurrentFileIdKey(scope: StorageScope = activeStorageScope): string {
  return scopedKey(scope, CURRENT_FILE_ID_KEY_SUFFIX);
}

export function getQuarantineKey(scope: StorageScope = activeStorageScope): string {
  return scopedKey(scope, QUARANTINE_KEY_SUFFIX);
}

/**
 * Copies the autosaved document aside so an unreadable one is never simply lost.
 *
 * A document that cannot be loaded is not a document that should be destroyed — it is usually a
 * schema change that has outrun the migration ladder, which is recoverable once the missing step
 * exists. For a document that was never saved to a file, the autosave key is the only copy there is.
 *
 * This only copies. Whatever should happen to the live autosave key afterwards is the caller's
 * decision — `clearAutoSaveDoc` when nothing could be recovered, or writing the recovered document
 * over it when salvage succeeded — so that neither outcome can silently become a deletion.
 *
 * Overwrites any previous quarantine: the newest unreadable document is the one being diagnosed.
 */
export function quarantineAutoSaveDoc(
  scope: StorageScope = activeStorageScope,
  reason?: string,
): boolean {
  try {
    const raw = localStorage.getItem(getAutoSaveKey(scope));
    if (raw == null) return false;
    localStorage.setItem(
      getQuarantineKey(scope),
      JSON.stringify({ quarantinedAt: new Date().toISOString(), reason, doc: raw }),
    );
    return true;
  } catch {
    // Storage unavailable or full — report the failure so the caller does not clear on the
    // assumption that a copy was made.
    return false;
  }
}

/** Clears the live autosave slot. Separate from quarantining, so a copy is always made first. */
export function clearAutoSaveDoc(scope: StorageScope = activeStorageScope): void {
  localStorage.removeItem(getAutoSaveKey(scope));
}

/** A document set aside because it could not be loaded. */
export interface QuarantinedDoc {
  quarantinedAt: string;
  reason?: string;
  /** The stored document, exactly as it was on disk — a JSON string, not a parsed doc. */
  doc: string;
}

/**
 * Reads back the quarantined document, if there is one.
 *
 * Quarantine was write-only when it was introduced: the copy was made and there was no way to reach
 * it, which makes it a safety net nobody can climb into. Handing it back is what turns "content was
 * removed" from an apology into something the reader can act on — they can keep the file, send it on,
 * or wait for a migration step and open it again.
 *
 * Returns the raw stored string rather than a parsed document on purpose. It failed to load; parsing
 * it here would be the same mistake in a different place.
 */
export function readQuarantinedDoc(scope: StorageScope = activeStorageScope): QuarantinedDoc | null {
  try {
    const raw = localStorage.getItem(getQuarantineKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuarantinedDoc>;
    if (typeof parsed?.doc !== 'string') return null;
    return {
      quarantinedAt: typeof parsed.quarantinedAt === 'string' ? parsed.quarantinedAt : '',
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
      doc: parsed.doc,
    };
  } catch {
    return null;
  }
}

export interface SavedFile {
  id: string;
  name: string;
  savedAt: string; // ISO 8601
  doc: unknown;    // ProseMirror JSON doc
  schemaVersion?: number;
}

export function listFiles(scope: StorageScope = activeStorageScope): SavedFile[] {
  try {
    const raw = localStorage.getItem(getFilesKey(scope));
    return raw ? (JSON.parse(raw) as SavedFile[]) : [];
  } catch {
    return [];
  }
}

export function saveFile(
  scope: StorageScope = activeStorageScope,
  name: string,
  existingId?: string
): SavedFile {
  let doc: unknown = null;
  let schemaVersion: number | undefined;
  try {
    const raw = localStorage.getItem(getAutoSaveKey(scope));
    // The autosave value is the bare ProseMirror doc carrying an embedded
    // `schemaVersion` marker.
    const parsed = raw ? (JSON.parse(raw) as { schemaVersion?: number } | null) : null;
    doc = parsed ?? null;
    schemaVersion = typeof parsed?.schemaVersion === 'number' ? parsed.schemaVersion : undefined;
  } catch { /* ignore corrupt state */ }

  const file: SavedFile = {
    id: existingId ?? crypto.randomUUID(),
    name,
    savedAt: new Date().toISOString(),
    doc,
    ...(typeof schemaVersion === 'number' ? { schemaVersion } : {}),
  };

  const files = listFiles(scope).filter(f => f.id !== file.id);
  files.unshift(file);
  localStorage.setItem(getFilesKey(scope), JSON.stringify(files));
  localStorage.setItem(getCurrentFileIdKey(scope), file.id);
  return file;
}

export interface LoadFileResult {
  file: SavedFile;
  /** Present when migration actually ran (sourceVersion < targetVersion). */
  compatibility?: MigrationResult<unknown>;
}

/**
 * What came of trying to open a file.
 *
 * `refused` used to be a bare `null`, indistinguishable from "no such file", and the caller treated
 * both as nothing-to-do: clicking the file in the list did nothing at all, with no message. A stored
 * document that cannot be read is the single most important thing this app has to say, so it gets its
 * own outcome and carries the file it is about — the name is what makes the news usable.
 */
export type LoadFileOutcome =
  | { status: 'loaded'; file: SavedFile; compatibility?: MigrationResult<unknown> }
  | { status: 'missing' }
  | { status: 'refused'; file: SavedFile };

export function loadFile(scope: StorageScope = activeStorageScope, id: string): LoadFileOutcome {
  const file = listFiles(scope).find(f => f.id === id);
  if (!file) return { status: 'missing' };

  // Run migration eagerly so any legacy attrs are normalised before the
  // editor sees them, and so the migration report is available to the caller.
  // The stored doc carries its own embedded schemaVersion marker.
  const result = readPersistedDoc(file.doc);

  // Write the migrated content stamped at the current version so the
  // editor skips re-migration when it reads from localStorage.
  if (!result.doc) {
    // Present but unreadable — migration could not run on it. Refuse the load and leave the stored
    // file exactly as it is. The previous behaviour fell back to the raw `file.doc` and stamped it
    // at the CURRENT version, so an unmigrated document was recorded as up to date and the ladder
    // would skip it from then on: the one outcome that cannot be repaired later.
    if (file.doc != null) return { status: 'refused', file };

    // Absent, rather than broken — a file saved while the editor was empty. That is openable; it
    // just starts from the default rather than a document.
    localStorage.removeItem(getAutoSaveKey(scope));
  } else {
    localStorage.setItem(
      getAutoSaveKey(scope),
      JSON.stringify(stampSchemaVersion(result.doc as NodeJSON)),
    );
  }
  localStorage.setItem(getCurrentFileIdKey(scope), id);

  const migrationRan =
    result.compatibility != null &&
    result.compatibility.sourceVersion < result.compatibility.targetVersion;

  return { status: 'loaded', file, compatibility: migrationRan ? result.compatibility : undefined };
}

export function deleteFile(scope: StorageScope = activeStorageScope, id: string): void {
  const files = listFiles(scope).filter(f => f.id !== id);
  localStorage.setItem(getFilesKey(scope), JSON.stringify(files));
  const currentId = localStorage.getItem(getCurrentFileIdKey(scope));
  if (currentId === id) localStorage.removeItem(getCurrentFileIdKey(scope));
}

export function getCurrentFile(scope: StorageScope = activeStorageScope): SavedFile | null {
  const id = localStorage.getItem(getCurrentFileIdKey(scope));
  if (!id) return null;
  return listFiles(scope).find(f => f.id === id) ?? null;
}

export function clearCurrentSession(scope: StorageScope = activeStorageScope): void {
  localStorage.removeItem(getAutoSaveKey(scope));
  localStorage.removeItem(getCurrentFileIdKey(scope));
}

/**
 * Merge incoming files into localStorage. Later savedAt wins on conflict.
 * Used by the Firestore sync layer to pull remote files on login.
 */
export function importFiles(
  incoming: SavedFile[],
  scope: StorageScope = activeStorageScope
): void {
  const local = listFiles(scope);
  const byId = new Map(local.map(f => [f.id, f]));
  for (const file of incoming) {
    const existing = byId.get(file.id);
    if (!existing || new Date(file.savedAt) > new Date(existing.savedAt)) {
      byId.set(file.id, file);
    }
  }
  const merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
  localStorage.setItem(getFilesKey(scope), JSON.stringify(merged));
}
