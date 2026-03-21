import type { NodeAttributePanelMetadata } from '@qti-editor/interaction-shared/composer/types.js';

export const INLINE_CHOICE_NODE_TYPE = 'qtiInlineChoice' as const;

export const inlineChoiceNodeAttributePanelMetadataByNodeTypeName = {
  [INLINE_CHOICE_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: INLINE_CHOICE_NODE_TYPE,
    userEditableAttributes: [],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
