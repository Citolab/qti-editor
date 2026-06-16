import { assertInteractionDescriptorContract } from '../shared/test-support/descriptor-contract.js';
import { matchInteractionDescriptor } from './descriptor.js';

describe('matchInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(matchInteractionDescriptor);
  });
});
