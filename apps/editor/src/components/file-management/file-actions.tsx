import { IconFile, IconSave } from '../../lib/icons';
import { ToolbarButton } from '../ui/toolbar-button';

interface FileActionsProps {
  onNew: () => void;
  onSave: () => void;
  isDirty: boolean;
}

export function FileActions({ onNew, onSave, isDirty }: FileActionsProps) {
  return (
    <>
      <ToolbarButton onClick={onNew} title="New file">
        <IconFile /> New
      </ToolbarButton>

      <ToolbarButton onClick={onSave} title="Save (Ctrl+S)" highlight={isDirty}>
        <IconSave />
        {isDirty ? 'Save *' : 'Save'}
      </ToolbarButton>
    </>
  );
}
