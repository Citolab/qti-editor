import { choiceInteractionDescriptor } from '@qti-editor/interaction-choice';
import { extendedTextInteractionDescriptor } from '@qti-editor/interaction-extended-text';
import { inlineChoiceInteractionDescriptor } from '@qti-editor/interaction-inline-choice';
import { matchInteractionDescriptor } from '@qti-editor/interaction-match';
import { orderInteractionDescriptor } from '@qti-editor/interaction-order';
import { selectPointInteractionDescriptor } from '@qti-editor/interaction-select-point';
import { textEntryInteractionDescriptor } from '@qti-editor/interaction-text-entry';

import type {
  InteractionComposerHandler,
  InteractionComposerMetadata,
  InteractionDescriptor,
  NodeAttributePanelMetadata,
} from '@qti-editor/interfaces';

const registeredDescriptors: InteractionDescriptor[] = [
  choiceInteractionDescriptor,
  extendedTextInteractionDescriptor,
  inlineChoiceInteractionDescriptor,
  matchInteractionDescriptor,
  orderInteractionDescriptor,
  selectPointInteractionDescriptor,
  textEntryInteractionDescriptor,
];

const metadataByTagName = new Map<string, InteractionComposerMetadata>(
  registeredDescriptors.map(d => [d.tagName, d.composerMetadata]),
);

const metadataByNodeTypeName = new Map<string, InteractionComposerMetadata>(
  registeredDescriptors.map(d => [d.nodeTypeName.toLowerCase(), d.composerMetadata]),
);

const handlersByTagName = new Map<string, InteractionComposerHandler>(
  registeredDescriptors
    .filter(d => d.composerHandler != null)
    .map(d => [d.tagName, d.composerHandler!]),
);

const panelMetadataByNodeTypeName = new Map<string, NodeAttributePanelMetadata>(
  registeredDescriptors.flatMap(d =>
    Object.entries(d.attributePanelMetadata ?? {}),
  ),
);

export function getInteractionComposerMetadata(tagName: string): InteractionComposerMetadata | undefined {
  return metadataByTagName.get(tagName.toLowerCase());
}

export function getInteractionComposerMetadataByNodeTypeName(
  nodeTypeName: string,
): InteractionComposerMetadata | undefined {
  return metadataByNodeTypeName.get(nodeTypeName.toLowerCase());
}

export function getNodeAttributePanelMetadataByNodeTypeName(
  nodeTypeName: string,
): NodeAttributePanelMetadata | undefined {
  return panelMetadataByNodeTypeName.get(nodeTypeName.toLowerCase());
}

export function getInteractionComposerHandler(tagName: string): InteractionComposerHandler | undefined {
  return handlersByTagName.get(tagName.toLowerCase());
}

export function listInteractionComposerHandlers(): ReadonlyArray<InteractionComposerHandler> {
  return Array.from(handlersByTagName.values());
}

export function listInteractionDescriptors(): ReadonlyArray<InteractionDescriptor> {
  return registeredDescriptors;
}
