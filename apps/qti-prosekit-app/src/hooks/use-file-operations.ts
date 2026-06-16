import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { buildCompatibilityReport } from '@citolab/prose-extensions/prosemirror';

import {
  clearCurrentSession,
  deleteFile,
  getCurrentFile,
  getStorageScopeForUser,
  listFiles,
  loadFile,
  saveFile,
  type SavedFile,
} from '../lib/fileStore';
import { syncSaveFile, syncDeleteFile, pullRemoteFiles } from '../lib/firestoreSync';
import { useAuth } from '../context/auth-context';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export function useFileOperations(untitledLabel: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const storageScope = getStorageScopeForUser(user?.uid);
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [currentFile, setCurrentFile] = useState<SavedFile | null>(() => getCurrentFile(storageScope));
  const [fileName, setFileName] = useState(() => getCurrentFile(storageScope)?.name ?? untitledLabel);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const runSync = useCallback(async (op: () => Promise<void>) => {
    setSyncStatus('syncing');
    try {
      await op();
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
    }
  }, []);

  useEffect(() => {
    const scopedCurrentFile = getCurrentFile(storageScope);
    setCurrentFile(scopedCurrentFile);
    setFileName(scopedCurrentFile?.name ?? untitledLabel);
    setSyncStatus('idle');
    setLastSyncedAt(null);
  }, [storageScope, untitledLabel]);

  // Pull remote files from Firestore when the user logs in
  useEffect(() => {
    if (!user) return;
    runSync(() =>
      pullRemoteFiles(user.uid).then(() =>
        queryClient.invalidateQueries({ queryKey: ['files', storageScope] })
      )
    );
  }, [user?.uid, queryClient, runSync, storageScope]);

  const { data: files = [] } = useQuery({
    queryKey: ['files', storageScope],
    queryFn: () => listFiles(storageScope),
  });

  const saveMutation = useMutation({
    mutationFn: ({ name, id }: { name: string; id?: string }) =>
      Promise.resolve(saveFile(storageScope, name, id)),
    onSuccess: (file) => {
      setCurrentFile(file);
      setFileName(file.name);
      queryClient.invalidateQueries({ queryKey: ['files', storageScope] });
      const u = userRef.current;
      if (u) runSync(() => syncSaveFile(u.uid, file));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      deleteFile(storageScope, id);
      return Promise.resolve();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['files', storageScope] });
      const u = userRef.current;
      if (u) runSync(() => syncDeleteFile(u.uid, id));
    },
  });

  const commitSave = useCallback(
    (name?: string) => {
      const resolvedName = (name ?? fileName).trim() || untitledLabel;
      setFileName(resolvedName);
      saveMutation.mutate({ name: resolvedName, id: currentFile?.id });
    },
    [fileName, currentFile?.id, saveMutation]
  );

  const handleFileNameBlur = useCallback(() => {
    const trimmed = fileName.trim() || untitledLabel;
    setFileName(trimmed);
    if (!currentFile || trimmed !== currentFile.name) {
      saveMutation.mutate({ name: trimmed, id: currentFile?.id });
    }
  }, [fileName, currentFile, saveMutation]);

  const handleNew = useCallback(() => {
    clearCurrentSession(storageScope);
    setCurrentFile(null);
    setFileName(untitledLabel);
  }, [storageScope, untitledLabel]);

  const handleLoad = useCallback(
    (id: string): SavedFile | null => {
      const result = loadFile(storageScope, id);
      if (!result) return null;
      const { file, compatibility } = result;
      setCurrentFile(file);
      setFileName(file.name);
      queryClient.invalidateQueries({ queryKey: ['files', storageScope] });
      if (compatibility) {
        const report = buildCompatibilityReport([{
          id: file.id,
          label: file.name,
          result: compatibility,
        }]);
        document.dispatchEvent(new CustomEvent('qti:compatibility:report', {
          detail: report,
          bubbles: true,
        }));
      }
      return file;
    },
    [queryClient, storageScope]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
      if (currentFile?.id === id) {
        clearCurrentSession(storageScope);
        setCurrentFile(null);
        setFileName(untitledLabel);
      }
    },
    [currentFile?.id, deleteMutation, storageScope, untitledLabel]
  );

  return {
    currentFile,
    fileName,
    files,
    syncStatus,
    lastSyncedAt,
    setFileName,
    commitSave,
    handleFileNameBlur,
    handleNew,
    handleLoad,
    handleDelete,
    queryClient,
  };
}
