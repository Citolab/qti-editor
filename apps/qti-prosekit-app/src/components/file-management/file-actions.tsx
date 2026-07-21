import { useTranslation } from 'react-i18next';

import { IconFile, IconSave, IconDownload, IconUpload, IconChevronDown } from '../../lib/icons';
import { ToolbarButton } from '../ui/toolbar-button';
import { DropdownMenu } from '../ui/dropdown-menu';

interface FileActionsProps {
  onNew: () => void;
  onSave: () => void;
  onExportItem: () => void;
  onExportPackage: () => void;
  onExportJson: () => void;
  onExportRoundtripXml: () => void;
  onImport: () => void;
  onImportJson: () => void;
  onImportRoundtripXml: () => void;
  metadataTitle: string;
  isDirty: boolean;
  isDev: boolean;
}

function sanitizeForFilename(value: string): string {
  return value.trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9._-]/g, '') || 'item';
}

export function FileActions({
  onNew,
  onSave,
  onExportItem,
  onExportPackage,
  onExportJson,
  onExportRoundtripXml,
  onImport,
  onImportJson,
  onImportRoundtripXml,
  metadataTitle,
  isDirty,
  isDev,
}: FileActionsProps) {
  const { t } = useTranslation();
  const safeTitle = sanitizeForFilename(metadataTitle);
  const xmlName = `${safeTitle}.xml`;
  const zipName = `${safeTitle}.zip`;

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
        label={<><IconDownload /> {t('fileImport')} <IconChevronDown /></>}
        items={[
          { label: t('fileImportQti'),       title: t('fileImportQtiTitle'),       onClick: onImport },
          { label: t('fileImportJson'),       title: t('fileImportJsonTitle'),      onClick: onImportJson,        devOnly: true },
          { label: t('fileImportRoundtrip'),  title: t('fileImportRoundtripTitle'), onClick: onImportRoundtripXml, devOnly: true },
        ]}
      />

      <DropdownMenu
        isDev={isDev}
        label={<><IconUpload /> {t('fileExport')} <IconChevronDown /></>}
        items={[
          { label: `${t('fileExportQtiItem')} (${xmlName})`, title: `${t('fileExportQtiItemTitle')} — ${xmlName}`, onClick: onExportItem },
          { label: `${t('fileExportQtiTest')} (${zipName})`, title: `${t('fileExportQtiTestTitle')} — ${zipName}`, onClick: onExportPackage },
          { label: t('fileExportRoundtrip'),                 title: t('fileExportRoundtripTitle'),                 onClick: onExportRoundtripXml, devOnly: true },
          { label: t('fileExportJson'),                      title: t('fileExportJsonTitle'),                      onClick: onExportJson,         devOnly: true },
        ]}
      />
    </>
  );
}
