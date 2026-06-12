import { useImperativeHandle, useRef, forwardRef } from 'react';

import type { QtiEditorApp } from '../qti-editor-app.js';

export interface EditorLayoutHandle {
  exportItem: (fileName?: string) => void;
  exportPackage: (fileName?: string) => Promise<void> | undefined;
  importXml: () => void;
  exportJson: (fileName?: string) => void;
  exportRoundtripXml: (fileName?: string) => void;
  importJson: () => void;
  importRoundtripXml: () => void;
}

interface EditorLayoutProps {
  editorKey: number;
  language: string;
  storageScope: string;
}

export const EditorLayout = forwardRef<EditorLayoutHandle, EditorLayoutProps>(
  ({ editorKey, language, storageScope }, ref) => {
    const elRef = useRef<QtiEditorApp | null>(null);

    useImperativeHandle(ref, () => ({
      exportItem: (fileName) => elRef.current?.exportItem(fileName),
      exportPackage: (fileName) => elRef.current?.exportPackage(fileName),
      importXml: () => elRef.current?.importXml(),
      exportJson: (fileName) => elRef.current?.exportJson(fileName),
      exportRoundtripXml: (fileName) => elRef.current?.exportRoundtripXml(fileName),
      importJson: () => elRef.current?.importJson(),
      importRoundtripXml: () => elRef.current?.importRoundtripXml(),
    }));

    return (
      <qti-editor-app
        key={`${storageScope}:${editorKey}`}
        ref={elRef}
        lang={language}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
      />
    );
  }
);
