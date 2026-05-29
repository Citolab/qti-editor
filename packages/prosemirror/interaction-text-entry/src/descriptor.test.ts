import { assertInteractionDescriptorContract } from '@qti-editor/interaction-shared/test-support/descriptor-contract.js';

import { textEntryInteractionDescriptor } from './descriptor.js';

describe('textEntryInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(textEntryInteractionDescriptor);
  });
});
