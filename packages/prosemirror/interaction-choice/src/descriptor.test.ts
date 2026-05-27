import { assertInteractionDescriptorContract } from '@qti-editor/interaction-shared/test-support/descriptor-contract.js';

import { choiceInteractionDescriptor } from './descriptor.js';

describe('choiceInteractionDescriptor', () => {
  it('stays aligned with the shared interaction descriptor contract', () => {
    assertInteractionDescriptorContract(choiceInteractionDescriptor);
  });
});
