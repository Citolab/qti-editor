import { useTranslation } from 'react-i18next';

import { IconFile, IconSave, IconDownload, IconUpload, IconChevronDown } from '../../lib/icons';
import { ToolbarButton } from '../ui/toolbar-button';
import { DropdownMenu } from '../ui/dropdown-menu';

interface FileActionsProps {
  onNew: () => void;
  onSave: () => void;
  onExportItem: () => void;
  onExportPackage: () => void;
  onExportXml: () => void;
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
  onExportXml,
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
        label={<><IconUpload /> {t('fileImport')} <IconChevronDown /></>}
        items={[
          { label: t('fileImportQti'),       title: t('fileImportQtiTitle'),       onClick: onImport },
          { label: t('fileImportJson'),       title: t('fileImportJsonTitle'),      onClick: onImportJson,        devOnly: true },
          { label: t('fileImportRoundtrip'),  title: t('fileImportRoundtripTitle'), onClick: onImportRoundtripXml, devOnly: true },
        ]}
      />

      <ToolbarButton onClick={onExportItem} title={`${t('fileExportQtiItemTitle')} — ${xmlName}`}>
        <IconDownload /> {t('fileExportQtiItem')} <span style={{ opacity: 0.6 }}>({xmlName})</span>
      </ToolbarButton>

      <ToolbarButton onClick={onExportPackage} title={`${t('fileExportQtiTestTitle')} — ${zipName}`}>
        <IconDownload /> {t('fileExportQtiTest')} <span style={{ opacity: 0.6 }}>({zipName})</span>
      </ToolbarButton>

      {isDev && (
        <DropdownMenu
          isDev={isDev}
          label={<><IconDownload /> {t('fileExport')} <IconChevronDown /></>}
          items={[
            { label: t('fileExportQtiTestXml'), title: t('fileExportQtiTestXmlTitle'), onClick: onExportXml,          devOnly: true },
            { label: t('fileExportJson'),       title: t('fileExportJsonTitle'),       onClick: onExportJson,         devOnly: true },
            { label: t('fileExportRoundtrip'),  title: t('fileExportRoundtripTitle'),  onClick: onExportRoundtripXml, devOnly: true },
          ]}
        />
      )}
    </>
  );
}
