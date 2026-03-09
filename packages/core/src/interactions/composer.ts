import {
  CHOICE_INTERACTION_TAG,
  choiceComposerHandler,
  choiceInteractionComposerMetadata,
  choiceNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interactions-qti-choice';
import {
  SELECT_POINT_INTERACTION_TAG,
  selectPointComposerHandler,
  selectPointInteractionComposerMetadata,
  selectPointNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interactions-qti-select-point';
import {
  TEXT_ENTRY_INTERACTION_TAG,
  textEntryComposerHandler,
  textEntryInteractionComposerMetadata,
  textEntryNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interactions-qti-text-entry';
import { inlineChoiceNodeAttributePanelMetadataByNodeTypeName } from '@qti-editor/interactions-qti-inline-choice';
import {
  sharedNodeAttributePanelMetadataByNodeTypeName,
  type InteractionComposerHandler,
  type InteractionComposerMetadata,
  type NodeAttributePanelMetadata,
} from '@qti-editor/interactions-shared';

const interactionComposerMetadataByTagName: Record<string, InteractionComposerMetadata> = {
  [CHOICE_INTERACTION_TAG]: choiceInteractionComposerMetadata,
  [TEXT_ENTRY_INTERACTION_TAG]: textEntryInteractionComposerMetadata,
  [SELECT_POINT_INTERACTION_TAG]: selectPointInteractionComposerMetadata,
};

const interactionComposerMetadataByNodeTypeName = Object.values(interactionComposerMetadataByTagName).reduce<
  Record<string, InteractionComposerMetadata>
>((acc, metadata) => {
  acc[metadata.nodeTypeName.toLowerCase()] = metadata;
  return acc;
}, {});

const nodeAttributePanelMetadataByNodeTypeName = {
  ...choiceNodeAttributePanelMetadataByNodeTypeName,
  ...textEntryNodeAttributePanelMetadataByNodeTypeName,
  ...selectPointNodeAttributePanelMetadataByNodeTypeName,
  ...sharedNodeAttributePanelMetadataByNodeTypeName,
  ...inlineChoiceNodeAttributePanelMetadataByNodeTypeName,
} satisfies Record<string, NodeAttributePanelMetadata>;

const handlersByTagName = new Map<string, InteractionComposerHandler>([
  [choiceComposerHandler.tagName, choiceComposerHandler],
  [textEntryComposerHandler.tagName, textEntryComposerHandler],
  [selectPointComposerHandler.tagName, selectPointComposerHandler],
]);

export function getInteractionComposerMetadata(tagName: string): InteractionComposerMetadata | undefined {
  return interactionComposerMetadataByTagName[tagName.toLowerCase()];
}

export function getInteractionComposerMetadataByNodeTypeName(
  nodeTypeName: string
): InteractionComposerMetadata | undefined {
  return interactionComposerMetadataByNodeTypeName[nodeTypeName.toLowerCase()];
}

export function getNodeAttributePanelMetadataByNodeTypeName(
  nodeTypeName: string
): NodeAttributePanelMetadata | undefined {
  return nodeAttributePanelMetadataByNodeTypeName[nodeTypeName.toLowerCase()];
}

export function getInteractionComposerHandler(tagName: string): InteractionComposerHandler | undefined {
  return handlersByTagName.get(tagName.toLowerCase());
}

export function listInteractionComposerHandlers(): ReadonlyArray<InteractionComposerHandler> {
  return Array.from(handlersByTagName.values());
}
