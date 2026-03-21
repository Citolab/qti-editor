import {
  CHOICE_INTERACTION_TAG,
  choiceComposerHandler,
  choiceInteractionComposerMetadata,
  choiceNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interaction-choice';
import {
  EXTENDED_TEXT_INTERACTION_TAG,
  extendedTextComposerHandler,
  extendedTextInteractionComposerMetadata,
  extendedTextNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interaction-extended-text';
import { inlineChoiceNodeAttributePanelMetadataByNodeTypeName } from '@qti-editor/interaction-inline-choice';
import {
  MATCH_INTERACTION_TAG,
  matchComposerHandler,
  matchInteractionComposerMetadata,
  matchNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interaction-match';
import {
  SELECT_POINT_INTERACTION_TAG,
  selectPointComposerHandler,
  selectPointInteractionComposerMetadata,
  selectPointNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interaction-select-point';
import {
  TEXT_ENTRY_INTERACTION_TAG,
  textEntryComposerHandler,
  textEntryInteractionComposerMetadata,
  textEntryNodeAttributePanelMetadataByNodeTypeName,
} from '@qti-editor/interaction-text-entry';
import {
  sharedNodeAttributePanelMetadataByNodeTypeName,
  type InteractionComposerHandler,
  type InteractionComposerMetadata,
  type NodeAttributePanelMetadata,
} from '@qti-editor/interaction-shared';

const interactionComposerMetadataByTagName: Record<string, InteractionComposerMetadata> = {
  [CHOICE_INTERACTION_TAG]: choiceInteractionComposerMetadata,
  [EXTENDED_TEXT_INTERACTION_TAG]: extendedTextInteractionComposerMetadata,
  [MATCH_INTERACTION_TAG]: matchInteractionComposerMetadata,
  [SELECT_POINT_INTERACTION_TAG]: selectPointInteractionComposerMetadata,
  [TEXT_ENTRY_INTERACTION_TAG]: textEntryInteractionComposerMetadata,
};

const interactionComposerMetadataByNodeTypeName = Object.values(interactionComposerMetadataByTagName).reduce<
  Record<string, InteractionComposerMetadata>
>((acc, metadata) => {
  acc[metadata.nodeTypeName.toLowerCase()] = metadata;
  return acc;
}, {});

const nodeAttributePanelMetadataByNodeTypeName = {
  ...choiceNodeAttributePanelMetadataByNodeTypeName,
  ...extendedTextNodeAttributePanelMetadataByNodeTypeName,
  ...inlineChoiceNodeAttributePanelMetadataByNodeTypeName,
  ...matchNodeAttributePanelMetadataByNodeTypeName,
  ...selectPointNodeAttributePanelMetadataByNodeTypeName,
  ...sharedNodeAttributePanelMetadataByNodeTypeName,
  ...textEntryNodeAttributePanelMetadataByNodeTypeName,
} satisfies Record<string, NodeAttributePanelMetadata>;

const handlersByTagName = new Map<string, InteractionComposerHandler>([
  [choiceComposerHandler.tagName, choiceComposerHandler],
  [extendedTextComposerHandler.tagName, extendedTextComposerHandler],
  [matchComposerHandler.tagName, matchComposerHandler],
  [selectPointComposerHandler.tagName, selectPointComposerHandler],
  [textEntryComposerHandler.tagName, textEntryComposerHandler],
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
