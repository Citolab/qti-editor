import type { Editor } from 'prosekit/core';

export type ToolbarCommand = () => void;

export interface ToolbarItem {
  label: string;
  title?: string;
  onClick: ToolbarCommand;
}

export interface ToolbarOptions {
  editor: Editor;
  container: HTMLElement;
  items?: ToolbarItem[];
}

/**
  * Renders a simple toolbar into the given container.
  * Prepopulates with basic formatting commands and appends any extra items you provide.
  */
export function createToolbar(options: ToolbarOptions) {
  const { editor, container } = options;
  container.classList.add('qti-toolbar');
  container.innerHTML = '';

  const addButton = (label: string, title: string | undefined, onClick: ToolbarCommand) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    if (title) button.title = title;
    button.addEventListener('click', () => {
      onClick();
      editor.view.focus();
    });
    container.appendChild(button);
  };

  const cmds = editor.commands as Record<string, (...args: any[]) => any>;

  // Default items
  const defaults: ToolbarItem[] = [
    { label: 'B', title: 'Bold', onClick: () => cmds?.toggleBold?.() },
    { label: 'I', title: 'Italic', onClick: () => cmds?.toggleItalic?.() },
    { label: 'U', title: 'Underline', onClick: () => cmds?.toggleUnderline?.() },
    { label: 'S', title: 'Strikethrough', onClick: () => cmds?.toggleStrike?.() },
    { label: 'H1', title: 'Heading 1', onClick: () => cmds?.setHeading?.({ level: 1 }) },
    { label: 'H2', title: 'Heading 2', onClick: () => cmds?.setHeading?.({ level: 2 }) },
    { label: '• List', title: 'Bullet list', onClick: () => cmds?.wrapInList?.({ kind: 'bullet' }) },
    { label: '1. List', title: 'Numbered list', onClick: () => cmds?.wrapInList?.({ kind: 'ordered' }) },
  ];

  [...defaults, ...(options.items ?? [])].forEach((item) =>
    addButton(item.label, item.title, item.onClick),
  );
}
