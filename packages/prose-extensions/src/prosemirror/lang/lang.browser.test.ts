/**
 * `lang` on spans and text blocks, in both schema shapes: a plain-ProseMirror schema built with
 * `withLangAttr` / `langMarkSpec`, and the ProseKit `defineBasicExtension`.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser, DOMSerializer, Schema } from 'prosemirror-model';
import { nodes } from 'prosemirror-schema-basic';
import { describe, expect, test } from 'vitest';

import { defineBasicExtension } from '../../prosekit/basic.js';
import { langMarkSpec, withLangAttr } from './lang.js';

const plain = new Schema({
  nodes: {
    doc: nodes.doc,
    text: nodes.text,
    paragraph: withLangAttr(nodes.paragraph),
    heading: withLangAttr(nodes.heading),
  },
  marks: { lang: langMarkSpec },
});

const prosekit = createEditor({ extension: defineBasicExtension() }).schema;

const roundtrip = (schema: Schema, html: string) => {
  const host = document.createElement('div');
  host.innerHTML = html;
  const doc = PmDOMParser.fromSchema(schema).parse(host);
  const out = document.createElement('div');
  out.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document }));
  return out.innerHTML;
};

describe.each([
  ['withLangAttr + langMarkSpec', plain],
  ['defineBasicExtension', prosekit],
])('lang (%s)', (_name, schema) => {
  test.each([
    '<p lang="en">English</p>',
    '<h3 lang="de">Deutsch</h3>',
    '<p>Een <span lang="fr">mot</span> erin</p>',
    '<p>Geen taal</p>',
  ])('%s round-trips', html => {
    expect(roundtrip(schema, html)).toBe(html);
  });

  test('reads xml:lang where the DOM still has it', () => {
    expect(roundtrip(schema, '<p xml:lang="en">English</p>')).toBe('<p lang="en">English</p>');
    expect(roundtrip(schema, '<p>Een <span xml:lang="fr">mot</span></p>')).toBe(
      '<p>Een <span lang="fr">mot</span></p>',
    );
  });

  test('a heading keeps its level beside its lang', () => {
    expect(roundtrip(schema, '<h2 lang="en">x</h2>')).toBe('<h2 lang="en">x</h2>');
  });

  test('a span without a language is not a lang mark', () => {
    expect(roundtrip(schema, '<p>a <span>b</span></p>')).toBe('<p>a b</p>');
  });
});
