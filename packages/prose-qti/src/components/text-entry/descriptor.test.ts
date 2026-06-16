import { assertInteractionDescriptorContract } from '@citolab/prose-qti/components/shared/test-support/descriptor-contract.js';

import { textEntryInteractionDescriptor } from './descriptor.js';

describe('textEntryInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(textEntryInteractionDescriptor);
  });
});
