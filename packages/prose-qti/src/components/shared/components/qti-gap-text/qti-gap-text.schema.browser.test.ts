/**
 * `match-max` is a required attribute of qti-gap-text in the QTI 3.0 XSD, so the node writes it
 * whatever its value. It used to be written only above 1: at 1 every exported gap-match item was
 * schema-invalid, and `0` (unlimited) was dropped and came back as 1 (single-use).
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
  test.each([0, 1, 2])('is written at %i', matchMax => {
    expect(serialize(matchMax).getAttribute('match-max')).toBe(String(matchMax));
  });

  test.each([0, 1])('survives parse → serialize at %i', matchMax => {
    const host = document.createElement('div');
    host.innerHTML = `<qti-gap-text identifier="W1" match-max="${matchMax}">Waal</qti-gap-text>`;
    const parsed = PmDOMParser.fromSchema(schema).parseSlice(host).content.firstChild;
    expect(parsed?.type).toBe(schema.nodes.qtiGapText);
    expect(parsed?.attrs.matchMax).toBe(matchMax);
    expect(serialize(parsed!.attrs.matchMax as number).getAttribute('match-max')).toBe(String(matchMax));
  });
});
