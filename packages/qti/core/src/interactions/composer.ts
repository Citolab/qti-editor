import { associateInteractionDescriptor } from '@qti-editor/interactions/associate';
import { choiceInteractionDescriptor } from '@qti-editor/interactions/choice';
import { extendedTextInteractionDescriptor } from '@qti-editor/interactions/extended-text';
import { gapMatchInteractionDescriptor } from '@qti-editor/interactions/gap-match';
import { hottextInteractionDescriptor } from '@qti-editor/interactions/hottext';
import { inlineChoiceInteractionDescriptor } from '@qti-editor/interactions/inline-choice';
import { matchInteractionDescriptor } from '@qti-editor/interactions/match';
import { orderInteractionDescriptor } from '@qti-editor/interactions/order';
import { selectPointInteractionDescriptor } from '@qti-editor/interactions/select-point';
import { textEntryInteractionDescriptor } from '@qti-editor/interactions/text-entry';
import { qtiRubricBlockDescriptor } from '@qti-editor/interactions';
import { TextSelection, type EditorState, type Transaction } from 'prosemirror-state';

import type { NodeSpec } from 'prosemirror-model';
import type {
  InteractionNodeSpecEntry,
  InteractionComposerHandler,
  InteractionComposerMetadata,
  InteractionDescriptor,
  NodeAttributePanelMetadata,
} from '@qti-editor/interfaces';

function insertItemDivider(state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
  const { schema, tr } = state;
  const dividerType = schema.nodes.qtiItemDivider;

  if (!dividerType) return false;

  const { $from } = state.selection;
  const insertPos = $from.after();

  if (dispatch) {
    const divider = dividerType.create();
    const paragraph = schema.nodes.paragraph?.create();

    if (paragraph) {
      tr.insert(insertPos, [divider, paragraph]);
      tr.setSelection(TextSelection.create(tr.doc, insertPos + 2));
    } else {
      tr.insert(insertPos, divider);
    }

    dispatch(tr.scrollIntoView());
  }

  return true;
}

const qtiItemDividerNodeSpec: NodeSpec = {
  group: 'block',
  atom: true,
  selectable: true,
  attrs: {
    title: { default: '' },
    identifier: { default: '' },
  },
  parseDOM: [
    {
      tag: 'qti-item-divider',
      getAttrs: (dom) => {
        if (!(dom instanceof HTMLElement)) return false;
        return {
          title: dom.getAttribute('title') ?? '',
          identifier: dom.getAttribute('identifier') ?? '',
        };
      },
    },
  ],
  toDOM(node) {
    const attrs: Record<string, string> = { class: 'qti-item-divider' };
    if (node.attrs.title) attrs.title = node.attrs.title;
    if (node.attrs.identifier) attrs.identifier = node.attrs.identifier;
    return ['qti-item-divider', attrs];
  },
};

const qtiItemDividerDescriptor: InteractionDescriptor = {
  tagName: 'qti-item-divider',
  nodeTypeName: 'qtiItemDivider',
  nodeSpecs: [{ name: 'qtiItemDivider', spec: qtiItemDividerNodeSpec }],
  insertCommand: insertItemDivider,
  keyboardShortcut: 'Mod-Shift-d',
  composerMetadata: {
    tagName: 'qti-item-divider',
    nodeTypeName: 'qtiItemDivider',
    responseProcessing: {
      templateUri: '',
      internalSourceXml: '',
    },
    strippedAttributes: [],
  },
  composerHandler: undefined,
  attributePanelMetadata: {
    qtiitemdivider: {
      nodeTypeName: 'qtiItemDivider',
      editableAttributes: ['title', 'identifier'],
      fields: {
        title: { label: 'Title', input: 'text' },
        identifier: { label: 'Identifier', input: 'text' },
      },
    },
  },
};

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
  qtiItemDividerDescriptor,
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
