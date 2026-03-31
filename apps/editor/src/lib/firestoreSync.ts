import { collection, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { importFiles, type SavedFile } from './fileStore';

function userFilesCol(userId: string) {
  return collection(db, 'users', userId, 'files');
}

export async function syncSaveFile(userId: string, file: SavedFile): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'files', file.id), file);
}

export async function syncDeleteFile(userId: string, fileId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'files', fileId));
}

/**
 * Pull all files from Firestore and merge them into localStorage.
 * Later savedAt wins on conflict.
 */
export async function pullRemoteFiles(userId: string): Promise<void> {
  const snap = await getDocs(userFilesCol(userId));
  const remoteFiles = snap.docs.map(d => d.data() as SavedFile);
  importFiles(remoteFiles);
}
