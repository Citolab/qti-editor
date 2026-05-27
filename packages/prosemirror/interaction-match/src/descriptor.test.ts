import { matchInteractionDescriptor } from './descriptor.js';
import { assertInteractionDescriptorContract } from '@qti-editor/interaction-shared/test-support/descriptor-contract.js';

describe('matchInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(matchInteractionDescriptor);
  });
});
