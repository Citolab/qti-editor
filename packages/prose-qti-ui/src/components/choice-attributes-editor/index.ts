import { html } from 'lit';

import './choice-attributes-editor.js';
import { registerFriendlyEditor } from '../attributes-panel/friendly-editor-registry.js';

import type { QtiAttributesPanel } from '../attributes-panel/attributes-panel.js';

export * from './choice-attributes-editor.js';

registerFriendlyEditor('choiceInteractionClass', (node, host) => {
  const presentation = (host as QtiAttributesPanel).choiceInteractionPresentation ?? null;
  return html`
    <qti-choice-attributes-editor
      .activeNode=${node}
      .presentation=${presentation}
    ></qti-choice-attributes-editor>
  `;
});
