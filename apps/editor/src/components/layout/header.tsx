import { useTranslation } from 'react-i18next';

import { Divider } from '../ui/divider';
import { FileActions } from '../file-management/file-actions';
import { FileNameInput } from '../file-management/file-name-input';
import { LoadMenu } from '../file-management/load-menu';
import { AuthButton } from '../auth/AuthButton';

import type { KeyboardEvent, MouseEvent } from 'react';
import type { User } from 'firebase/auth';
import type { SavedFile } from '../../lib/fileStore';

type AutoSaveStatus = 'idle' | 'saving' | 'saved';

interface AppHeaderProps {
  fileName: string;
  isDirty: boolean;
  autoSaveStatus: AutoSaveStatus;
  files: SavedFile[];
  currentFileId?: string;
  loadMenuOpen: boolean;
  user: User | null;
  authLoading: boolean;
  language: string;
  onFileNameChange: (value: string) => void;
  onFileNameBlur: () => void;
  onFileNameKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onNew: () => void;
  onSave: () => void;
  onExport: () => void;
  onLoadMenuToggle: () => void;
  onLoad: (id: string) => void;
  onDelete: (e: MouseEvent, id: string) => void;
  onLanguageChange: (language: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AppHeader({
  fileName,
  isDirty,
  autoSaveStatus,
  files,
  currentFileId,
  loadMenuOpen,
  user,
  authLoading,
  language,
  onFileNameChange,
  onFileNameBlur,
  onFileNameKeyDown,
  onNew,
  onSave,
  onExport,
  onLoadMenuToggle,
  onLoad,
  onDelete,
  onLanguageChange,
  onSignIn,
  onSignOut,
}: AppHeaderProps) {
  const { t } = useTranslation();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 16px',
        height: '44px',
        flexShrink: 0,
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 2px rgba(0,0,0,.04)',
        zIndex: 20,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: '14px',
          color: '#111827',
          marginRight: '6px',
          whiteSpace: 'nowrap',
        }}
      >
        {t('appTitle')}
      </span>

      <Divider />

      <FileActions onNew={onNew} onSave={onSave} onExport={onExport} isDirty={isDirty} />

      <LoadMenu
        files={files}
        currentFileId={currentFileId}
        isOpen={loadMenuOpen}
        onToggle={onLoadMenuToggle}
        onLoad={onLoad}
        onDelete={onDelete}
      />

      <Divider />

      <FileNameInput
        fileName={fileName}
        isDirty={isDirty}
        onChange={onFileNameChange}
        onBlur={onFileNameBlur}
        onKeyDown={onFileNameKeyDown}
      />

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6b7280' }}>
          <span>{t('language')}</span>
          <select
            value={language}
            onChange={(event) => onLanguageChange(event.currentTarget.value)}
            style={{
              fontSize: '11px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              background: 'white',
              color: '#374151',
              padding: '2px 6px',
            }}
          >
            <option value="en">{t('languageEnglish')}</option>
            <option value="nl">{t('languageDutch')}</option>
          </select>
        </label>
        {autoSaveStatus !== 'idle' && (
          <span
            style={{
              fontSize: '11px',
              whiteSpace: 'nowrap',
              color: autoSaveStatus === 'saving' ? '#9ca3af' : '#10b981',
            }}
          >
            {autoSaveStatus === 'saving' ? t('autosaveSaving') : t('autosaveSaved')}
          </span>
        )}
        <AuthButton
          user={user}
          loading={authLoading}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
}
