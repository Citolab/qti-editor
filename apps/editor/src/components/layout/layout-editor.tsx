interface EditorLayoutProps {
  editorKey: number;
}

export function EditorLayout({ editorKey }: EditorLayoutProps) {
  return (
    <qti-editor-app
      key={editorKey}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}
    />
  );
}
