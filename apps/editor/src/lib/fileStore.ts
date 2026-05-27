import {
  readPersistedDocStateEnvelope,
  writePersistedDocStateEnvelope,
  type PersistedDocStateEnvelope,
} from '@qti-editor/prosemirror-plugins';

import type { MigrationResult } from '@qti-editor/interfaces';

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
    const parsed = raw ? (JSON.parse(raw) as PersistedDocStateEnvelope) : null;
    doc = parsed?.doc ?? null;
    schemaVersion = parsed?.schemaVersion;
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

export function loadFile(scope: StorageScope = activeStorageScope, id: string): LoadFileResult | null {
  const file = listFiles(scope).find(f => f.id === id);
  if (!file) return null;

  // Run migration eagerly using the file's original schemaVersion so any
  // legacy attrs are normalised before the editor sees them, and so the
  // migration report is available to the caller.
  const originalVersion = file.schemaVersion ?? 1;
  const envelope = readPersistedDocStateEnvelope({
    version: originalVersion,
    schemaVersion: originalVersion,
    doc: file.doc,
  });

  // Write the migrated content stamped at the current version so the
  // editor skips re-migration when it reads from localStorage.
  localStorage.setItem(
    getAutoSaveKey(scope),
    JSON.stringify(writePersistedDocStateEnvelope(envelope.doc ?? (file.doc as any))),
  );
  localStorage.setItem(getCurrentFileIdKey(scope), id);

  const migrationRan =
    envelope.compatibility != null &&
    envelope.compatibility.sourceVersion < envelope.compatibility.targetVersion;

  return { file, compatibility: migrationRan ? envelope.compatibility : undefined };
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
