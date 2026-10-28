/**
 * `xml:lang` on item content survives a round trip.
 *
 * The import re-hosts the item body as HTML and keeps attribute local names, so `xml:lang` reaches
 * the schema as `lang`. Nothing held it — the `lang` mark and block attribute
 * (`@citolab/prose-extensions/lang`) do now — and nothing wrote `xml:lang` back:
 * `pmToRoundtripXml` does now. Run against both schema paths: `createQtiSchema()` (the conversion
 * functions, the Node bundle) and `defineQtiExtension()` (a ProseKit editor).
 */
import { createEditor } from 'prosekit/core';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { pmToHtml, pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { exportItemXml } from '../item-roundtrip/export.js';
import { importItemFromString } from '../item-roundtrip/import.js';
import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

const XML_NS = 'http://www.w3.org/XML/1998/namespace';

const item = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="LANG" title="Lang" xml:lang="nl">
  <qti-response-declaration identifier="RESPONSE" base-type="identifier" cardinality="single">
    <qti-correct-response><qti-value>A</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" base-type="float" cardinality="single"/>
  <qti-item-body>${body}</qti-item-body>
</qti-assessment-item>`;

const CHOICE = `
  <qti-choice-interaction response-identifier="RESPONSE" max-choices="1">
    <qti-prompt>Wat betekent <span xml:lang="en">deadline</span>?</qti-prompt>
    <qti-simple-choice identifier="A">een <span xml:lang="fr">date limite</span></qti-simple-choice>
    <qti-simple-choice identifier="B">een lijn</qti-simple-choice>
  </qti-choice-interaction>`;

const BODY = `
  <h2 xml:lang="de">Wortschatz</h2>
  <p xml:lang="en">The whole paragraph is English.</p>
  <p>Een zin met <span xml:lang="fr">je ne sais quoi</span> erin.</p>
  <ul xml:lang="en"><li><p>one</p></li></ul>
  <p>Geen taal.</p>
  ${CHOICE}`;

const prosekitSchema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const paths: Array<[string, (xml: string) => string]> = [
  ['createQtiSchema', xml => pmToQti3(qti3ToPm(xml))],
  ['defineQtiExtension', xml => exportItemXml(importItemFromString(xml, prosekitSchema), prosekitSchema)],
];

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

/** The language of each element of `tag` in the exported item, as `xml:lang` reads it. */
const langs = (doc: Document, tag: string) =>
  Array.from(doc.getElementsByTagName(tag)).map(element => element.getAttributeNS(XML_NS, 'lang'));

describe.each(paths)('xml:lang round trip (%s)', (_name, roundtrip) => {
  const out = parse(roundtrip(item(BODY)));
  const body = out.getElementsByTagName('qti-item-body')[0];

  test('on a paragraph, a heading and a list', () => {
    expect(langs(out, 'h2')).toEqual(['de']);
    expect(langs(out, 'ul')).toEqual(['en']);
    // The list's own paragraph, then the choice interaction's, carry none.
    expect(langs(out, 'p').filter(Boolean)).toEqual(['en']);
  });

  test('on a span inside a paragraph, a prompt and a choice', () => {
    const spans = Array.from(body.getElementsByTagName('span')).map(span => [
      span.getAttributeNS(XML_NS, 'lang'),
      span.textContent,
    ]);
    expect(spans).toEqual([
      ['fr', 'je ne sais quoi'],
      ['en', 'deadline'],
      ['fr', 'date limite'],
    ]);
  });

  test('is written as xml:lang, never as a bare lang', () => {
    expect(body.querySelectorAll('[lang]')).toHaveLength(0);
  });

  test('content without a language gets none', () => {
    const plain = parse(roundtrip(item('<p>Geen taal.</p>'))).getElementsByTagName('p')[0];
    expect(plain.attributes).toHaveLength(0);
  });
});

test("the item's own language still comes from the export context, beside the content's", () => {
  const doc = qti3ToPm(item(BODY));
  const out = parse(exportItemXml(doc, createQtiSchema(), { lang: 'nl' }));
  expect(out.documentElement.getAttributeNS(XML_NS, 'lang')).toBe('nl');
  expect(langs(out, 'h2')).toEqual(['de']);
});

describe('the editor view', () => {
  test('gets plain HTML lang, which is what the browser reads', () => {
    const html = pmToHtml(qti3ToPm(item('<p xml:lang="en">Hi <span xml:lang="fr">toi</span></p>')));
    expect(html).toBe('<p lang="en">Hi <span lang="fr">toi</span></p>');
  });

  test('a span without a language is not claimed by the lang mark', () => {
    const schema = createQtiSchema();
    const doc = qti3ToPm(item('<p>a <span>b</span></p>'), { schema });
    const text = doc.firstChild?.firstChild;
    expect(text?.text).toBe('a b');
    expect(text?.marks).toEqual([]);
  });
});
