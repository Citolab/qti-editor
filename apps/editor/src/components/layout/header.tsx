import { Divider } from '../ui/divider';
import { FileActions } from '../file-management/file-actions';
import { FileNameInput } from '../file-management/file-name-input';
import { LoadMenu } from '../file-management/load-menu';

import type { KeyboardEvent, MouseEvent } from 'react';
import type { SavedFile } from '../../lib/fileStore';

type AutoSaveStatus = 'idle' | 'saving' | 'saved';

interface AppHeaderProps {
  fileName: string;
  isDirty: boolean;
  autoSaveStatus: AutoSaveStatus;
  files: SavedFile[];
  currentFileId?: string;
  loadMenuOpen: boolean;
  onFileNameChange: (value: string) => void;
  onFileNameBlur: () => void;
  onFileNameKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  onNew: () => void;
  onSave: () => void;
  onLoadMenuToggle: () => void;
  onLoad: (id: string) => void;
  onDelete: (e: MouseEvent, id: string) => void;
}

export function AppHeader({
  fileName,
  isDirty,
  autoSaveStatus,
  files,
  currentFileId,
  loadMenuOpen,
  onFileNameChange,
  onFileNameBlur,
  onFileNameKeyDown,
  onNew,
  onSave,
  onLoadMenuToggle,
  onLoad,
  onDelete,
}: AppHeaderProps) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 12px',
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
        QTI Editor
      </span>

      <Divider />

      <FileActions onNew={onNew} onSave={onSave} isDirty={isDirty} />

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

      {autoSaveStatus !== 'idle' && (
        <span
          style={{
            marginLeft: 'auto',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            color: autoSaveStatus === 'saving' ? '#9ca3af' : '#10b981',
          }}
        >
          {autoSaveStatus === 'saving' ? 'Saving…' : 'Auto-saved'}
        </span>
      )}
    </header>
  );
}
