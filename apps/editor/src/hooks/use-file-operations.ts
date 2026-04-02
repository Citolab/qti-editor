import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  clearCurrentSession,
  deleteFile,
  getCurrentFile,
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
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [currentFile, setCurrentFile] = useState<SavedFile | null>(() => getCurrentFile());
  const [fileName, setFileName] = useState(() => getCurrentFile()?.name ?? untitledLabel);
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

  // Pull remote files from Firestore when the user logs in
  useEffect(() => {
    if (!user) return;
    runSync(() =>
      pullRemoteFiles(user.uid).then(() =>
        queryClient.invalidateQueries({ queryKey: ['files'] })
      )
    );
  }, [user?.uid, queryClient, runSync]);

  const { data: files = [] } = useQuery({
    queryKey: ['files'],
    queryFn: listFiles,
  });

  const saveMutation = useMutation({
    mutationFn: ({ name, id }: { name: string; id?: string }) =>
      Promise.resolve(saveFile(name, id)),
    onSuccess: (file) => {
      setCurrentFile(file);
      setFileName(file.name);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      const u = userRef.current;
      if (u) runSync(() => syncSaveFile(u.uid, file));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      deleteFile(id);
      return Promise.resolve();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
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
    clearCurrentSession();
    setCurrentFile(null);
    setFileName(untitledLabel);
  }, [untitledLabel]);

  const handleLoad = useCallback(
    (id: string): SavedFile | null => {
      const file = loadFile(id);
      if (!file) return null;
      setCurrentFile(file);
      setFileName(file.name);
      queryClient.invalidateQueries({ queryKey: ['files'] });
      return file;
    },
    [queryClient]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteMutation.mutate(id);
      if (currentFile?.id === id) {
        clearCurrentSession();
        setCurrentFile(null);
        setFileName(untitledLabel);
      }
    },
    [currentFile?.id, deleteMutation, untitledLabel]
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
