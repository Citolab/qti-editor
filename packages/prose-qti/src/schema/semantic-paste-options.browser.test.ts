import { makeHtmlSemantic } from '@citolab/prose-extensions/paste-semantic-html';
import { expect, test } from 'vitest';

import { qtiSemanticPasteOptions } from './semantic-paste-options.js';

test('a paste keeps the shared QTI CSS classes and drops the rest, and every id', () => {
  expect(makeHtmlSemantic('<p class="MsoNormal qti-align-center" id="_Hlk1">x</p>', qtiSemanticPasteOptions)).toBe(
    '<p class="qti-align-center">x</p>',
  );
});
