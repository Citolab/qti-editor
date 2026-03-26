import { useEffect, useRef } from 'react';
import { sampleUploader } from '@qti-editor/ui/components/editor/sample/sample-uploader';

interface EditorLayoutProps {
  editorKey: number;
}

export function EditorLayout({ editorKey }: EditorLayoutProps) {
  const toolbarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    function onEditorReady(e: Event) {
      const { editor } = (e as CustomEvent).detail as { editor: unknown };
      if (toolbarRef.current) {
        (toolbarRef.current as any).editor = editor;
        (toolbarRef.current as any).uploader = sampleUploader;
      }
    }
    document.addEventListener('qti:editor:ready', onEditorReady);
    return () => document.removeEventListener('qti:editor:ready', onEditorReady);
  }, [editorKey]);

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 19,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(6px)',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <lit-editor-toolbar
          ref={toolbarRef}
          style={{ display: 'block', width: '100%' }}
        />
      </div>

      <main
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <qti-editor-app key={editorKey} style={{ display: 'block', flex: 1 }} />
      </main>
    </div>
  );
}
