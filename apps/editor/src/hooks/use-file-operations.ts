import { useCallback, useState } from 'react';
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

export function useFileOperations() {
  const queryClient = useQueryClient();
  const [currentFile, setCurrentFile] = useState<SavedFile | null>(() => getCurrentFile());
  const [fileName, setFileName] = useState(() => getCurrentFile()?.name ?? 'Untitled');

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
    },
  });


  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      deleteFile(id);
      return Promise.resolve();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['files'] }),
  });

  const commitSave = useCallback(
    (name?: string) => {
      const resolvedName = (name ?? fileName).trim() || 'Untitled';
      setFileName(resolvedName);
      saveMutation.mutate({ name: resolvedName, id: currentFile?.id });
    },
    [fileName, currentFile?.id, saveMutation]
  );

  const handleFileNameBlur = useCallback(() => {
    const trimmed = fileName.trim() || 'Untitled';
    setFileName(trimmed);
    if (!currentFile || trimmed !== currentFile.name) {
      saveMutation.mutate({ name: trimmed, id: currentFile?.id });
    }
  }, [fileName, currentFile, saveMutation]);

  const handleNew = useCallback(() => {
    clearCurrentSession();
    setCurrentFile(null);
    setFileName('Untitled');
  }, []);

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
        setFileName('Untitled');
      }
    },
    [currentFile?.id, deleteMutation]
  );

  return {
    currentFile,
    fileName,
    files,
    setFileName,
    commitSave,
    handleFileNameBlur,
    handleNew,
    handleLoad,
    handleDelete,
    queryClient,
  };
}
