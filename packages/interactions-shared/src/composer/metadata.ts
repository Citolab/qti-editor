import type { NodeAttributePanelMetadata } from './types.js';

export const SIMPLE_CHOICE_NODE_TYPE = 'qtiSimpleChoice' as const;

export const sharedNodeAttributePanelMetadataByNodeTypeName = {
  [SIMPLE_CHOICE_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: SIMPLE_CHOICE_NODE_TYPE,
    userEditableAttributes: [],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
