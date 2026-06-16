import { createSchemaFromNodeSpecs } from './schema.js';

import type { InteractionDescriptor } from '@qti-editor/interfaces';

function expectRootAttributePanelMetadata(descriptor: InteractionDescriptor) {
  if (!descriptor.attributePanelMetadata) {
    return;
  }

  const knownNodeTypeNames = new Set(descriptor.nodeSpecs.map(nodeSpec => nodeSpec.name));
  const rootKey = descriptor.nodeTypeName.toLowerCase();
  const rootMetadata = descriptor.attributePanelMetadata[rootKey];

  expect(rootMetadata).toBeDefined();

  for (const [key, metadata] of Object.entries(descriptor.attributePanelMetadata)) {
    expect(key).toBe(metadata.nodeTypeName.toLowerCase());
    expect(knownNodeTypeNames.has(metadata.nodeTypeName)).toBe(true);
  }
}

export function assertInteractionDescriptorContract(descriptor: InteractionDescriptor) {
  expect(descriptor.tagName).toMatch(/^qti-/);
  expect(descriptor.nodeTypeName).toMatch(/^qti[A-Z]/);
  expect(descriptor.nodeSpecs.length).toBeGreaterThan(0);

  const nodeSpecNames = descriptor.nodeSpecs.map(nodeSpec => nodeSpec.name);
  expect(new Set(nodeSpecNames).size).toBe(nodeSpecNames.length);
  expect(nodeSpecNames).toContain(descriptor.nodeTypeName);

  const schema = createSchemaFromNodeSpecs(descriptor.nodeSpecs, {
    baseSchemaNodeGroups: descriptor.baseSchemaDependencies?.nodeGroups,
  });
  expect(schema.nodes[descriptor.nodeTypeName]).toBeDefined();
  for (const nodeSpecName of nodeSpecNames) {
    expect(schema.nodes[nodeSpecName]).toBeDefined();
  }

  expect(descriptor.composerMetadata.tagName).toBe(descriptor.tagName);
  expect(descriptor.composerMetadata.nodeTypeName).toBe(descriptor.nodeTypeName);

  for (const createPlugin of descriptor.pluginFactories ?? []) {
    const plugin = createPlugin();
    expect(plugin).toBeDefined();
    expect(typeof plugin.spec).toBe('object');
  }

  expectRootAttributePanelMetadata(descriptor);
}
