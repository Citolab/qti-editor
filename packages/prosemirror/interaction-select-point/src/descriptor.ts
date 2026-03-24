import type { InteractionDescriptor } from '@qti-editor/interfaces';

import { insertSelectPointInteraction } from './components/qti-select-point-interaction/qti-select-point-interaction.commands.js';
import { qtiSelectPointInteractionNodeSpec } from './components/qti-select-point-interaction/qti-select-point-interaction.schema.js';
import { imgSelectPointNodeSpec } from './components/qti-select-point-interaction/img-select-point.schema.js';
import { selectPointInteractionComposerMetadata, selectPointNodeAttributePanelMetadataByNodeTypeName } from './composer/metadata.js';
import { selectPointComposerHandler } from './composer/handler.js';

export const selectPointInteractionDescriptor = {
  tagName: 'qti-select-point-interaction',
  nodeTypeName: 'qtiSelectPointInteraction',
  nodeSpecs: [
    { name: 'qtiSelectPointInteraction', spec: qtiSelectPointInteractionNodeSpec },
    { name: 'imgSelectPoint', spec: imgSelectPointNodeSpec },
  ],
  insertCommand: insertSelectPointInteraction,
  keyboardShortcut: 'Mod-Shift-p',
  composerMetadata: selectPointInteractionComposerMetadata,
  composerHandler: selectPointComposerHandler,
  attributePanelMetadata: selectPointNodeAttributePanelMetadataByNodeTypeName,
} satisfies InteractionDescriptor;
