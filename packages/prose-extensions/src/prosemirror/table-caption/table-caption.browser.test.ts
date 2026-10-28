/**
 * A table's `<caption>` survives parse → serialise in `defineBasicExtension()`, which patches
 * ProseKit's table with `tableCaptionSpec`.
 *
 * Before: the caption was dropped, and its text came back as a stray first row of the table.
 *
 * The plain-ProseMirror use (`tableNodes(...).table` with the spec spread over it) is covered by
 * `@citolab/prose-qti`'s `schema/table-caption.browser.test.ts`, through `createQtiSchema()` and the
 * whole item round trip; prosemirror-tables is not a dependency of this package.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { defineBasicExtension } from '../../prosekit/basic.js';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineBasicExtension() }).schema;

const CAPTIONED = `
  <table>
    <caption>
      Boiling points
    </caption>
    <tbody>
      <tr><td><p>Water</p></td><td><p>100</p></td></tr>
      <tr><td><p>Ethanol</p></td><td><p>78</p></td></tr>
    </tbody>
  </table>`;

const parse = (html: string): ProseMirrorNode => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return PmDOMParser.fromSchema(schema).parse(host);
};

const serialize = (doc: ProseMirrorNode): HTMLElement => {
  const host = document.createElement('div');
  host.appendChild(DOMSerializer.fromSchema(schema).serializeFragment(doc.content, { document }));
  return host;
};

const firstTable = (doc: ProseMirrorNode): ProseMirrorNode => {
  let table: ProseMirrorNode | undefined;
  doc.descendants(node => {
    if (!table && node.type.spec.tableRole === 'table') table = node;
    return !table;
  });
  if (!table) throw new Error('no table in the document');
  return table;
};

describe('a table caption, in defineBasicExtension()', () => {
  test('is read into the table, as plain text with its whitespace collapsed', () => {
    expect(firstTable(parse(CAPTIONED)).attrs.caption).toBe('Boiling points');
  });

  test('does not turn into a stray row', () => {
    const doc = parse(CAPTIONED);
    expect(() => doc.check()).not.toThrow();

    const table = firstTable(doc);
    expect(table.childCount).toBe(2);
    expect(table.textContent).not.toContain('Boiling points');
    table.forEach(row => expect(row.type.spec.tableRole).toBe('row'));
  });

  test('is written back as the first child of the table', () => {
    const table = serialize(parse(CAPTIONED)).querySelector('table')!;
    expect(table.firstElementChild?.localName).toBe('caption');
    expect(table.firstElementChild?.textContent).toBe('Boiling points');
    expect(table.querySelectorAll('tr')).toHaveLength(2);
  });

  test('is not invented for a table that has none', () => {
    const doc = parse('<table><tbody><tr><td><p>x</p></td></tr></tbody></table>');
    expect(firstTable(doc).attrs.caption).toBeNull();
    expect(serialize(doc).querySelector('caption')).toBeNull();
  });
});
