import { html } from 'lit';

import './rubric-block-attributes-editor.js';
import { registerFriendlyEditor } from '../attributes-panel/friendly-editor-registry.js';

export * from './rubric-block-attributes-editor.js';

registerFriendlyEditor('rubricBlockAttributes', node => {
  return html`<qti-rubric-block-attributes-editor .activeNode=${node}></qti-rubric-block-attributes-editor>`;
});
