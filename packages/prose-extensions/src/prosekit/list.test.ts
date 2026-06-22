import { describe, expect, it } from 'vitest';
import { createEditor, union } from 'prosekit/core';
import { defineDoc } from 'prosekit/extensions/doc';
import { defineParagraph } from 'prosekit/extensions/paragraph';
import { defineText } from 'prosekit/extensions/text';

import { defineList } from './list.js';

describe('defineList', () => {
  it('allows block content after the leading list item paragraph', () => {
    const editor = createEditor({
      extension: union(defineDoc(), defineText(), defineParagraph(), defineList()),
    });

    expect(editor.schema.nodes.list_item.spec.content).toBe('paragraph block*');
  });
});
