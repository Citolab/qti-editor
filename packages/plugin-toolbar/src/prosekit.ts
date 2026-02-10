import { definePlugin } from 'prosekit/core';
import type { Editor } from 'prosekit/core';
import { Plugin } from 'prosemirror-state';
import type { LitToolbar } from './toolbar';

import './toolbar';

export interface ToolbarExtensionOptions {
  getEditor: () => Editor;
  uploader?: unknown;
}

export function defineToolbarExtension(options: ToolbarExtensionOptions) {
  return definePlugin(() => {
    return new Plugin({
      view(editorView) {
        const toolbar = document.createElement('lit-editor-toolbar') as LitToolbar;
        toolbar.editor = options.getEditor();
        if (options.uploader) {
          toolbar.uploader = options.uploader;
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
