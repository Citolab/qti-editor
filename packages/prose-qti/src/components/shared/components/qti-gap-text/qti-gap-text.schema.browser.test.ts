/**
 * `match-max` is a required attribute of qti-gap-text in the QTI 3.0 XSD, so the node writes it
 * whatever its value — at the default of 1 too. Dropping it there made every exported gap-match
 * item schema-invalid, and made a round trip lose the attribute on any item that had it.
 */
import { createEditor } from 'prosekit/core';
import { DOMParser as PmDOMParser, DOMSerializer } from 'prosemirror-model';
import { describe, expect, test } from 'vitest';

import { defineQtiExtension } from '../../../../integration/interactions/prosekit.js';

import type { Schema } from 'prosemirror-model';

const schema: Schema = createEditor({ extension: defineQtiExtension() }).schema;

const serialize = (matchMax: number) => {
  const node = schema.nodes.qtiGapText.createChecked({ identifier: 'W1', matchMax }, schema.text('Waal'));
  return DOMSerializer.fromSchema(schema).serializeNode(node, { document }) as HTMLElement;
};

describe('qti-gap-text match-max', () => {
  test.each([1, 2])('is written at %i', matchMax => {
    expect(serialize(matchMax).getAttribute('match-max')).toBe(String(matchMax));
  });

  test('survives parse → serialize, also at the default', () => {
    const host = document.createElement('div');
    host.innerHTML = '<qti-gap-text identifier="W1" match-max="1">Waal</qti-gap-text>';
    const parsed = PmDOMParser.fromSchema(schema).parseSlice(host).content.firstChild;
    expect(parsed?.type).toBe(schema.nodes.qtiGapText);
    expect(parsed?.attrs.matchMax).toBe(1);
    expect(serialize(parsed!.attrs.matchMax as number).getAttribute('match-max')).toBe('1');
  });
});
