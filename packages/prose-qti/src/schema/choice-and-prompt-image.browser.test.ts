/**
 * `text*` left an authored `<img>` in a choice or prompt with no node to parse into, so it was dropped.
 * `(text | image)*` rather than `inline*`; the last test is what keeps the other inline nodes out.
 */
import { describe, expect, test } from 'vitest';

import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

const schema: Schema = createQtiSchema();

const PARAGRAPHS = ['qtiSimpleChoiceParagraph', 'qtiPromptParagraph'];

/** Every other member of the `inline` group — what `inline*` would have let in. */
const OTHER_INLINE = ['qtiGap', 'qtiHottext', 'qtiTextEntryInteraction', 'qtiInlineChoiceInteraction'];

function accepts(paragraph: string, child: string): boolean {
  return schema.nodes[paragraph].contentMatch.matchType(schema.nodes[child]) !== null;
}

describe('an image inside a choice or a prompt', () => {
  test.each(PARAGRAPHS)('%s accepts an image', name => {
    expect(accepts(name, 'image')).toBe(true);
  });

  test.each(PARAGRAPHS)('%s still accepts text', name => {
    expect(accepts(name, 'text')).toBe(true);
  });

  test.each(PARAGRAPHS)('%s stays closed to the other inline nodes', name => {
    for (const child of OTHER_INLINE) {
      expect(accepts(name, child), `${name} should not accept ${child}`).toBe(false);
    }
  });
});
