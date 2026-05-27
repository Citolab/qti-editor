import { assertInteractionDescriptorContract } from '@qti-editor/interaction-shared/test-support/descriptor-contract.js';

import { orderInteractionDescriptor } from './descriptor.js';

describe('orderInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(orderInteractionDescriptor);
  });
});
