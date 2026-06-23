import { html } from 'lit';

import './extended-text-attributes-editor.js';
import { registerFriendlyEditor } from '../attributes-panel/friendly-editor-registry.js';

export * from './extended-text-attributes-editor.js';

registerFriendlyEditor('extendedTextAttributes', node => {
  return html`<qti-extended-text-attributes-editor .activeNode=${node}></qti-extended-text-attributes-editor>`;
});
