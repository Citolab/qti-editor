import { useEffect, useRef, useState } from 'react';

type AutoSaveStatus = 'idle' | 'saving' | 'saved';

export function useAutoSave(editorKey: number) {
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onContentChange() {
      setAutoSaveStatus('saving');
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => setAutoSaveStatus('saved'), 600);
    }

    document.addEventListener('qti:content:change', onContentChange);
    return () => {
      document.removeEventListener('qti:content:change', onContentChange);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [editorKey]);

  return autoSaveStatus;
}
