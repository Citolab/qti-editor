import { useRef } from 'react';
import type { KeyboardEvent } from 'react';

interface FileNameInputProps {
  fileName: string;
  isDirty: boolean;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
}

export function FileNameInput({
  fileName,
  isDirty,
  onChange,
  onBlur,
  onKeyDown,
}: FileNameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={fileName}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.currentTarget.select()}
        placeholder="Untitled"
        style={{
          fontSize: '15px',
          fontWeight: 500,
          color: '#111827',
          border: 'none',
          borderBottom: '1px solid transparent',
          background: 'transparent',
          outline: 'none',
          padding: '2px 4px',
          borderRadius: '3px',
          minWidth: '80px',
          maxWidth: '320px',
          width: `${Math.max(80, fileName.length * 9)}px`,
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderBottomColor = '#d1d5db')}
        onMouseLeave={(e) => {
          if (document.activeElement !== e.currentTarget) {
            e.currentTarget.style.borderBottomColor = 'transparent';
          }
        }}
      />
      {isDirty && (
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#3b82f6',
            flexShrink: 0,
          }}
          title="Unsaved changes"
        />
      )}
    </div>
  );
}
