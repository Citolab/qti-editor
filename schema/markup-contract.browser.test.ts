import { describe, expect, test } from 'vitest';

import { buildEditorSchema } from './editor-schema';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';


/**
 * The schema stated as document shapes: what the editor accepts, and what it refuses.
 *
 * This is now the whole of schema/'s test coverage, and it is the half worth keeping. A committed
 * fixture of the grammar used to sit beside it, asking "did this change since last time" —
 * mechanical, exhaustive, and useless as documentation: `qtiPrompt? qtiGapText{2,} paragraph+` is
 * precise and tells you nothing about what an author may write. This file asks "is THIS shape
 * legal", one example at a time, which is the form a human can check by eye.
 *
 * It is also where the editor's NARROWINGS become visible. Every `XSD:` note in notes.ts
 * claims the standard permits something the editor does not; each claim is a rejection case below,
 * so a note and the behaviour it describes cannot drift apart silently.
 *
 * ## What is being validated, and what is not
 *
 * The ROUNDTRIP FORMAT — the editor's own document model — and not QTI. The `XSD:` references
 * explain WHY a rule is narrower than the standard; they are not a claim that passing here means a
 * document is valid QTI. It does not, and that is deliberate.
 *
 * This matters because of where the schema is going: an LLM is meant to generate the roundtrip
 * format — one interaction for a fragment, or several plus prose — and be checked against THIS
 * contract. Conversion to QTI, carrying `score` and `correct-response`, is a later and separate
 * step. So a case below should read as "is this a legal editor document", never as "is this legal
 * QTI"; conflating the two would make the file assert something it cannot support.
 *
 * ## Why construction and not HTML parsing
 *
 * The obvious version of this file parses HTML strings with `DOMParser.fromSchema(schema)` and
 * asserts what comes out. It was written that way first and thrown away, because that parser is not
 * the editor's import path and its answers are artefacts: a bare `<p>hello</p>` parses to
 * `qtiSimpleAssociableChoice`, and a `<p>` inside `<qti-rubric-block>` comes back as a `table`.
 * Wrapping the fragment in `<qti-item-body>` changes nothing. Some node's parse rule matches a bare
 * paragraph at a priority that wins when there is no surrounding document to constrain it.
 *
 * The editor really imports through `roundtripXmlToPm` — which is exercised end to end by the 17
 * ITEM regression tests in apps/e2e/stories, on real QTI files. So the markup path is covered; what
 * was missing, and is here, is the NEGATIVE space: the shapes that must be refused. Those are
 * structural rules, and `createChecked` states them exactly, with no parser in the way.
 */

const schema: Schema = buildEditorSchema();

const text = (value: string) => schema.text(value);

/** A prompt holding one paragraph, which is the only shape a prompt has. */
const prompt = (value = 'Question text') =>
  schema.nodes.qtiPrompt.create(null, schema.nodes.qtiPromptParagraph.create(null, text(value)));

const simpleChoice = (identifier: string, label: string) =>
  schema.nodes.qtiSimpleChoice.createChecked(
    { identifier },
    schema.nodes.qtiSimpleChoiceParagraph.create(null, text(label))
  );

const gapText = (identifier: string, label: string) =>
  schema.nodes.qtiGapText.createChecked({ identifier }, text(label));

const paragraph = (value = 'Some prose.') => schema.nodes.paragraph.create(null, text(value));

/** Assert a shape is legal, and say which shape when it is not. */
const accepts = (what: string, build: () => ProseMirrorNode) => expect(build, what).not.toThrow();
/** Assert a shape is refused. */
const refuses = (what: string, build: () => ProseMirrorNode) => expect(build, what).toThrow();

