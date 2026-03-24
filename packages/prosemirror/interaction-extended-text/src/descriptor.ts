import type { InteractionDescriptor } from '@qti-editor/interfaces';

import { insertExtendedTextInteraction } from './components/qti-extended-text-interaction/qti-extended-text-interaction.commands.js';
import { qtiExtendedTextInteractionNodeSpec } from './components/qti-extended-text-interaction/qti-extended-text-interaction.schema.js';
import { extendedTextInteractionComposerMetadata, extendedTextNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { extendedTextComposerHandler } from './composer/handler.js';

export const extendedTextInteractionDescriptor = {
  tagName: 'qti-extended-text-interaction',
  nodeTypeName: 'qtiExtendedTextInteraction',
  nodeSpecs: [
    { name: 'qtiExtendedTextInteraction', spec: qtiExtendedTextInteractionNodeSpec },
  ],
  insertCommand: insertExtendedTextInteraction,
  keyboardShortcut: 'Mod-Shift-e',
  composerMetadata: extendedTextInteractionComposerMetadata,
  composerHandler: extendedTextComposerHandler,
  attributePanelMetadata: extendedTextNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
