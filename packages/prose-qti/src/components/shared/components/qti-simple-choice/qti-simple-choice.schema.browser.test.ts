import { describe, expect, it } from 'vitest';
import { DOMParser as PMDOMParser, DOMSerializer, Schema } from 'prosemirror-model';

import { qtiSimpleChoiceNodeSpec } from './qti-simple-choice.schema';
import { qtiSimpleChoiceParagraphNodeSpec } from './qti-simple-choice-paragraph.schema';

import type { NodeSpec } from 'prosemirror-model';

// Minimal schema embedding the choice inside an interaction wrapper so the
// `context: 'qtiChoiceInteraction/'` parse rules apply.
const nodes = {
  doc: { content: 'qtiChoiceInteraction' },
  text: { group: 'inline' },
  qtiChoiceInteraction: {
    content: 'qtiSimpleChoice+',
    parseDOM: [{ tag: 'qti-choice-interaction' }],
    toDOM: () => ['qti-choice-interaction', 0] as const
  },
  qtiSimpleChoice: qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraph: qtiSimpleChoiceParagraphNodeSpec
} satisfies Record<string, NodeSpec>;

const schema = new Schema({ nodes });

const parseFromHtml = (html: string) => {
  const container = document.createElement('div');
  container.innerHTML = html;
  return PMDOMParser.fromSchema(schema).parse(container);
};

const serializeChoice = (html: string): HTMLElement => {
  const doc = parseFromHtml(html);
  const choice = doc.firstChild!.firstChild!;
  const dom = DOMSerializer.fromSchema(schema).serializeNode(choice);
  return dom as HTMLElement;
};

describe('qtiSimpleChoiceNodeSpec — fixed attribute', () => {
  it('defaults `fixed` to false when the attribute is absent', () => {
    const doc = parseFromHtml('<qti-choice-interaction><qti-simple-choice identifier="A"><p>a</p></qti-simple-choice></qti-choice-interaction>');
    const choice = doc.firstChild!.firstChild!;

    expect(choice.attrs.fixed).toBe(false);
  });

  it('parses `fixed="true"` as a boolean true', () => {
    const doc = parseFromHtml('<qti-choice-interaction><qti-simple-choice identifier="A" fixed="true"><p>a</p></qti-simple-choice></qti-choice-interaction>');
    const choice = doc.firstChild!.firstChild!;

    expect(choice.attrs.fixed).toBe(true);
  });

  it('omits `fixed` from the serialized DOM when false', () => {
    const dom = serializeChoice('<qti-choice-interaction><qti-simple-choice identifier="A"><p>a</p></qti-simple-choice></qti-choice-interaction>');

    expect(dom.hasAttribute('fixed')).toBe(false);
    expect(dom.getAttribute('identifier')).toBe('A');
  });

  it('serializes `fixed="true"` when set', () => {
    const dom = serializeChoice('<qti-choice-interaction><qti-simple-choice identifier="A" fixed="true"><p>a</p></qti-simple-choice></qti-choice-interaction>');

    expect(dom.getAttribute('fixed')).toBe('true');
  });
});
