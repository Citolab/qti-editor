import { useImperativeHandle, useRef, forwardRef } from 'react';

import type { QtiEditorApp } from '../qti-editor-app.js';

export interface EditorLayoutHandle {
  exportXml: (fileName?: string) => void;
}

interface EditorLayoutProps {
  editorKey: number;
}

export const EditorLayout = forwardRef<EditorLayoutHandle, EditorLayoutProps>(
  ({ editorKey }, ref) => {
    const elRef = useRef<QtiEditorApp | null>(null);

    useImperativeHandle(ref, () => ({
      exportXml: (fileName) => elRef.current?.exportXml(fileName),
    }));

    return (
      <qti-editor-app
        key={editorKey}
        ref={elRef}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      />
    );
  }
);
