import { assertInteractionDescriptorContract } from '../shared/test-support/descriptor-contract.js';
import { hottextInteractionDescriptor } from './descriptor.js';

describe('hottextInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(hottextInteractionDescriptor);
  });
});
