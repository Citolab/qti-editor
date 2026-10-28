/**
 * The `mathml` atom in `defineBasicExtension()`: what it reads, what it stores, what it writes.
 *
 * The whole QTI item round trip, on the plain-ProseMirror schema, is covered by `@citolab/prose-qti`'s
 * `schema/mathml.browser.test.ts`; this file is about the node spec itself.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { defineBasicExtension } from '../../prosekit/basic.js';
import { findUnrepresentableElements } from '../schema-gaps/index.js';
import { MATHML_NAMESPACE, mathmlSourceOf } from './index.js';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineBasicExtension() }).schema;

const HALF = `<math xmlns="${MATHML_NAMESPACE}"><mfrac><mn>1</mn><mn>2</mn></mfrac></math>`;

const holder = (html: string): HTMLElement => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
};

const parse = (html: string): ProseMirrorNode => PmDOMParser.fromSchema(schema).parse(holder(html));

const formulaOf = (doc: ProseMirrorNode): ProseMirrorNode => {
  let found: ProseMirrorNode | undefined;
  doc.descendants(node => {
    if (!found && node.type.name === 'mathml') found = node;
    return !found;
  });
  if (!found) throw new Error('no formula in the document');
  return found;
};

const render = (doc: ProseMirrorNode, target: Document = document): DocumentFragment =>
  DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document: target });

describe('the mathml node', () => {
  test('reads <math> as one inline atom holding its source', () => {
    const doc = parse('<p>One half is <math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>.</p>');
    expect(() => doc.check()).not.toThrow();

    const formula = formulaOf(doc);
    expect(formula.isInline && formula.isAtom).toBe(true);
    expect(formula.attrs.source).toBe(HALF);
    expect(doc.textContent).toBe('One half is .');
  });

  test('stores the same source whether <math> arrives as MathML or as an HTML element', () => {
    // The HTML parser puts <math> in the MathML namespace; an importer that re-hosts XML as HTML
    // elements (prose-qti's does) hands over an HTML element of the same name.
    const real = holder('<math><mfrac><mn>1</mn><mn>2</mn></mfrac></math>').firstElementChild!;
    expect(real.namespaceURI).toBe(MATHML_NAMESPACE);

    const rehosted = document.createElement('math');
    const fraction = rehosted.appendChild(document.createElement('mfrac'));
    fraction.appendChild(document.createElement('mn')).textContent = '1';
    fraction.appendChild(document.createElement('mn')).textContent = '2';
    expect(rehosted.namespaceURI).toBe('http://www.w3.org/1999/xhtml');

    expect(mathmlSourceOf(rehosted)).toBe(mathmlSourceOf(real));
  });

  test('normalises whitespace the way MathML does, and keeps a no-break space', () => {
    const source = mathmlSourceOf(
      holder(`<math display="block">
        <mrow>
          <mtext>  speed  in\n  km </mtext>
          <mspace width="1em"/>
          <mtext>&nbsp;</mtext>
        </mrow>
      </math>`).firstElementChild!,
    );
    expect(source).toBe(
      `<math xmlns="${MATHML_NAMESPACE}" display="block"><mrow><mtext>speed in km</mtext><mspace width="1em"/><mtext>\u00a0</mtext></mrow></math>`,
    );
  });

  test('escapes what has to be escaped', () => {
    const source = mathmlSourceOf(holder('<math><mo>&lt;</mo><mi mathvariant="a&quot;b">&amp;</mi></math>').firstElementChild!);
    expect(source).toBe(`<math xmlns="${MATHML_NAMESPACE}"><mo>&lt;</mo><mi mathvariant="a&quot;b">&amp;</mi></math>`);
  });

  test('renders real MathML, so the browser lays the formula out', () => {
    const math = render(parse(`<p>${HALF}</p>`)).querySelector('math')!;
    expect(math.namespaceURI).toBe(MATHML_NAMESPACE);
    expect(math.querySelector('mfrac')?.namespaceURI).toBe(MATHML_NAMESPACE);
    expect(math.textContent).toBe('12');
  });

  test('serialises to XML with one xmlns declaration on <math>', () => {
    const xmlDoc = document.implementation.createDocument(null, null, null);
    const wrapper = xmlDoc.createElement('div');
    wrapper.appendChild(render(parse(`<p>${HALF}</p>`), xmlDoc));
    const xml = new XMLSerializer().serializeToString(wrapper);

    expect(xml).toBe(`<div><p>${HALF}</p></div>`);
    expect(xml.match(/xmlns=/g)).toHaveLength(1);
  });

  test('keeps a schema-gap scan quiet about the elements inside a formula', () => {
    // The parser never reads inside a leaf, and this leaf keeps all of it — so <mfrac> and <mn> are
    // not "removed" and must not be reported as such.
    const outcome = findUnrepresentableElements(schema, holder(`<p>${HALF}</p>`));
    expect(outcome.changes).toEqual([]);
  });
});
