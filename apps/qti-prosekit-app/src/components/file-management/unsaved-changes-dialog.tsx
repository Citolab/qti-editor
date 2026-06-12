import { useTranslation } from 'react-i18next';

interface UnsavedChangesDialogProps {
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

export function UnsavedChangesDialog({
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          {t('unsavedDialogTitle')}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {t('unsavedDialogBody')}
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onDiscard}
            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-red-600 hover:bg-red-50"
          >
            {t('discard')}
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
