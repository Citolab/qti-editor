import { useCallback, useState } from 'react';
import type { MouseEvent, KeyboardEvent } from 'react';

// Register the Lit web component (also registers lit-editor-toolbar)
import './components/qti-editor-app.js';
import '@qti-editor/ui/components/editor/ui/toolbar';

import { AppHeader } from './components/layout/header.js';
import { EditorLayout } from './components/layout/layout-editor.js';
import { UnsavedChangesDialog } from './components/file-management/unsaved-changes-dialog.js';
import { useFileOperations } from './hooks/use-file-operations.js';
import { useEditorDirtyState } from './hooks/use-editor-dirty-state.js';
import { useAutoSave } from './hooks/use-auto-save.js';
import { useUnsavedChangesGuard } from './hooks/use-unsaved-changes-guard.js';


export default function App() {
  const [editorKey, setEditorKey] = useState(0);
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);

  // File operations hook
  const {
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
  } = useFileOperations();

  // Editor dirty state
  const { isDirty, resetDirty } = useEditorDirtyState(editorKey);

  // Auto-save status
  const autoSaveStatus = useAutoSave(editorKey);

  // Unsaved changes guard
  const {
    unsavedDialog,
    withUnsavedGuard,
    onUnsavedSave,
    onUnsavedDiscard,
    onUnsavedCancel,
  } = useUnsavedChangesGuard(isDirty);

  // Handler: New file
  const handleNewFile = useCallback(() => {
    withUnsavedGuard(() => {
      handleNew();
      resetDirty();
      setEditorKey((k) => k + 1);
    });
  }, [withUnsavedGuard, handleNew, resetDirty]);

  // Handler: Save file
  const handleSaveFile = useCallback(() => {
    commitSave();
    resetDirty();
  }, [commitSave, resetDirty]);

  // Handler: Load file
  const handleLoadFile = useCallback(
    (id: string) => {
      setLoadMenuOpen(false);
      withUnsavedGuard(() => {
        handleLoad(id);
        resetDirty();
        setEditorKey((k) => k + 1);
      });
    },
    [withUnsavedGuard, handleLoad, resetDirty]
  );

  // Handler: Delete file
  const handleDeleteFile = useCallback(
    (e: MouseEvent, id: string) => {
      e.stopPropagation();
      if (confirm('Delete this file?')) {
        handleDelete(id);
        if (currentFile?.id === id) {
          setEditorKey((k) => k + 1);
        }
      }
    },
    [handleDelete, currentFile?.id]
  );

  // Handler: Toggle load menu
  const handleLoadMenuToggle = useCallback(() => {
    if (!loadMenuOpen) {
      queryClient.invalidateQueries({ queryKey: ['files'] });
    }
    setLoadMenuOpen((o) => !o);
  }, [loadMenuOpen, queryClient]);

  // Handler: File name key down
  const handleFileNameKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      } else if (e.key === 'Escape') {
        setFileName(currentFile?.name ?? 'Untitled');
        e.currentTarget.blur();
      }
    },
    [currentFile?.name, setFileName]
  );

  // Unsaved dialog: Save action
  const handleUnsavedSave = useCallback(() => {
    onUnsavedSave(() => {
      commitSave();
      resetDirty();
    });
  }, [onUnsavedSave, commitSave, resetDirty]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#f9fafb',
      }}
    >
      <AppHeader
        fileName={fileName}
        isDirty={isDirty}
        autoSaveStatus={autoSaveStatus}
        files={files}
        currentFileId={currentFile?.id}
        loadMenuOpen={loadMenuOpen}
        onFileNameChange={setFileName}
        onFileNameBlur={handleFileNameBlur}
        onFileNameKeyDown={handleFileNameKeyDown}
        onNew={handleNewFile}
        onSave={handleSaveFile}
        onLoadMenuToggle={handleLoadMenuToggle}
        onLoad={handleLoadFile}
        onDelete={handleDeleteFile}
      />

      <EditorLayout editorKey={editorKey} />

      {unsavedDialog && (
        <UnsavedChangesDialog
          onSave={handleUnsavedSave}
          onDiscard={onUnsavedDiscard}
          onCancel={onUnsavedCancel}
        />
      )}
    </div>
  );
}
