import { useTranslation } from 'react-i18next';

import { IconFile, IconSave, IconDownload, IconUpload } from '../../lib/icons';
import { ToolbarButton } from '../ui/toolbar-button';

interface FileActionsProps {
  onNew: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: () => void;
  isDirty: boolean;
}

export function FileActions({ onNew, onSave, onExport, onImport, isDirty }: FileActionsProps) {
  const { t } = useTranslation();

  return (
    <>
      <ToolbarButton onClick={onNew} title={t('fileNewTitle')}>
        <IconFile /> {t('fileNew')}
      </ToolbarButton>

      <ToolbarButton onClick={onSave} title={t('fileSaveTitle')} highlight={isDirty}>
        <IconSave />
        {isDirty ? t('fileSaveDirty') : t('fileSave')}
      </ToolbarButton>

      <ToolbarButton onClick={onImport} title={t('fileImportTitle')}>
        <IconUpload /> {t('fileImport')}
      </ToolbarButton>

      <ToolbarButton onClick={onExport} title={t('fileExportTitle')}>
        <IconDownload /> {t('fileExport')}
      </ToolbarButton>
    </>
  );
}
