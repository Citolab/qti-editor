/**
 * The QTI elements that sit inside a line of text: the `qti-*` children QTI 3's `HTMLTextDType`
 * allows (`imsqti_asiv3p0_v1p0.xsd`), so the ones that may appear in a paragraph.
 *
 * `@citolab/prose-extensions/html-schema` knows only HTML, and treats every custom element as a
 * block when it decides whether a `<div>` is a paragraph written as a div (`isInlineContentDiv`).
 * This list is what a QTI schema passes it as `inlineElements`: `createQtiSchema()`,
 * `defineQtiExtension()` and `qtiSemanticPasteOptions` do. It includes the elements the editor has
 * no node for (`qti-feedback-inline`, `qti-template-inline`, `qti-custom-interaction`,
 * `qti-printed-variable`), because the question is what the markup is, not what the editor keeps.
 * `qti-inline-elements.browser.test.ts` checks that every inline node the interactions define is in
 * it.
 */
export const QTI_INLINE_ELEMENTS: readonly string[] = [
  'qti-text-entry-interaction',
  'qti-hottext',
  'qti-printed-variable',
  'qti-gap',
  'qti-feedback-inline',
  'qti-template-inline',
  'qti-inline-choice-interaction',
  'qti-end-attempt-interaction',
  'qti-custom-interaction',
];