describe('shapes the editor accepts', () => {
  test('a choice interaction: prompt then one or more choices', () => {
    accepts('choice interaction with two choices', () =>
      schema.nodes.qtiChoiceInteraction.createChecked({ responseIdentifier: 'RESPONSE' }, [
        prompt('Which element has the highest atomic mass?'),
        simpleChoice('a', 'Tin'),
        simpleChoice('b', 'Iodine')
      ])
    );
  });

  test('the prompt is optional, as the XSD has it', () => {
    // Every interaction's content expression leads with `qtiPrompt?`. It was `qtiPrompt` for a
    // while, on the reasoning that an interaction should always have a stable first child to land
    // the cursor in. That was reverted: requiring one meant importing real QTI — where the prompt
    // genuinely is optional — had to synthesise an empty prompt to get a document that would
    // validate, which put a node in the author's item that the author never wrote.
    accepts('choice interaction with no prompt', () =>
      schema.nodes.qtiChoiceInteraction.createChecked({ responseIdentifier: 'RESPONSE' }, [
        simpleChoice('a', 'Tin'),
        simpleChoice('b', 'Iodine')
      ])
    );
  });

  test('an order interaction, same shape as choice', () => {
    accepts('order interaction', () =>
      schema.nodes.qtiOrderInteraction.createChecked({ responseIdentifier: 'RESPONSE' }, [
        prompt('Sort these'),
        simpleChoice('a', 'First'),
        simpleChoice('b', 'Second')
      ])
    );
  });

  test('a gap-match interaction: prompt, two gap texts, then the prose', () => {
    accepts('gap-match with two gap texts', () =>
      schema.nodes.qtiGapMatchInteraction.createChecked({ responseIdentifier: 'RESPONSE' }, [
        prompt('Fill the gaps'),
        gapText('g1', 'alpha'),
        gapText('g2', 'beta'),
        paragraph('The first is a gap.')
      ])
    );
  });

  test('a rubric block of prose', () => {
    accepts('rubric block holding a paragraph', () =>
      schema.nodes.qtiRubricBlock.createChecked({ view: 'scorer', use: 'scoring' }, [paragraph('Award one mark.')])
    );
  });

  test('a text-entry interaction sits inline, inside a paragraph', () => {
    const entry = schema.nodes.qtiTextEntryInteraction.createChecked({ responseIdentifier: 'RESPONSE' });
    expect(entry.isInline, 'text entry is an inline node').toBe(true);
    accepts('paragraph containing a text entry between text', () =>
      schema.nodes.paragraph.createChecked(null, [text('The capital is '), entry, text('.')])
    );
  });

  test('a bare image is a block, not inline', () => {
    // notes.ts, image: "Block, not inline. Worth stating plainly: a bare <img> in running
    // text does not survive as inline content — it is lifted out of the paragraph."
    expect(schema.nodes.image.isInline, 'image is a block node').toBe(false);
    refuses('an image inside a paragraph', () =>
      schema.nodes.paragraph.createChecked(null, [text('before '), schema.nodes.image.create({ src: 'x.png' })])
    );
  });
});

describe('narrowings the editor enforces', () => {
  /*
   * Each case corresponds to an `XSD:` note in notes.ts. Relaxing a narrowing means changing both
   * the note and the case below.
   */

  test('an interaction needs at least one choice', () => {
    refuses('choice interaction with a prompt and nothing else', () =>
      schema.nodes.qtiChoiceInteraction.createChecked({ responseIdentifier: 'R' }, [prompt()])
    );
  });

  test('a gap-match needs two gap texts, though the XSD allows one', () => {
    // "XSD: `qti-gap-text` is `+`. The editor requires two — a single-source gap match is a
    // degenerate interaction with only one possible answer."
    refuses('gap-match with a single gap text', () =>
      schema.nodes.qtiGapMatchInteraction.createChecked({ responseIdentifier: 'R' }, [
        prompt(),
        gapText('g1', 'alpha'),
        paragraph()
      ])
    );
  });

  test('a prompt holds one paragraph of plain text and nothing else', () => {
    // "XSD: a prompt is static content — inline and block, no interactions. The editor is stricter
    // still: exactly one paragraph of text."
    refuses('a prompt holding an ordinary paragraph rather than a prompt paragraph', () =>
      schema.nodes.qtiPrompt.createChecked(null, [paragraph()])
    );
    refuses('a prompt holding two paragraphs', () =>
      schema.nodes.qtiPrompt.createChecked(null, [
        schema.nodes.qtiPromptParagraph.create(null, text('one')),
        schema.nodes.qtiPromptParagraph.create(null, text('two'))
      ])
    );
  });

  test('a choice body is one paragraph of plain text, not the HTML flow model', () => {
    // "XSD: these choice bodies admit the whole HTML flow model. The editor pins each to exactly one
    // paragraph of plain text."
    refuses('a choice holding an ordinary paragraph', () =>
      schema.nodes.qtiSimpleChoice.createChecked({ identifier: 'a' }, [paragraph()])
    );
    refuses('a choice holding two paragraphs', () =>
      schema.nodes.qtiSimpleChoice.createChecked({ identifier: 'a' }, [
        schema.nodes.qtiSimpleChoiceParagraph.create(null, text('one')),
        schema.nodes.qtiSimpleChoiceParagraph.create(null, text('two'))
      ])
    );
  });

  test('a rubric block holds prose, never an interaction', () => {
    // qtiRubricBlock is `richtext+`, which deliberately excludes interactions: "a rubric is prose
    // about the item, never part of it."
    const interaction = schema.nodes.qtiChoiceInteraction.createChecked({ responseIdentifier: 'R' }, [
      prompt(),
      simpleChoice('a', 'Tin')
    ]);
    refuses('rubric block containing an interaction', () =>
      schema.nodes.qtiRubricBlock.createChecked({ view: 'scorer', use: 'scoring' }, [interaction])
    );
  });
});
