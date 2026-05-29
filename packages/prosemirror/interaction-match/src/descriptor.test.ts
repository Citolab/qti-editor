import { assertInteractionDescriptorContract } from '@qti-editor/interaction-shared/test-support/descriptor-contract.js';

import { matchInteractionDescriptor } from './descriptor.js';

describe('matchInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(matchInteractionDescriptor);
  });
});
