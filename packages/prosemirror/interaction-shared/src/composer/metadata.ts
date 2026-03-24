import type { NodeAttributePanelMetadata } from '@qti-editor/interfaces';

export const SIMPLE_CHOICE_NODE_TYPE = 'qtiSimpleChoice' as const;

export const sharedNodeAttributePanelMetadataByNodeTypeName = {
  [SIMPLE_CHOICE_NODE_TYPE.toLowerCase()]: {
    nodeTypeName: SIMPLE_CHOICE_NODE_TYPE,
    editableAttributes: [],
  },
} satisfies Record<string, NodeAttributePanelMetadata>;
