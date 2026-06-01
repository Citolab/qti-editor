import { createSchemaFromNodeSpecs } from '@qti-editor/interaction-shared/test-support/schema.js';
import { jsonFromHTML } from 'prosekit/core';
import { describe, expect, it } from 'vitest';

import { choiceInteractionDescriptor } from './descriptor.js';

describe('interaction-only node unwrapping outside valid parents', () => {
  it('unwraps qti-prompt at the document root to plain paragraph content', () => {
    const schema = createSchemaFromNodeSpecs(choiceInteractionDescriptor.nodeSpecs);
    const docJson = jsonFromHTML('<qti-prompt><p>Prompt text</p></qti-prompt>', {
      schema,
    });

    expect(JSON.stringify(docJson)).not.toContain('qtiPrompt');
    expect(docJson).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Prompt text' }] }],
    });
  });

  it('unwraps qti-simple-choice at the document root to plain paragraph content', () => {
    const schema = createSchemaFromNodeSpecs(choiceInteractionDescriptor.nodeSpecs);
    const docJson = jsonFromHTML('<qti-simple-choice identifier="A"><p>Choice A</p></qti-simple-choice>', {
      schema,
    });

    expect(JSON.stringify(docJson)).not.toContain('qtiSimpleChoice');
    expect(docJson).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Choice A' }] }],
    });
  });
});
