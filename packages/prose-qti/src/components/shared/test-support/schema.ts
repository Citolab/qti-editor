import { Schema } from 'prosemirror-model';

import type { InteractionNodeSpecEntry } from '@citolab/prose-qti/interfaces';
import type { NodeSpec } from 'prosemirror-model';

const baseNodes = {
  doc: { content: 'block+' },
  text: { group: 'inline' },
  paragraph: {
    group: 'block',
    content: 'inline*',
    parseDOM: [{ tag: 'p' }],
    toDOM: () => ['p', 0] as const,
  },
} satisfies Record<string, NodeSpec>;

function createBaseGroupStubs(nodeGroups: string[] = []) {
  const stubs: Record<string, NodeSpec> = {};

  if (nodeGroups.includes('qtiMedia')) {
    stubs.qtiMediaStub = {
      group: 'block qtiMedia',
      atom: true,
      selectable: true,
      parseDOM: [{ tag: 'qti-media-stub' }],
      toDOM: () => ['qti-media-stub'] as const,
    };
  }

  return stubs;
}

export function createSchemaFromNodeSpecs(
  nodeSpecs: InteractionNodeSpecEntry[],
  options?: { baseSchemaNodeGroups?: string[] },
) {
  return new Schema({
    nodes: {
      ...baseNodes,
      ...createBaseGroupStubs(options?.baseSchemaNodeGroups),
      ...Object.fromEntries(nodeSpecs.map(nodeSpec => [nodeSpec.name, nodeSpec.spec])),
    },
  });
}
