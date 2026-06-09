
import { insertTextEntryInteraction } from './components/qti-text-entry-interaction/qti-text-entry-interaction.commands.js';
import { qtiTextEntryInteractionNodeSpec } from './components/qti-text-entry-interaction/qti-text-entry-interaction.schema.js';
import { textEntryInteractionComposerMetadata, textEntryNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { textEntryComposerHandler } from './composer/handler.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

export const textEntryInteractionDescriptor = {
  tagName: 'qti-text-entry-interaction',
  nodeTypeName: 'qtiTextEntryInteraction',
  nodeSpecs: [
    { name: 'qtiTextEntryInteraction', spec: qtiTextEntryInteractionNodeSpec },
  ],
  insertCommand: insertTextEntryInteraction,
  keyboardShortcut: 'Mod-Shift-t',
  composerMetadata: textEntryInteractionComposerMetadata,
  composerHandler: textEntryComposerHandler,
  attributePanelMetadata: textEntryNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
