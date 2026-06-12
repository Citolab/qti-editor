import { useEffect, useState } from 'react';

export function useEditorDirtyState(editorKey: number) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(false);

    function onContentChange() {
      setIsDirty(true);
    }

    document.addEventListener('qti:content:change', onContentChange);
    return () => document.removeEventListener('qti:content:change', onContentChange);
  }, [editorKey]);

  const resetDirty = () => setIsDirty(false);

  return { isDirty, setIsDirty, resetDirty };
}
