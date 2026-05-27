import { assertInteractionDescriptorContract } from '@qti-editor/interaction-shared/test-support/descriptor-contract.js';

import { gapMatchInteractionDescriptor } from './descriptor.js';

describe('gapMatchInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(gapMatchInteractionDescriptor);
  });
});
