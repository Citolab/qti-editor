import { QTI_INLINE_ELEMENTS } from './qti-inline-elements.js';

import type { SemanticPasteOptions } from '@citolab/prose-extensions/paste-semantic-html';

/**
 * The semantic paste plugin's options for a QTI editor: keep the shared QTI CSS class tokens
 * (`qti-align-center`, `qti-underline`, …) on HTML pasted from outside the editor, and drop every
 * other class. Those classes mean the same thing in any item they were copied from; a web page's or
 * Word's own do not. A pasted `<div>` holding text and QTI's inline elements counts as a paragraph.
 *
 * ```ts
 * createSemanticPastePlugin(qtiSemanticPasteOptions)
 * defineSemanticPasteExtension(qtiSemanticPasteOptions)
 * ```
 */
export const qtiSemanticPasteOptions: SemanticPasteOptions = {
  keepClass: token => token.startsWith('qti-'),
  inlineElements: QTI_INLINE_ELEMENTS,
};
