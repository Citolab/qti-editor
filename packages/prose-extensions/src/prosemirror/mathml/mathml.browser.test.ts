/**
 * The `mathml` atom: what it reads, what it stores, what it writes, and how an editor shows it.
 *
 * Against a schema small enough to read at a glance. The whole QTI item round trip is covered by
 * `@citolab/prose-qti`'s `schema/mathml.browser.test.ts`; this file is about the node spec itself.
 */
import { DOMParser as PmDOMParser, DOMSerializer, Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { describe, expect, test } from 'vitest';

import { findUnrepresentableElements } from '../schema-gaps/index.js';
import { createMathmlNodeViewPlugin, MATHML_NAMESPACE, MATHML_NODE_VIEW_CLASS, mathmlNodeSpec, mathmlSourceOf } from './index.js';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

const XHTML = 'http://www.w3.org/1999/xhtml';

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*', parseDOM: [{ tag: 'p' }], toDOM: () => ['p', 0] },
    text: { group: 'inline' },
    mathml: mathmlNodeSpec,
  },
});

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

/** An XML element tree re-hosted as HTML elements, the way prose-qti's item import hands it over. */
const rehost = (xml: string): Element => {
  const copy = (node: Node): Node => {
    if (node.nodeType !== 1) return document.createTextNode(node.textContent ?? '');
    const source = node as Element;
    const element = document.createElement(source.localName);
    for (const attr of Array.from(source.attributes)) {
      if (attr.name !== 'xmlns' && !attr.name.startsWith('xmlns:')) element.setAttribute(attr.localName, attr.value);
    }
    source.childNodes.forEach(child => element.appendChild(copy(child)));
    return element;
  };
  return copy(new DOMParser().parseFromString(xml, 'application/xml').documentElement) as Element;
};

const toXml = (doc: ProseMirrorNode): string => {
  const xmlDoc = document.implementation.createDocument(null, null, null);
  const wrapper = xmlDoc.createElement('div');
  wrapper.appendChild(render(doc, xmlDoc));
  return new XMLSerializer().serializeToString(wrapper);
};

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

    const rehosted = rehost(HALF);
    expect(rehosted.namespaceURI).toBe(XHTML);

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

  test('gives definitionURL back the case a re-hosted HTML element took from it', () => {
    const xml = `<math xmlns="${MATHML_NAMESPACE}"><apply><csymbol definitionURL="http://example.org/f">f</csymbol></apply></math>`;
    expect(mathmlSourceOf(rehost(xml))).toBe(xml);
  });

  test('keeps the XHTML in an annotation-xml out of the MathML namespace, re-hosted or not', () => {
    const xml =
      `<math xmlns="${MATHML_NAMESPACE}"><semantics><mi>x</mi>` +
      `<annotation-xml encoding="application/xhtml+xml"><span xmlns="${XHTML}">the  unknown</span></annotation-xml>` +
      `</semantics></math>`;
    expect(mathmlSourceOf(rehost(xml))).toBe(xml);
    expect(mathmlSourceOf(holder(xml).firstElementChild!)).toBe(xml);

    // And on the way out: the span is XHTML in the rendered DOM and in the exported XML.
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.node('mathml', { source: xml })])]);
    expect(render(doc).querySelector('span')?.namespaceURI).toBe(XHTML);
    expect(toXml(doc)).toBe(`<div><p>${xml}</p></div>`);
  });

  test('renders real MathML, so the browser lays the formula out', () => {
    const math = render(parse(`<p>${HALF}</p>`)).querySelector('math')!;
    expect(math.namespaceURI).toBe(MATHML_NAMESPACE);
    expect(math.querySelector('mfrac')?.namespaceURI).toBe(MATHML_NAMESPACE);
    expect(math.textContent).toBe('12');
  });

  test('serialises to XML with one xmlns declaration on <math>', () => {
    const xml = toXml(parse(`<p>${HALF}</p>`));
    expect(xml).toBe(`<div><p>${HALF}</p></div>`);
    expect(xml.match(/xmlns=/g)).toHaveLength(1);
  });

  test('writes a malformed source as a formula that says so, not as loose text', () => {
    // Only a host can store one (the parse rule always produces a well-formed source), e.g. from an
    // XML view. merror keeps it MathML, visible, and holding the text to fix.
    const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.node('mathml', { source: '<math><mi>x</math>' })])]);
    expect(toXml(doc)).toBe(`<div><p><math xmlns="${MATHML_NAMESPACE}"><merror><mtext>&lt;math&gt;&lt;mi&gt;x&lt;/math&gt;</mtext></merror></math></p></div>`);
  });

  test('keeps a schema-gap scan quiet about the elements inside a formula', () => {
    // The parser never reads inside a leaf, and this leaf keeps all of it — so <mfrac> and <mn> are
    // not "removed" and must not be reported as such.
    const outcome = findUnrepresentableElements(schema, holder(`<p>${HALF}</p>`));
    expect(outcome.changes).toEqual([]);
  });
});

describe('createMathmlNodeViewPlugin', () => {
  test('wraps the formula in an uneditable, draggable span, and the export is unchanged', () => {
    // A MathMLElement has no contentEditable or draggable property, so the ones ProseMirror sets on
    // the bare <math> do nothing.
    const doc = parse(`<p>a ${HALF} b</p>`);
    const host = document.body.appendChild(document.createElement('div'));
    const view = new EditorView(host, { state: EditorState.create({ doc, plugins: [createMathmlNodeViewPlugin()] }) });
    try {
      const wrapper = host.querySelector<HTMLElement>(`span.${MATHML_NODE_VIEW_CLASS}`)!;
      expect(wrapper.isContentEditable).toBe(false);
      expect(wrapper.draggable).toBe(true);
      expect(wrapper.firstElementChild?.namespaceURI).toBe(MATHML_NAMESPACE);
      expect(wrapper.querySelector('mfrac')).not.toBeNull();

      // A new source re-renders in place.
      const third = HALF.replace('<mn>2</mn>', '<mn>3</mn>');
      let at = -1;
      view.state.doc.descendants((node, pos) => {
        if (node.type.name === 'mathml') at = pos;
      });
      view.dispatch(view.state.tr.setNodeAttribute(at, 'source', third));
      expect(host.querySelector(`span.${MATHML_NODE_VIEW_CLASS} mfrac`)?.textContent).toBe('13');

      expect(toXml(view.state.doc)).toBe(`<div><p>a ${third} b</p></div>`);
    } finally {
      view.destroy();
      host.remove();
    }
  });
});
