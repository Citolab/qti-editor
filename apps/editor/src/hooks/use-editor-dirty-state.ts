import { useEffect, useRef, useState } from 'react';

export function useEditorDirtyState(editorKey: number) {
  const [isDirty, setIsDirty] = useState(false);
  // The events extension fires qti:content:change once on mount to broadcast
  // the initial doc state. Skip that first event so a freshly loaded editor
  // doesn't immediately appear dirty.
  const skipNextRef = useRef(true);

  useEffect(() => {
    setIsDirty(false);
    skipNextRef.current = true;

    function onContentChange() {
      if (skipNextRef.current) {
        skipNextRef.current = false;
        return;
      }
      setIsDirty(true);
    }

    document.addEventListener('qti:content:change', onContentChange);
    return () => document.removeEventListener('qti:content:change', onContentChange);
  }, [editorKey]);

  const resetDirty = () => setIsDirty(false);

  return { isDirty, setIsDirty, resetDirty };
}
