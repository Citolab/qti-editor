import { assertInteractionDescriptorContract } from '@citolab/prose-qti/components/shared/test-support/descriptor-contract.js';

import { orderInteractionDescriptor } from './descriptor.js';

describe('orderInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(orderInteractionDescriptor);
  });
});
