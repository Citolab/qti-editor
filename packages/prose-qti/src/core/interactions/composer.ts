import { associateInteractionDescriptor } from '@citolab/prose-qti/components/associate';
import { choiceInteractionDescriptor } from '@citolab/prose-qti/components/choice';
import { extendedTextInteractionDescriptor } from '@citolab/prose-qti/components/extended-text';
import { gapMatchInteractionDescriptor } from '@citolab/prose-qti/components/gap-match';
import { hottextInteractionDescriptor } from '@citolab/prose-qti/components/hottext';
import { inlineChoiceInteractionDescriptor } from '@citolab/prose-qti/components/inline-choice';
import { matchInteractionDescriptor } from '@citolab/prose-qti/components/match';
import { orderInteractionDescriptor } from '@citolab/prose-qti/components/order';
import { selectPointInteractionDescriptor } from '@citolab/prose-qti/components/select-point';
import { textEntryInteractionDescriptor } from '@citolab/prose-qti/components/text-entry';
import { qtiRubricBlockDescriptor } from '@citolab/prose-qti/components/rubric-block';

import type {
  InteractionNodeSpecEntry,
  InteractionComposerHandler,
  InteractionComposerMetadata,
  InteractionDescriptor,
  NodeAttributePanelMetadata,
} from '@citolab/prose-qti/interfaces';

const registeredDescriptors: InteractionDescriptor[] = [
  associateInteractionDescriptor,
  choiceInteractionDescriptor,
  extendedTextInteractionDescriptor,
  gapMatchInteractionDescriptor,
  hottextInteractionDescriptor,
  inlineChoiceInteractionDescriptor,
  matchInteractionDescriptor,
  orderInteractionDescriptor,
  selectPointInteractionDescriptor,
  textEntryInteractionDescriptor,
  qtiRubricBlockDescriptor,
];

type DeclaredBaseSchemaDependencyCarrier = {
  baseSchemaDependencies?: {
    nodeGroups?: string[];
  };
};

const baseSchemaDependencyNodeSpecs = {
  qtiMedia: [
    {
      name: 'qtiMediaStub',
      spec: {
        group: 'block qtiMedia',
        atom: true,
        selectable: true,
        parseDOM: [{ tag: 'qti-media-stub' }],
        toDOM: () => ['qti-media-stub'] as const,
      },
    },
  ],
} satisfies Record<string, InteractionNodeSpecEntry[]>;

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

export function listInteractionSchemaNodeSpecs(options?: {
  include?: string[];
}): ReadonlyArray<InteractionNodeSpecEntry> {
  const descriptors = options?.include
    ? registeredDescriptors.filter(descriptor => options.include!.includes(descriptor.tagName))
    : registeredDescriptors;

  const requiredBaseNodeGroups = new Set(
    descriptors.flatMap(
      descriptor =>
        (descriptor as InteractionDescriptor & DeclaredBaseSchemaDependencyCarrier)
          .baseSchemaDependencies?.nodeGroups ?? [],
    ),
  );

  const orderedNodeSpecs = [
    ...(Array.from(requiredBaseNodeGroups) as Array<keyof typeof baseSchemaDependencyNodeSpecs>).flatMap(
      groupName => baseSchemaDependencyNodeSpecs[groupName] ?? [],
    ),
    ...descriptors.flatMap(descriptor => descriptor.nodeSpecs),
  ];

  const dedupedNodeSpecs: InteractionNodeSpecEntry[] = [];
  const seenSpecs = new Set<string>();
  for (const nodeSpec of orderedNodeSpecs) {
    if (seenSpecs.has(nodeSpec.name)) continue;
    seenSpecs.add(nodeSpec.name);
    dedupedNodeSpecs.push(nodeSpec);
  }

  return dedupedNodeSpecs;
}

export function listInteractionPluginFactories(): ReadonlyArray<
  NonNullable<InteractionDescriptor['pluginFactories']>[number]
> {
  return registeredDescriptors.flatMap(descriptor => descriptor.pluginFactories ?? []);
}

export function listSelectedInteractionPluginFactories(options?: {
  include?: string[];
}): ReadonlyArray<NonNullable<InteractionDescriptor['pluginFactories']>[number]> {
  const descriptors = options?.include
    ? registeredDescriptors.filter(descriptor => options.include!.includes(descriptor.tagName))
    : registeredDescriptors;

  return descriptors.flatMap(descriptor => descriptor.pluginFactories ?? []);
}
