import { describe, expect, it } from 'vitest';

import {
  listInteractionDescriptors,
  listInteractionSchemaNodeSpecs,
  listSelectedInteractionPluginFactories,
} from './composer.js';

describe('interaction schema assembly', () => {
  it('adds declared base-schema stubs when selecting interactions with external group dependencies', () => {
    const nodeSpecs = listInteractionSchemaNodeSpecs({
      include: ['qti-match-interaction'],
    });

    expect(nodeSpecs.map(nodeSpec => nodeSpec.name)).toContain('qtiMediaStub');
    expect(nodeSpecs.map(nodeSpec => nodeSpec.name)).toContain('qtiMatchInteraction');
  });

  it('does not add base-schema stubs when no selected interaction declares them', () => {
    const nodeSpecs = listInteractionSchemaNodeSpecs({
      include: ['qti-text-entry-interaction'],
    });

    expect(nodeSpecs.map(nodeSpec => nodeSpec.name)).not.toContain('qtiMediaStub');
    expect(nodeSpecs.map(nodeSpec => nodeSpec.name)).toContain('qtiTextEntryInteraction');
  });
});

describe('interaction plugin assembly', () => {
  it('filters plugin factories by the selected descriptors instead of registry index', () => {
    const descriptors = listInteractionDescriptors().filter(descriptor =>
      ['qti-choice-interaction', 'qti-hottext-interaction'].includes(descriptor.tagName),
    );
    const expectedPluginFactoryCount = descriptors.reduce(
      (count, descriptor) => count + (descriptor.pluginFactories?.length ?? 0),
      0,
    );

    const pluginFactories = listSelectedInteractionPluginFactories({
      include: ['qti-choice-interaction', 'qti-hottext-interaction'],
    });

    expect(pluginFactories).toHaveLength(expectedPluginFactoryCount);
  });
});
