import { assertInteractionDescriptorContract } from '@citolab/prose-qti/components/shared/test-support/descriptor-contract.js';

import { selectPointInteractionDescriptor } from './descriptor.js';

describe('selectPointInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(selectPointInteractionDescriptor);
  });
});
