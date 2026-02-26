import { definePlugin } from 'prosekit/core';
import type { Editor } from 'prosekit/core';
import { Plugin } from 'prosekit/pm/state';
import type { EditorView } from 'prosekit/pm/view';
import type { LitToolbar, ToolbarInsertItemsProvider, ToolbarInsertMenu } from './toolbar';

import './toolbar';

export interface ToolbarExtensionOptions {
  getEditor: () => Editor;
  uploader?: unknown;
  insertMenus?: ToolbarInsertMenu[];
  getInsertItems?: ToolbarInsertItemsProvider;
}

export function defineToolbarExtension(options: ToolbarExtensionOptions) {
  return definePlugin(() => {
    return new Plugin({
      view(editorView: EditorView) {
        const toolbar = document.createElement('lit-editor-toolbar') as LitToolbar;
        toolbar.editor = options.getEditor();
        if (options.uploader) {
          toolbar.uploader = options.uploader;
        }
        if (options.insertMenus) {
          toolbar.insertMenus = options.insertMenus;
        } else if (options.getInsertItems) {
          toolbar.insertMenus = [
            {
              id: 'default-insert',
              getItems: options.getInsertItems,
              tooltip: 'Insert',
              icon: 'i-lucide-plus size-5 block',
            },
          ];
        }

        editorView.dom.parentElement?.insertBefore(toolbar, editorView.dom);

        return {
          update() {
            toolbar.requestUpdate();
          },
          destroy() {
            toolbar.remove();
          },
        };
      },
    });
  });
}
