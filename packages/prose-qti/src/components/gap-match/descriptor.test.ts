import { assertInteractionDescriptorContract } from '../shared/test-support/descriptor-contract.js';
import { gapMatchInteractionDescriptor } from './descriptor.js';

describe('gapMatchInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(gapMatchInteractionDescriptor);
  });
});
