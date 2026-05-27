import { selectPointInteractionDescriptor } from './descriptor.js';
import { assertInteractionDescriptorContract } from '@qti-editor/interaction-shared/test-support/descriptor-contract.js';

describe('selectPointInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(selectPointInteractionDescriptor);
  });
});
