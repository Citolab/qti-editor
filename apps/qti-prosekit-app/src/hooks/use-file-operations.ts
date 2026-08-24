import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { i18n } from '../i18n.js';
import { buildCompatibilityReport, buildUnreadableDocumentReport } from '../lib/compatibility/index.js';
import { publishCompatibilityReport } from '../lib/compatibility/report-channel.js';
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
  const [fileName, setFileNameState] = useState(() => getCurrentFile(storageScope)?.name ?? untitledLabel);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const fileNameManuallyEditedRef = useRef(getCurrentFile(storageScope) != null);

  const setFileName = useCallback((value: string) => {
    fileNameManuallyEditedRef.current = true;
    setFileNameState(value);
  }, []);

  const applyAutoFileName = useCallback((value: string) => {
    const trimmed = value.trim();
    if (fileNameManuallyEditedRef.current || !trimmed) return;
    setFileNameState(trimmed);
  }, []);

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
    setFileNameState(scopedCurrentFile?.name ?? untitledLabel);
    fileNameManuallyEditedRef.current = scopedCurrentFile != null;
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
      setFileNameState(file.name);
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
      setFileNameState(resolvedName);
      saveMutation.mutate({ name: resolvedName, id: currentFile?.id });
    },
    [fileName, untitledLabel, currentFile?.id, saveMutation]
  );

  const handleFileNameBlur = useCallback(() => {
    const trimmed = fileName.trim() || untitledLabel;
    setFileNameState(trimmed);
    if (!currentFile || trimmed !== currentFile.name) {
      saveMutation.mutate({ name: trimmed, id: currentFile?.id });
    }
  }, [fileName, currentFile, saveMutation]);

  const handleNew = useCallback(() => {
    clearCurrentSession(storageScope);
    setCurrentFile(null);
    setFileNameState(untitledLabel);
    fileNameManuallyEditedRef.current = false;
  }, [storageScope, untitledLabel]);

  const handleLoad = useCallback(
    (id: string): SavedFile | null => {
      const outcome = loadFile(storageScope, id);

      if (outcome.status === 'missing') return null;

      /*
       * The file exists and cannot be read. Say so.
       *
       * `loadFile` refuses rather than opening it, because the alternative — stamping an unmigrated
       * document as current — is the one outcome no later migration can undo. But refusing used to
       * be indistinguishable from doing nothing: the file stayed in the list, clicking it had no
       * effect, and the editor went on showing the previous document under the previous name.
       */
      if (outcome.status === 'refused') {
        publishCompatibilityReport(buildUnreadableDocumentReport({
          id: outcome.file.id,
          label: outcome.file.name,
          reason: unreadableFileReason(outcome.file),
        }));
        return null;
      }

      const { file, compatibility } = outcome;
      setCurrentFile(file);
      setFileNameState(file.name);
      fileNameManuallyEditedRef.current = true;
      queryClient.invalidateQueries({ queryKey: ['files', storageScope] });
      if (compatibility) {
        const report = buildCompatibilityReport([{
          id: file.id,
          label: file.name,
          result: compatibility,
        }]);
        publishCompatibilityReport(report);
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
        setFileNameState(untitledLabel);
        fileNameManuallyEditedRef.current = false;
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
    applyAutoFileName,
    commitSave,
    handleFileNameBlur,
    handleNew,
    handleLoad,
    handleDelete,
    queryClient,
  };
}

/**
 * Why a stored file could not be opened, in the reader's language.
 *
 * The version it was written at is the whole diagnosis when there is one: a file from a *newer*
 * editor is a different problem from a file whose migration step is missing, and the number is what
 * separates them.
 */
function unreadableFileReason(file: SavedFile): string {
  return typeof file.schemaVersion === 'number'
    ? i18n.t('compatibilityFileUnreadableAtVersion', { version: file.schemaVersion })
    : i18n.t('compatibilityFileUnreadable');
}
