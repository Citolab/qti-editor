/**
 * A table's `<caption>` through the whole item round trip, QTI 3 in and QTI 3 out, on the
 * roundtrip schema (`createQtiSchema`).
 *
 * Before: the caption was dropped on import, and its text came back as a stray first row — so the
 * export carried a table with an extra row and no caption.
 */
import { TableMap } from 'prosemirror-tables';
import { describe, expect, test } from 'vitest';

import { pmToQti3, qti3ToPm } from '../item-roundtrip/convert.js';

import type { Node as ProseMirrorNode } from 'prosemirror-model';

const ITEM = `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0"
  identifier="ITEM" title="Caption">
  <qti-item-body>
    <table>
      <caption>Boiling points</caption>
      <tbody>
        <tr><td><p>Water</p></td><td><p>100</p></td></tr>
        <tr><td><p>Ethanol</p></td><td><p>78</p></td></tr>
      </tbody>
    </table>
  </qti-item-body>
</qti-assessment-item>`;

const tableOf = (doc: ProseMirrorNode): ProseMirrorNode => {
  let table: ProseMirrorNode | undefined;
  doc.descendants(node => {
    if (!table && node.type.name === 'table') table = node;
    return !table;
  });
  if (!table) throw new Error('no table in the document');
  return table;
};

const exportedTable = (doc: ProseMirrorNode): Element => {
  const exported = new DOMParser().parseFromString(pmToQti3(doc), 'application/xml');
  const table = exported.getElementsByTagName('table')[0];
  if (!table) throw new Error('no table in the export');
  return table;
};

describe('a table caption through qti3ToPm → pmToQti3', () => {
  test('is imported as the table caption, not as a row', () => {
    const doc = qti3ToPm(ITEM);
    expect(() => doc.check()).not.toThrow();

    const table = tableOf(doc);
    expect(table.attrs.caption).toBe('Boiling points');
    expect(table.childCount).toBe(2);
    expect(table.textContent).not.toContain('Boiling points');
    const map = TableMap.get(table);
    expect([map.width, map.height]).toEqual([2, 2]);
  });

  test('is exported as the first child of the table', () => {
    const table = exportedTable(qti3ToPm(ITEM));
    expect(table.firstElementChild?.localName).toBe('caption');
    expect(table.firstElementChild?.textContent).toBe('Boiling points');
    expect(table.getElementsByTagName('tr')).toHaveLength(2);
  });

  test('survives a second round trip unchanged', () => {
    const once = pmToQti3(qti3ToPm(ITEM));
    expect(pmToQti3(qti3ToPm(once))).toBe(once);
  });
});
