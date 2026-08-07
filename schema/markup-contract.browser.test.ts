import { describe, expect, test } from 'vitest';

import { buildEditorSchema } from './editor-schema';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';


/**
 * The schema stated as document shapes: what the editor accepts, and what it refuses.
 *
 * This is now the whole of schema/'s test coverage, and it is the half worth keeping. A committed
 * fixture of the grammar used to sit beside it, asking "did this change since last time" —
 * mechanical, exhaustive, and useless as documentation: `qtiPrompt? qtiGapText+ paragraph+` is
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

  test('an image sits inline, inside a paragraph', () => {
    // notes.ts, image. This was the other way round while the editor used ProseKit's block image:
    // a bare <img> in running text was lifted out of the paragraph, and the XSD does not allow an
    // img as a child of qti-item-body at all, so a block image could only ever serialise to
    // something the schema rejects.
    expect(schema.nodes.image.isInline, 'image is an inline node').toBe(true);
    accepts('paragraph containing an image between text', () =>
      schema.nodes.paragraph.createChecked(null, [
        text('before '),
        schema.nodes.image.create({ src: 'x.png', alt: 'An illustration' }),
        text(' after'),
      ])
    );
  });

  test('an image carries the alternative text the standard requires', () => {
    // Previously an `XSD:` narrowing in notes.ts — ProseKit's spec had no `alt` at all, so it was
    // destroyed on every import/export cycle. Silently, and on assessment content.
    const img = schema.nodes.image.createChecked({ src: 'atom.png', alt: 'Atoom' });
    expect(img.attrs.alt, 'alt survives on the node').toBe('Atoom');
    // Percentages have to survive too — the sample items use width="100%".
    expect(schema.nodes.image.createChecked({ src: 'x.png', width: '100%' }).attrs.width).toBe('100%');
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

  test('a gap-match may hold a single gap text, as the XSD allows', () => {
    // This was a rejection case: the editor required two, because one source makes a degenerate
    // interaction. That is a judgement about a FINISHED item, and it made the half-finished ones
    // unrepresentable — authoring a gap match out of prose leaves exactly one source the moment the
    // first gap is made. The narrowing was dropped; `qti-gap-text` is `+` here as in the XSD.
    accepts('gap-match with a single gap text', () =>
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
