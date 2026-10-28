/**
 * `class`, `id`, `lang` and `xml:lang` on item content survive a full item load → save, in both
 * schemas: `createQtiSchema()` (the roundtrip schema, and the Node conversion's) and the ProseKit one
 * (`defineQtiExtension()`: `@citolab/prose-extensions`' basic extension plus every interaction).
 *
 * Before, every one of these came back without its attribute — including `qti-align-center`, a class
 * from QTI's own shared CSS, and the language a screen reader needs. The interactions already
 * modelled `class`; this covers the content around and inside them.
 */
import { GLOBAL_ATTR_NODES, GLOBAL_ATTRS } from '@citolab/prose-extensions/html-schema';
import { createEditor } from 'prosekit/core';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { htmlToPm, pmToHtml, pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { exportItemXml } from '../item-roundtrip/export.js';
import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

const XML_NS = 'http://www.w3.org/XML/1998/namespace';

const SCHEMAS: ReadonlyArray<readonly [string, Schema]> = [
  ['createQtiSchema()', createQtiSchema()],
  ['the ProseKit schema', createEditor({ extension: defineQtiExtension() }).schema],
];

const CHOICE =
  '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">' +
  '<qti-simple-choice identifier="A">Maas</qti-simple-choice>' +
  '<qti-simple-choice identifier="B">Waal</qti-simple-choice>' +
  '</qti-choice-interaction>';

const item = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Item" adaptive="false" time-dependent="false" xml:lang="nl">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>B</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

const parse = (xml: string) => new DOMParser().parseFromString(xml, 'application/xml');

const attributesOf = (doc: Document, selector: string, attribute: string) =>
  Array.from(doc.querySelectorAll(`qti-item-body ${selector}`)).map(element => element.getAttribute(attribute));

/** `xml:lang` (in the XML namespace) and `lang` of each element, as `[xml:lang, lang]`. */
const languagesOf = (doc: Document, selector: string) =>
  Array.from(doc.querySelectorAll(`qti-item-body ${selector}`)).map(element => [
    element.getAttributeNS(XML_NS, 'lang'),
    element.getAttribute('lang'),
  ]);

describe.each(SCHEMAS)('in %s', (_label, schema) => {
  const roundtrip = (body: string): Document => parse(pmToQti3(qti3ToPm(item(body), { schema }), { schema }));

  describe('class survives load → save', () => {
    test.each([
      ['a paragraph', '<p class="qti-align-center">Centred</p>', '> p', ['qti-align-center']],
      ['a heading', '<h2 class="kop">Kop</h2>', 'h2', ['kop']],
      ['lists and items', '<ul class="lijst"><li class="item"><p>a</p></li><li><p>b</p></li></ul>', 'ul, li', ['lijst', 'item', null]],
      ['an image', '<p><img src="media/a.png" alt="a" class="qti-valign-middle"/></p>', 'img', ['qti-valign-middle']],
      [
        'a table, its rows and its cells',
        '<table class="tabel"><tbody><tr class="rij"><th class="kop"><p>K</p></th></tr><tr><td class="cel"><p>C</p></td></tr></tbody></table>',
        'table, tr, th, td',
        ['tabel', 'rij', 'kop', null, 'cel'],
      ],
      ['strong and em', '<p><strong class="sterk">vet</strong> en <em class="nadruk">schuin</em></p>', 'strong, em', ['sterk', 'nadruk']],
      ['a phrasing mark', '<p>De <abbr class="afk">WHO</abbr>.</p>', 'abbr', ['afk']],
      ['a span', '<p>Lees <span class="qti-underline">dit</span> woord.</p>', 'span', ['qti-underline']],
    ])('on %s', (_name, body, selector, expected) => {
      expect(attributesOf(roundtrip(body + CHOICE), selector, 'class')).toEqual(expected);
    });

    test('on qti-prompt and on its paragraph', () => {
      const choice = CHOICE.replace('max-choices="1">', 'max-choices="1"><qti-prompt class="vraag"><p class="pp">Kies</p></qti-prompt>');
      expect(attributesOf(roundtrip(`<p>Vraag</p>${choice}`), 'qti-prompt, qti-prompt > p', 'class')).toEqual(['vraag', 'pp']);
    });

    test('on the paragraph inside a choice', () => {
      const choice = CHOICE.replace('<qti-simple-choice identifier="A">Maas', '<qti-simple-choice identifier="A"><p class="optie">Maas</p>');
      // The second choice is bare text; the editor writes its paragraph without a class.
      expect(attributesOf(roundtrip(`<p>Vraag</p>${choice}`), 'qti-simple-choice > p', 'class')).toEqual(['optie', null]);
    });

    test('on a match set and the paragraph inside its choice', () => {
      const match =
        '<qti-match-interaction response-identifier="RESPONSE" max-associations="1">' +
        '<qti-simple-match-set class="bron"><qti-simple-associable-choice identifier="A" match-max="1"><p class="optie">a</p></qti-simple-associable-choice></qti-simple-match-set>' +
        '<qti-simple-match-set class="doel"><qti-simple-associable-choice identifier="X" match-max="1">x</qti-simple-associable-choice></qti-simple-match-set>' +
        '</qti-match-interaction>';
      const doc = roundtrip(`<p>Vraag</p>${match}`);
      expect(attributesOf(doc, 'qti-simple-match-set', 'class')).toEqual(['bron', 'doel']);
      expect(attributesOf(doc, 'qti-simple-associable-choice > p', 'class')).toEqual(['optie', null]);
    });
  });

  test('id survives on body content, marks, a prompt and its paragraph', () => {
    const choice = CHOICE.replace('max-choices="1">', 'max-choices="1"><qti-prompt id="prompt"><p id="pp">Kies</p></qti-prompt>');
    const doc = roundtrip(
      `<p id="p1">a <strong id="s1">b</strong> <span id="sp1">c</span></p><table id="t1"><tbody><tr id="r1"><td id="c1"><p>C</p></td></tr></tbody></table>${choice}`,
    );
    expect(Array.from(doc.querySelectorAll('qti-item-body [id]')).map(e => `${e.localName}#${e.getAttribute('id')}`)).toEqual([
      'p#p1',
      'strong#s1',
      'span#sp1',
      'table#t1',
      'tr#r1',
      'td#c1',
      'qti-prompt#prompt',
      'p#pp',
    ]);
  });

  test('an imported item with a duplicate id keeps both: loading does not repair it', () => {
    const doc = roundtrip('<p id="dup">a</p><p id="dup">b</p>');
    expect(attributesOf(doc, 'p', 'id')).toEqual(['dup', 'dup']);
  });

  describe('xml:lang and lang', () => {
    const BODY =
      '<h2 xml:lang="de">Wortschatz</h2>' +
      '<p xml:lang="en">The whole paragraph is English.</p>' +
      '<p lang="fr">Written with lang, not xml:lang.</p>' +
      '<p lang="en" xml:lang="en">Both.</p>' +
      '<p>Een zin met <span xml:lang="fr">je ne sais quoi</span> erin.</p>' +
      '<ul xml:lang="en"><li><p>one</p></li></ul>' +
      CHOICE.replace('max-choices="1">', 'max-choices="1"><qti-prompt>Wat betekent <span xml:lang="en">deadline</span>?</qti-prompt>').replace(
        '>Maas<',
        '>een <span xml:lang="fr">date limite</span><',
      );

    test('each is written back as the attribute it was, and neither becomes the other', () => {
      const doc = roundtrip(BODY);
      expect(languagesOf(doc, 'h2')).toEqual([['de', null]]);
      expect(languagesOf(doc, 'ul')).toEqual([['en', null]]);
      expect(languagesOf(doc, '> p')).toEqual([
        ['en', null],
        [null, 'fr'],
        ['en', 'en'],
        [null, null],
      ]);
    });

    test('on a span inside a paragraph, a prompt and a choice', () => {
      const doc = roundtrip(BODY);
      expect(languagesOf(doc, 'span')).toEqual([
        ['fr', null],
        ['en', null],
        ['fr', null],
      ]);
      expect(Array.from(doc.querySelectorAll('qti-item-body span')).map(span => span.textContent)).toEqual([
        'je ne sais quoi',
        'deadline',
        'date limite',
      ]);
    });

    test("the item's own language still comes from the export context", () => {
      const out = parse(exportItemXml(qti3ToPm(item(BODY), { schema }), schema, { lang: 'nl' }));
      expect(out.documentElement.getAttributeNS(XML_NS, 'lang')).toBe('nl');
      expect(languagesOf(out, 'h2')).toEqual([['de', null]]);
    });
  });

  describe('one span, all of its attributes', () => {
    test('class and xml:lang on the same span are both kept', () => {
      const doc = roundtrip('<p>Een <span class="qti-underline" xml:lang="fr">mot</span> hier.</p>');
      const span = doc.querySelector('qti-item-body span');
      expect([span?.getAttribute('class'), span?.getAttributeNS(XML_NS, 'lang')]).toEqual(['qti-underline', 'fr']);
    });

    test('nested spans stay two spans', () => {
      const doc = roundtrip('<p><span class="a">x <span xml:lang="fr">y</span></span></p>');
      expect(doc.querySelectorAll('qti-item-body span')).toHaveLength(2);
      expect(doc.querySelector('qti-item-body span.a span')?.getAttributeNS(XML_NS, 'lang')).toBe('fr');
    });

    test('a span is written outside em, so a language span around emphasis comes back as written', () => {
      const doc = roundtrip('<p><span xml:lang="fr">a <em>b</em></span></p>');
      expect(doc.querySelectorAll('qti-item-body span')).toHaveLength(1);
      expect(doc.querySelector('qti-item-body span em')?.textContent).toBe('b');
    });

    test('a bare span is still unwrapped', () => {
      const doc = qti3ToPm(item('<p>a <span>b</span></p>'), { schema });
      expect(doc.firstChild?.firstChild?.text).toBe('a b');
      expect(doc.firstChild?.firstChild?.marks).toEqual([]);
    });
  });

  test('no attribute appears where there was none', () => {
    const doc = roundtrip(`<p>Vraag <strong>vet</strong></p><table><tbody><tr><td><p>C</p></td></tr></tbody></table>${CHOICE}`);
    expect(doc.querySelectorAll('qti-item-body [class], qti-item-body [id], qti-item-body [lang]')).toHaveLength(0);
    expect(Array.from(doc.querySelectorAll('qti-item-body *')).filter(e => e.hasAttributeNS(XML_NS, 'lang'))).toHaveLength(0);
  });
});

describe('the editor view and the HTML form', () => {
  test('the view carries xml:lang in the XML namespace, which the browser reads as the language', () => {
    const editor = createEditor({ extension: defineQtiExtension() });
    const host = document.createElement('div');
    document.body.appendChild(host);
    editor.mount(host);
    try {
      const doc = qti3ToPm(item('<p xml:lang="en">Hi <span xml:lang="fr">toi</span> <span lang="de">du</span></p>'), {
        schema: editor.schema,
      });
      editor.setContent(doc);
      const paragraph = host.querySelector('p')!;
      const [fr, de] = Array.from(host.querySelectorAll('span'));
      expect([paragraph.matches(':lang(en)'), fr.matches(':lang(fr)'), de.matches(':lang(de)')]).toEqual([true, true, true]);
    } finally {
      editor.unmount();
      host.remove();
    }
  });

  test('pmToHtml writes xml:lang, and htmlToPm reads it back from the HTML parser', () => {
    const html = pmToHtml(qti3ToPm(item('<p xml:lang="en">Hi <span xml:lang="fr">toi</span></p>')));
    expect(html).toBe('<p xml:lang="en">Hi <span xml:lang="fr">toi</span></p>');
    expect(pmToHtml(htmlToPm(html))).toBe(html);
  });
});

test('both schemas give the same node types and every mark all four attributes', () => {
  const PROSEKIT_NAMES: Record<string, string> = { table_row: 'tableRow', table_cell: 'tableCell', table_header: 'tableHeaderCell' };
  const names = Object.keys(GLOBAL_ATTRS);
  const carriers = (schema: Schema, nameOf: (name: string) => string) =>
    GLOBAL_ATTR_NODES.filter(name => {
      const type = schema.nodes[nameOf(name)];
      return type && names.every(attr => attr in (type.spec.attrs ?? {}));
    });

  const [[, plain], [, prosekit]] = SCHEMAS;
  // The ProseKit base has no blockquote, horizontal rule, code block or hard break; every other
  // listed node is in both schemas, with the attributes.
  expect(carriers(plain, name => name)).toEqual([...GLOBAL_ATTR_NODES]);
  expect(carriers(prosekit, name => PROSEKIT_NAMES[name] ?? name)).toEqual(
    GLOBAL_ATTR_NODES.filter(name => !['blockquote', 'horizontal_rule', 'code_block', 'hard_break'].includes(name)),
  );
  for (const [label, schema] of SCHEMAS) {
    for (const mark of Object.values(schema.marks)) {
      expect(Object.keys(mark.spec.attrs ?? {}), `${label}: ${mark.name}`).toEqual(expect.arrayContaining(names));
    }
  }
});
