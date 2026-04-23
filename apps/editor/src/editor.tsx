import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Register the Lit web component
import './components/qti-editor-app.js';

import { AppHeader } from './components/layout/header.js';
import { EditorLayout, type EditorLayoutHandle } from './components/layout/layout-editor.js';
import { StatusBar } from './components/layout/status-bar.js';
import { UnsavedChangesDialog } from './components/file-management/unsaved-changes-dialog.js';
import { LoginModal } from './components/auth/LoginModal.js';
import { useFileOperations } from './hooks/use-file-operations.js';
import { useEditorDirtyState } from './hooks/use-editor-dirty-state.js';
import { useAutoSave } from './hooks/use-auto-save.js';
import { useUnsavedChangesGuard } from './hooks/use-unsaved-changes-guard.js';
import { useAuth } from './context/auth-context.js';

import type { MouseEvent, KeyboardEvent } from 'react';


export default function App() {
  const { t, i18n } = useTranslation();
  const [editorKey, setEditorKey] = useState(0);
  const [loadMenuOpen, setLoadMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const editorLayoutRef = useRef<EditorLayoutHandle>(null);

  const { user, loading: authLoading, signOut } = useAuth();

  // File operations hook
  const {
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
  } = useFileOperations(t('untitled'));

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
      if (confirm(t('confirmDeleteFile'))) {
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
        setFileName(currentFile?.name ?? t('untitled'));
        e.currentTarget.blur();
      }
    },
    [currentFile?.name, setFileName, t]
  );

  // Handler: Export XML
  const handleExportXml = useCallback(() => {
    editorLayoutRef.current?.exportXml(fileName || 'item');
  }, [fileName]);

  // Handler: Import XML
  const handleImportXml = useCallback(() => {
    editorLayoutRef.current?.importXml();
  }, []);

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
        user={user}
        authLoading={authLoading}
        language={i18n.language}
        onFileNameChange={setFileName}
        onFileNameBlur={handleFileNameBlur}
        onFileNameKeyDown={handleFileNameKeyDown}
        onNew={handleNewFile}
        onSave={handleSaveFile}
        onExport={handleExportXml}
        onImport={handleImportXml}
        onLoadMenuToggle={handleLoadMenuToggle}
        onLoad={handleLoadFile}
        onDelete={handleDeleteFile}
        onLanguageChange={(language) => void i18n.changeLanguage(language)}
        onSignIn={() => setLoginModalOpen(true)}
        onSignOut={signOut}
      />

      <EditorLayout ref={editorLayoutRef} editorKey={editorKey} language={i18n.language} />

      <StatusBar
        user={user}
        authLoading={authLoading}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onSignIn={() => setLoginModalOpen(true)}
      />

      {unsavedDialog && (
        <UnsavedChangesDialog
          onSave={handleUnsavedSave}
          onDiscard={onUnsavedDiscard}
          onCancel={onUnsavedCancel}
        />
      )}

      {loginModalOpen && (
        <LoginModal onClose={() => setLoginModalOpen(false)} />
      )}
    </div>
  );
}
