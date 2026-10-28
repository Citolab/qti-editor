/**
 * A MathML formula through the whole item round trip, QTI 3 in and QTI 3 out, on the roundtrip
 * schema (`createQtiSchema`): in running text, in a choice and in a prompt.
 *
 * Before: `<math>` and everything in it was dropped on import. ProseMirror skips elements it has no
 * rule for and parses their text in their place, so `x = ½` came back as the text `x = 12`, and a
 * choice that was a fraction came back as two digits.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { createQtiSchema } from './create-qti-schema.js';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

const MATHML = 'http://www.w3.org/1998/Math/MathML';

const ITEM = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="MATH" title="Maths">
  <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" base-type="float" cardinality="single"/>
  <qti-item-body>
    <p>Solve <math xmlns="${MATHML}"><mi>x</mi><mo>=</mo><mrow><mfrac><mn>1</mn><mn>2</mn></mfrac></mrow></math> for x.</p>
    <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-prompt>Which is larger than <math xmlns="${MATHML}"><msup><mi>x</mi><mn>2</mn></msup></math> at x = 0.5?</qti-prompt>
      <qti-simple-choice identifier="A"><math xmlns="${MATHML}" display="inline"><mfrac><mn>1</mn><mn>2</mn></mfrac></math></qti-simple-choice>
      <qti-simple-choice identifier="B">
        <math xmlns="${MATHML}">
          <mfrac>
            <mn>1</mn>
            <mn>4</mn>
          </mfrac>
        </math>
      </qti-simple-choice>
    </qti-choice-interaction>
  </qti-item-body>
</qti-assessment-item>`;

const schema: Schema = createQtiSchema();

const formulasIn = (doc: ProseMirrorNode) => {
  const found: { source: string; parent: string }[] = [];
  doc.descendants((node, _pos, parent) => {
    if (node.type.name === 'mathml') found.push({ source: node.attrs.source as string, parent: parent!.type.name });
  });
  return found;
};

const exported = (doc: ProseMirrorNode) => new DOMParser().parseFromString(pmToQti3(doc), 'application/xml');

const mathElementsOf = (xml: XMLDocument) => Array.from(xml.getElementsByTagNameNS(MATHML, 'math'));

describe('MathML through qti3ToPm → pmToQti3', () => {
  test('the schema has a formula node, admitted where a choice or a prompt has its text', () => {
    expect(schema.nodes.mathml?.isAtom).toBe(true);
    for (const paragraph of ['qtiSimpleChoiceParagraph', 'qtiPromptParagraph', 'paragraph']) {
      expect(schema.nodes[paragraph].contentMatch.matchType(schema.nodes.mathml), paragraph).not.toBeNull();
    }
  });

  test('each formula is imported whole, in running text, a prompt and a choice', () => {
    const doc = qti3ToPm(ITEM);
    expect(() => doc.check()).not.toThrow();

    expect(formulasIn(doc)).toEqual([
      {
        parent: 'paragraph',
        source: `<math xmlns="${MATHML}"><mi>x</mi><mo>=</mo><mrow><mfrac><mn>1</mn><mn>2</mn></mfrac></mrow></math>`,
      },
      { parent: 'qtiPromptParagraph', source: `<math xmlns="${MATHML}"><msup><mi>x</mi><mn>2</mn></msup></math>` },
      {
        parent: 'qtiSimpleChoiceParagraph',
        source: `<math xmlns="${MATHML}" display="inline"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>`,
      },
      // The indentation is gone: whitespace between MathML elements means nothing.
      { parent: 'qtiSimpleChoiceParagraph', source: `<math xmlns="${MATHML}"><mfrac><mn>1</mn><mn>4</mn></mfrac></math>` },
    ]);
    // Not left behind as loose text either.
    expect(doc.textContent).not.toContain('12');
  });

  test('is exported in the MathML namespace, with xmlns on <math>, in place', () => {
    const xml = exported(qti3ToPm(ITEM));
    const formulas = mathElementsOf(xml);
    expect(formulas).toHaveLength(4);
    for (const math of formulas) {
      expect(math.namespaceURI).toBe(MATHML);
      expect(math.getAttribute('xmlns')).toBe(MATHML);
      // Children inherit the namespace rather than falling back to QTI's.
      for (const child of Array.from(math.getElementsByTagName('*'))) expect(child.namespaceURI).toBe(MATHML);
    }

    const [inText, inPrompt, choiceA, choiceB] = formulas;
    expect(inText.parentElement?.localName).toBe('p');
    expect(inPrompt.closest('qti-prompt')).not.toBeNull();
    expect(choiceA.closest('qti-simple-choice')?.getAttribute('identifier')).toBe('A');
    expect(choiceA.getAttribute('display')).toBe('inline');
    expect(choiceB.closest('qti-simple-choice')?.getAttribute('identifier')).toBe('B');
    expect(choiceB.textContent?.replace(/\s+/g, '')).toBe('14');

    // The written XML carries the declaration itself, not only the DOM's view of it.
    expect(pmToQti3(qti3ToPm(ITEM))).toContain(`<math xmlns="${MATHML}"`);
  });

  test('survives a second round trip unchanged', () => {
    const once = pmToQti3(qti3ToPm(ITEM));
    expect(pmToQti3(qti3ToPm(once))).toBe(once);
  });
});

describe('MathML in the ProseKit schema (defineQtiExtension)', () => {
  const prosekitSchema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

  test('a formula as a choice is held in the choice paragraph', () => {
    const host = document.createElement('div');
    host.innerHTML = `<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
      <qti-simple-choice identifier="A"><math><mfrac><mn>1</mn><mn>2</mn></mfrac></math></qti-simple-choice>
    </qti-choice-interaction>`;
    const doc = PmDOMParser.fromSchema(prosekitSchema).parse(host);
    expect(() => doc.check()).not.toThrow();
    expect(formulasIn(doc)).toEqual([
      { parent: 'qtiSimpleChoiceParagraph', source: `<math xmlns="${MATHML}"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>` },
    ]);
  });
});
