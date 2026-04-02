import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { MouseEvent } from 'react';

import { IconChevronDown, IconFolderOpen, IconTrash } from '../../lib/icons';
import { ToolbarButton } from '../ui/toolbar-button';

import type { SavedFile } from '../../lib/fileStore';

interface LoadMenuProps {
  files: SavedFile[];
  currentFileId?: string;
  isOpen: boolean;
  onToggle: () => void;
  onLoad: (id: string) => void;
  onDelete: (e: MouseEvent, id: string) => void;
}

export function LoadMenu({
  files,
  currentFileId,
  isOpen,
  onToggle,
  onLoad,
  onDelete,
}: LoadMenuProps) {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseDown(e: globalThis.MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggle();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', onMouseDown);
      return () => document.removeEventListener('mousedown', onMouseDown);
    }
  }, [isOpen, onToggle]);

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <ToolbarButton onClick={onToggle} title={t('fileLoadTitle')}>
        <IconFolderOpen /> {t('fileLoad')} <IconChevronDown />
      </ToolbarButton>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '4px',
            minWidth: '270px',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 16px rgba(0,0,0,.12)',
            zIndex: 50,
            padding: '4px 0',
          }}
        >
          {files.length === 0 ? (
            <p
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                color: '#6b7280',
                margin: 0,
              }}
            >
              {t('fileNoSaved')}
            </p>
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                onClick={() => onLoad(file.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 14px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  gap: '8px',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = '#f3f4f6')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: file.id === currentFileId ? 600 : 400,
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {file.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                    {new Date(file.savedAt).toLocaleString()}
                  </div>
                </div>
                <span
                  onClick={(e) => onDelete(e, file.id)}
                  style={{
                    color: '#9ca3af',
                    padding: '2px',
                    flexShrink: 0,
                  }}
                  title={t('fileDelete')}
                >
                  <IconTrash />
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
