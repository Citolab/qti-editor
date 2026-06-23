import { html } from 'lit';

import './text-entry-attributes-editor.js';
import { registerFriendlyEditor } from '../attributes-panel/friendly-editor-registry.js';

export * from './text-entry-attributes-editor.js';

registerFriendlyEditor('textEntryAttributes', node => {
  return html`<qti-text-entry-attributes-editor .activeNode=${node}></qti-text-entry-attributes-editor>`;
});
