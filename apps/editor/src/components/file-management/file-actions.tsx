import { useTranslation } from 'react-i18next';

import { IconFile, IconSave, IconDownload, IconUpload, IconChevronDown } from '../../lib/icons';
import { ToolbarButton } from '../ui/toolbar-button';
import { DropdownMenu } from '../ui/dropdown-menu';

interface FileActionsProps {
  onNew: () => void;
  onSave: () => void;
  onExport: () => void;
  onExportItem: () => void;
  onExportJson: () => void;
  onExportRoundtripXml: () => void;
  onExportPackage: () => void;
  onImport: () => void;
  onImportJson: () => void;
  onImportRoundtripXml: () => void;
  isDirty: boolean;
  isDev: boolean;
}

export function FileActions({ onNew, onSave, onExport, onExportItem, onExportJson, onExportRoundtripXml, onExportPackage, onImport, onImportJson, onImportRoundtripXml, isDirty, isDev }: FileActionsProps) {
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

      <DropdownMenu
        isDev={isDev}
        label={<><IconUpload /> {t('fileImport')} <IconChevronDown /></>}
        items={[
          { label: t('fileImportQti'),       title: t('fileImportQtiTitle'),       onClick: onImport },
          { label: t('fileImportJson'),       title: t('fileImportJsonTitle'),      onClick: onImportJson,        devOnly: true },
          { label: t('fileImportRoundtrip'),  title: t('fileImportRoundtripTitle'), onClick: onImportRoundtripXml, devOnly: true },
        ]}
      />

      <DropdownMenu
        isDev={isDev}
        label={<><IconDownload /> {t('fileExport')} <IconChevronDown /></>}
        items={[
          { label: t('fileExportQtiTest'),    title: t('fileExportQtiTestTitle'),    onClick: onExport },
          { label: t('fileExportQtiItem'),    title: t('fileExportQtiItemTitle'),    onClick: onExportItem },
          { label: t('fileExportJson'),       title: t('fileExportJsonTitle'),       onClick: onExportJson,        devOnly: true },
          { label: t('fileExportRoundtrip'),  title: t('fileExportRoundtripTitle'),  onClick: onExportRoundtripXml, devOnly: true },
        ]}
      />

      <ToolbarButton onClick={onExportPackage} title={t('fileExportPackageTitle')}>
        <IconDownload /> {t('fileExportPackage')}
      </ToolbarButton>
    </>
  );
}
