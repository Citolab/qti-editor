import { IconFile, IconSave, IconDownload } from '../../lib/icons';
import { ToolbarButton } from '../ui/toolbar-button';

interface FileActionsProps {
  onNew: () => void;
  onSave: () => void;
  onExport: () => void;
  isDirty: boolean;
}

export function FileActions({ onNew, onSave, onExport, isDirty }: FileActionsProps) {
  return (
    <>
      <ToolbarButton onClick={onNew} title="New file">
        <IconFile /> New
      </ToolbarButton>

      <ToolbarButton onClick={onSave} title="Save (Ctrl+S)" highlight={isDirty}>
        <IconSave />
        {isDirty ? 'Save *' : 'Save'}
      </ToolbarButton>

      <ToolbarButton onClick={onExport} title="Export as QTI XML">
        <IconDownload /> Export XML
      </ToolbarButton>
    </>
  );
}
