import { useImperativeHandle, useRef, forwardRef } from 'react';

import type { QtiEditorApp } from '../qti-editor-app.js';

export interface EditorLayoutHandle {
  exportXml: (fileName?: string) => void;
  importXml: () => void;
}

interface EditorLayoutProps {
  editorKey: number;
  language: string;
}

export const EditorLayout = forwardRef<EditorLayoutHandle, EditorLayoutProps>(
  ({ editorKey, language }, ref) => {
    const elRef = useRef<QtiEditorApp | null>(null);

    useImperativeHandle(ref, () => ({
      exportXml: (fileName) => elRef.current?.exportXml(fileName),
      importXml: () => elRef.current?.importXml(),
    }));

    return (
      <qti-editor-app
        key={editorKey}
        ref={elRef}
        lang={language}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      />
    );
  }
);
