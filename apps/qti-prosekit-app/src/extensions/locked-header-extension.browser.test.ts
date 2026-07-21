import { describe, expect, it } from 'vitest';

import { ensureLockedHeader } from './locked-header-extension.js';

import type { NodeJSON } from 'prosekit/core';

describe('ensureLockedHeader', () => {
  it('keeps the locked header and removes adjacent stale item dividers', () => {
    const doc: NodeJSON = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [] },
        { type: 'paragraph', content: [] },
        { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
        { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
        { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
      ],
    };

    expect(ensureLockedHeader(doc)).toEqual({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [] },
        { type: 'paragraph', content: [] },
        { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
      ],
    });
  });

  it('preserves later dividers when item content exists before them', () => {
    const doc: NodeJSON = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [] },
        { type: 'paragraph', content: [] },
        { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'Question content' }] },
        { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
      ],
    };

    expect(ensureLockedHeader(doc)).toEqual(doc);
  });
});
