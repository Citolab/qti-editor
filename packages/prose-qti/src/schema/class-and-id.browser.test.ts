/**
 * `class` and `id` on item-body content survive a full item load → save with the ProseKit schema
 * (`defineQtiExtension()`: `@citolab/prose-extensions`' basic extension plus every interaction).
 *
 * Before, every one of these came back without its attribute — including `qti-align-center`, a class
 * from QTI's own shared CSS. The interactions already modelled `class`; this covers the content
 * around and inside them.
 */
import { createEditor } from 'prosekit/core';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../integration/interactions/prosekit.js';
import { pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';
import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

const prosekitSchema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const CHOICE =
  '<qti-choice-interaction response-identifier="RESPONSE" max-choices="1">' +
  '<qti-simple-choice identifier="A">Maas</qti-simple-choice>' +
  '<qti-simple-choice identifier="B">Waal</qti-simple-choice>' +
  '</qti-choice-interaction>';

const item = (body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="ITEM" title="Item" adaptive="false" time-dependent="false">
  <qti-response-declaration identifier="RESPONSE" cardinality="single" base-type="identifier">
    <qti-correct-response><qti-value>B</qti-value></qti-correct-response>
  </qti-response-declaration>
  <qti-outcome-declaration identifier="SCORE" cardinality="single" base-type="float"/>
  <qti-item-body>${body}</qti-item-body>
  <qti-response-processing template="https://purl.imsglobal.org/spec/qti/v3p0/rptemplates/match_correct"/>
</qti-assessment-item>`;

function roundtrip(body: string, schema: Schema = prosekitSchema): Document {
  const xml = pmToQti3(qti3ToPm(item(body), { schema }), { schema });
  return new DOMParser().parseFromString(xml, 'application/xml');
}

const attributesOf = (doc: Document, selector: string, attribute: string) =>
  Array.from(doc.querySelectorAll(selector)).map(element => element.getAttribute(attribute));

describe('class survives load → save', () => {
  test.each([
    ['a paragraph', '<p class="qti-align-center">Centred</p>', 'qti-item-body > p', ['qti-align-center']],
    ['a heading', '<h2 class="kop">Kop</h2>', 'h2', ['kop']],
    ['list items', '<ul class="lijst"><li class="item"><p>a</p></li><li><p>b</p></li></ul>', 'ul, li', ['lijst', 'item', null]],
    ['an image', '<p><img src="media/a.png" alt="a" class="qti-valign-middle"/></p>', 'img', ['qti-valign-middle']],
    [
      'a table, its rows and its cells',
      '<table class="tabel"><tbody><tr class="rij"><th class="kop"><p>K</p></th></tr><tr><td class="cel"><p>C</p></td></tr></tbody></table>',
      'table, tr, th, td',
      ['tabel', 'rij', 'kop', null, 'cel'],
    ],
    ['strong and em', '<p><strong class="sterk">vet</strong> en <em class="nadruk">schuin</em></p>', 'strong, em', ['sterk', 'nadruk']],
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

describe('id survives load → save', () => {
  test('on body content, a prompt and a match set', () => {
    const choice = CHOICE.replace('max-choices="1">', 'max-choices="1"><qti-prompt id="prompt"><p id="pp">Kies</p></qti-prompt>');
    const doc = roundtrip(`<p id="p1">a <strong id="s1">b</strong></p><table id="t1"><tbody><tr id="r1"><td id="c1"><p>C</p></td></tr></tbody></table>${choice}`);
    expect(Array.from(doc.querySelectorAll('qti-item-body [id]')).map(e => `${e.localName}#${e.getAttribute('id')}`)).toEqual([
      'p#p1',
      'strong#s1',
      'table#t1',
      'tr#r1',
      'td#c1',
      'qti-prompt#prompt',
      'p#pp',
    ]);
  });
});

describe('content without them is unchanged', () => {
  test('no class or id attribute appears where there was none', () => {
    const doc = roundtrip(`<p>Vraag <strong>vet</strong></p><table><tbody><tr><td><p>C</p></td></tr></tbody></table>${CHOICE}`);
    expect(doc.querySelectorAll('qti-item-body [class], qti-item-body [id]')).toHaveLength(0);
  });
});

describe('the plain-ProseMirror schema', () => {
  // The prompt and choice nodes are shared by both schemas, so createQtiSchema() keeps theirs too.
  // Its body nodes (`paragraph`, `image` …) come from prosemirror-schema-basic and are unchanged.
  test('keeps class and id on qti-prompt and on a choice paragraph', () => {
    const choice = CHOICE.replace('max-choices="1">', 'max-choices="1"><qti-prompt class="vraag" id="q"><p class="pp">Kies</p></qti-prompt>').replace(
      '<qti-simple-choice identifier="A">Maas',
      '<qti-simple-choice identifier="A"><p class="optie">Maas</p>',
    );
    const doc = roundtrip(`<p>Vraag</p>${choice}`, createQtiSchema());
    expect(attributesOf(doc, 'qti-prompt, qti-prompt > p, qti-simple-choice > p', 'class')).toEqual(['vraag', 'pp', 'optie', null]);
    expect(doc.querySelector('qti-prompt')?.getAttribute('id')).toBe('q');
  });
});
