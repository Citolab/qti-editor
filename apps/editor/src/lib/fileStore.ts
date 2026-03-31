/**
 * File management backed by localStorage.
 * Designed so the storage layer can later be swapped for Firestore
 * by replacing these functions with async equivalents and updating
 * the React Query query/mutation functions in App.tsx.
 */

export const AUTO_SAVE_KEY = 'qti-editor:prosemirror-doc:v1';
const FILES_KEY = 'qti-editor:saved-files';
const CURRENT_FILE_ID_KEY = 'qti-editor:current-file-id';

export interface SavedFile {
  id: string;
  name: string;
  savedAt: string; // ISO 8601
  doc: unknown;    // ProseMirror JSON doc
}

export function listFiles(): SavedFile[] {
  try {
    const raw = localStorage.getItem(FILES_KEY);
    return raw ? (JSON.parse(raw) as SavedFile[]) : [];
  } catch {
    return [];
  }
}

export function saveFile(name: string, existingId?: string): SavedFile {
  let doc: unknown = null;
  try {
    const raw = localStorage.getItem(AUTO_SAVE_KEY);
    doc = raw ? (JSON.parse(raw) as { doc: unknown }).doc : null;
  } catch { /* ignore corrupt state */ }

  const file: SavedFile = {
    id: existingId ?? crypto.randomUUID(),
    name,
    savedAt: new Date().toISOString(),
    doc,
  };

  const files = listFiles().filter(f => f.id !== file.id);
  files.unshift(file);
  localStorage.setItem(FILES_KEY, JSON.stringify(files));
  localStorage.setItem(CURRENT_FILE_ID_KEY, file.id);
  return file;
}

export function loadFile(id: string): SavedFile | null {
  const file = listFiles().find(f => f.id === id);
  if (!file) return null;
  // Write to the auto-save key so the editor picks it up on remount
  localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify({ version: 1, doc: file.doc }));
  localStorage.setItem(CURRENT_FILE_ID_KEY, id);
  return file;
}

export function deleteFile(id: string): void {
  const files = listFiles().filter(f => f.id !== id);
  localStorage.setItem(FILES_KEY, JSON.stringify(files));
  const currentId = localStorage.getItem(CURRENT_FILE_ID_KEY);
  if (currentId === id) localStorage.removeItem(CURRENT_FILE_ID_KEY);
}

export function getCurrentFile(): SavedFile | null {
  const id = localStorage.getItem(CURRENT_FILE_ID_KEY);
  if (!id) return null;
  return listFiles().find(f => f.id === id) ?? null;
}

export function clearCurrentSession(): void {
  localStorage.removeItem(AUTO_SAVE_KEY);
  localStorage.removeItem(CURRENT_FILE_ID_KEY);
}

/**
 * Merge incoming files into localStorage. Later savedAt wins on conflict.
 * Used by the Firestore sync layer to pull remote files on login.
 */
export function importFiles(incoming: SavedFile[]): void {
  const local = listFiles();
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
  localStorage.setItem(FILES_KEY, JSON.stringify(merged));
}
