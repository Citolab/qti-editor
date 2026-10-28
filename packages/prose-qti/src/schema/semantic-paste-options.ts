import type { SemanticPasteOptions } from '@citolab/prose-extensions/paste-semantic-html';

/**
 * The semantic paste plugin's options for a QTI editor: keep the shared QTI CSS class tokens
 * (`qti-align-center`, `qti-underline`, …) on HTML pasted from outside the editor, and drop every
 * other class. Those classes mean the same thing in any item they were copied from; a web page's or
 * Word's own do not.
 *
 * ```ts
 * createSemanticPastePlugin(qtiSemanticPasteOptions)
 * defineSemanticPasteExtension(qtiSemanticPasteOptions)
 * ```
 */
export const qtiSemanticPasteOptions: SemanticPasteOptions = {
  keepClass: token => token.startsWith('qti-'),
};
