import { useCallback, useRef, useState } from 'react';

export function useUnsavedChangesGuard(isDirty: boolean) {
  const [unsavedDialog, setUnsavedDialog] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const withUnsavedGuard = useCallback(
    (action: () => void) => {
      if (!isDirty) {
        action();
        return;
      }
      pendingActionRef.current = action;
      setUnsavedDialog(true);
    },
    [isDirty]
  );

  const onUnsavedSave = useCallback((saveAction: () => void) => {
    setUnsavedDialog(false);
    saveAction();
    const next = pendingActionRef.current;
    pendingActionRef.current = null;
    setTimeout(() => next?.(), 0);
  }, []);

  const onUnsavedDiscard = useCallback(() => {
    setUnsavedDialog(false);
    const next = pendingActionRef.current;
    pendingActionRef.current = null;
    next?.();
  }, []);

  const onUnsavedCancel = useCallback(() => {
    setUnsavedDialog(false);
    pendingActionRef.current = null;
  }, []);

  return {
    unsavedDialog,
    withUnsavedGuard,
    onUnsavedSave,
    onUnsavedDiscard,
    onUnsavedCancel,
  };
}
