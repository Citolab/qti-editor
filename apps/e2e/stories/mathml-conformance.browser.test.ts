/**
 * MathML inside interactions, on two 1EdTech QTI 3 conformance items (copied unchanged from
 * qti-components' `public/assets/qti-conformance/Advanced/`):
 *
 *   - Q12 `inline-choice-mathml.xml`: every `qti-inline-choice` is a formula, written with an `m:`
 *     prefix.
 *   - Q6 `gap-match-example-2.xml`: every `qti-gap-text` is a formula, inside a `<span>`.
 *
 * Both through the real round trip (`qti3ToPm` → `pmToQti3`, the `createQtiSchema()` schema).
 * `qti-inline-choice` and `qti-gap-text` were `text*`. On `main` a formula there came back as its
 * digits run together. With a `mathml` node but those content models unchanged, the parser lifted
 * each formula out: the inline choices came back empty, and the gap match was split into four.
 */
import { createQtiSchema } from '@citolab/prose-qti/schema';
import { pmToQti3, qti3ToPm } from '@citolab/prose-qti/item-roundtrip';
import { findUnrepresentableElements } from '@citolab/prose-extensions/schema-gaps';
import { describe, expect, test } from 'vitest';

import { mountQtiRuntime } from './runtime-harness';
import inlineChoiceMathml from './fixtures/qti-conformance/inline-choice-mathml.xml?raw';
import gapMatchMathml from './fixtures/qti-conformance/gap-match-example-2.xml?raw';

import type { Locator } from 'vitest/browser';

const MATHML = 'http://www.w3.org/1998/Math/MathML';

const roundTrip = (xml: string) => pmToQti3(qti3ToPm(xml));
const parseXml = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

/** Each element's formulas as `source` text, whitespace dropped: `a=c`. */
const formulaTextsOf = (elements: Element[]) =>
  elements.map(element =>
    Array.from(element.getElementsByTagNameNS(MATHML, 'math')).map(math => (math.textContent ?? '').replace(/\s+/g, '')),
  );

/** The item body re-hosted as HTML, the way the import hands it to the parser. */
const itemBodyAsHtml = (xml: string): Element => {
  const copy = (node: Node): Node | null => {
    if (node.nodeType === 1) {
      const source = node as Element;
      const element = document.createElement(source.localName);
      for (const attr of Array.from(source.attributes)) {
        if (attr.name !== 'xmlns' && !attr.name.startsWith('xmlns:')) element.setAttribute(attr.localName, attr.value);
      }
      source.childNodes.forEach(child => {
        const copied = copy(child);
        if (copied) element.appendChild(copied);
      });
      return element;
    }
    return node.nodeType === 3 ? document.createTextNode(node.textContent ?? '') : null;
  };
  return copy(parseXml(xml).getElementsByTagName('qti-item-body')[0]) as Element;
};

describe('Q12 inline-choice-mathml.xml', () => {
  test('keeps one formula in each inline choice, inside the one interaction', () => {
    const exported = parseXml(roundTrip(inlineChoiceMathml));
    const interactions = Array.from(exported.getElementsByTagName('qti-inline-choice-interaction'));
    expect(interactions).toHaveLength(1);
    expect(interactions[0].getAttribute('response-identifier')).toBe('RESPONSE');

    const choices = Array.from(interactions[0].getElementsByTagName('qti-inline-choice'));
    expect(choices.map(choice => choice.getAttribute('identifier'))).toEqual(['choice1', 'choice2', 'choice3']);
    expect(formulaTextsOf(choices)).toEqual([['x=y'], ['a=c'], ['b=d']]);
    // No text of its own, and no formula left between the choices.
    for (const choice of choices) expect(Array.from(choice.childNodes).some(n => n.nodeType === 3 && /\S/.test(n.nodeValue ?? ''))).toBe(false);
    expect(interactions[0].getElementsByTagNameNS(MATHML, 'math')).toHaveLength(3);

    // The two formulas in the running text are still in the paragraph, before the interaction.
    const paragraph = interactions[0].parentElement!;
    expect(paragraph.localName).toBe('p');
    expect(formulaTextsOf([paragraph])[0]).toEqual(['a=b', 'b=c', 'x=y', 'a=c', 'b=d']);
  });

  test('is stable over a second round trip', () => {
    const once = roundTrip(inlineChoiceMathml);
    expect(roundTrip(once)).toBe(once);
  });

  test('the schema-gap scan reports nothing in it', () => {
    expect(findUnrepresentableElements(createQtiSchema(), itemBodyAsHtml(inlineChoiceMathml)).changes).toEqual([]);
  });

  // The exported item in the qti-components runtime: picking a formula scores, both ways.
  test('scores 1 when the candidate picks the correct formula, 0 for another', async () => {
    const exported = roundTrip(inlineChoiceMathml);
    // By identifier, not by text: the text selectors find nothing in a formula (`getByText('a=c')`
    // and a whitespace-tolerant pattern both time out), and a choice that is a formula has no other
    // text or role. `FrameLocator`'s type lists only the `getBy*` selectors, but the object is a
    // locator and has `locator(selector)`; the click is still a trusted CDP event.
    for (const [identifier, score] of [
      ['choice2', 1],
      ['choice1', 0],
    ] as const) {
      const harness = await mountQtiRuntime(exported);
      const frame = harness.frame as typeof harness.frame & { locator(selector: string): Locator };
      await frame.getByRole('button').first().click();
      await frame.locator(`qti-inline-choice[identifier="${identifier}"]`).click();
      expect(harness.response()).toBe(identifier);
      expect(harness.score()).toBe(score);
      harness.destroy();
    }
  });
});

describe('Q6 gap-match-example-2.xml', () => {
  test('keeps one gap match holding the four formula gap texts', () => {
    const exported = parseXml(roundTrip(gapMatchMathml));
    const interactions = Array.from(exported.getElementsByTagName('qti-gap-match-interaction'));
    expect(interactions).toHaveLength(1);
    expect(interactions[0].getAttribute('response-identifier')).toBe('RESPONSE');

    const gapTexts = Array.from(interactions[0].getElementsByTagName('qti-gap-text'));
    expect(gapTexts.map(gapText => gapText.getAttribute('identifier'))).toEqual(['s1', 's2', 's3', 's4']);
    expect(formulaTextsOf(gapTexts)).toEqual([['e0'], ['cos(π)'], ['|−21|3'], ['5']]);

    // Attributes on the formulas come through; the `<span>` around each one does not (no node).
    const first = gapTexts[0].getElementsByTagNameNS(MATHML, 'math')[0];
    expect(first.getAttribute('alttext')).toBe('ee to the power of zero');
    expect(first.parentElement?.localName).toBe('qti-gap-text');
  });

  test('is stable over a second round trip', () => {
    const once = roundTrip(gapMatchMathml);
    expect(roundTrip(once)).toBe(once);
  });

  // Not MathML, and not new: `qtiGapMatchInteraction` is `qtiPrompt? qtiGapText+ paragraph+`, so the
  // item's `<div><table>` of gaps is moved out of the interaction, on `main` too. Recorded in
  // docs/testing-findings.md. Flips to a failure, on purpose, once the content model admits it.
  test.fails('keeps the gaps inside the interaction', () => {
    const exported = parseXml(roundTrip(gapMatchMathml));
    const interaction = exported.getElementsByTagName('qti-gap-match-interaction')[0];
    expect(interaction.getElementsByTagName('qti-gap')).toHaveLength(8);
  });
});
