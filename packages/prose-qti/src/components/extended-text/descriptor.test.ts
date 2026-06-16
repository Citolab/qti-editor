import { assertInteractionDescriptorContract } from '../shared/test-support/descriptor-contract.js';
import { extendedTextInteractionDescriptor } from './descriptor.js';

describe('extendedTextInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(extendedTextInteractionDescriptor);
  });
});
