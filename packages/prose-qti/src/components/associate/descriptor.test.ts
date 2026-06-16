import { assertInteractionDescriptorContract } from '@citolab/prose-qti/components/shared/test-support/descriptor-contract.js';

import { associateInteractionDescriptor } from './descriptor.js';

describe('associateInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(associateInteractionDescriptor);
  });
});
