/**
 * Pasting multi-block content into an interaction slot that holds exactly one block.
 *
 * ## The failure these tests exist to prevent
 *
 * `qtiSimpleChoice`, `qtiPrompt` and `qtiSimpleAssociableChoice` each hold exactly ONE child, and
 * that child bottoms out in `text*` / `inline*`. Pasted HTML used not to parse into those types at
 * all: their `parseDOM` rules were guarded with `context: 'qtiChoiceInteraction/'` and friends,
 * requiring the paste context to resolve with that node as the IMMEDIATE parent — which a text
 * cursor never does, since it sits one level deeper, inside the paragraph. So a `<p>` from Word,
 * and even a `<qti-simple-choice>` copied out of this very editor, both arrived as a plain
 * `paragraph`. Those guards are now `//` (ancestor at any depth); see the long note in
 * `qti-simple-choice.schema.ts`.
 *
 * A plain `paragraph` is legal in neither the choice nor the interaction, so ProseMirror's fitter
 * closes out of both and reopens the interaction for the remainder. `isolating: true` on
 * `qtiChoiceInteraction` does not stop this — in prosemirror-transform it is consulted for nodes
 * INSIDE the slice (`Fitter.findFittable`) and for range expansion (`coveredDepths`), never for the
 * frontier the fitter closes and reopens. The observed result:
 *
 *     qtiChoiceInteraction [RESPONSE_ORIG]
 *       qtiPrompt
 *         qtiPromptParagraph "Vraag?"
 *       qtiSimpleChoice [SC1]
 *         qtiSimpleChoiceParagraph "alpha"
 *     paragraph "beta"                        <- ejected to item-body level
 *     qtiChoiceInteraction [RESPONSE_ORIG]    <- same response identifier, split in two
 *       qtiSimpleChoice [SC2]
 *         qtiSimpleChoiceParagraph "Nee"
 *
 * Both halves keep the original `responseIdentifier`, and the composer's duplicate guard renames
 * one at save time, so the corruption reaches the XML looking deliberate: two interactions, two
 * plausible `RESPONSE_<uuid>` values, one of them invented. Where the fitter has to open a fresh
 * `qtiSimpleChoice` it uses the schema default, which is why `identifier="A"` shows up in exported
 * items — nothing in the authoring commands ever mints that.
 *
 * ## What the rescue must do
 *
 * `transformPasted` runs after parsing and before the fitter, and receives the view, so it can see
 * both the slice and where it is about to land. The agreed rules:
 *
 *   - Where the target's PARENT repeats the target (`qtiSimpleChoice+`, `qtiSimpleAssociableChoice+`),
 *     fan the pasted blocks out into siblings, one per block.
 *   - Where it does not repeat (`qtiPrompt?`), join the blocks into the single slot.
 *   - Flatten anything that cannot survive `text*`: list items and table cells contribute their
 *     text, an `<img>` contributes its `alt`.
 *   - Carry an identifier across when the slice has one — which it now does, because the widened
 *     parse guards keep `<qti-simple-choice identifier="…">` intact. Mint a fresh one when the
 *     slice has none, and ALSO when carrying it across would duplicate an identifier already in
 *     the target interaction.
 *
 *     "Has one" excludes the schema DEFAULT. Even a paste of plain `<p>`s arrives wrapped in
 *     choices, because `qtiSimpleChoiceParagraph` cannot stand alone and the parser's
 *     `findWrapping` builds a container around each one — stamped `identifier: 'A'`. Carrying that
 *     back out is precisely the bug being fixed; see `authoredIdentifier` in paste-rescue.ts.
 *
 * The widening and the rescue are complementary and neither is sufficient. Widening alone fixes
 * multi-paragraph and copied-choice pastes directly into a CHOICE, but leaves lists, images and
 * prompts splitting the interaction, and leaves the fitter inventing `identifier: 'A'` for slots it
 * needs. The rescue alone fixes all of those but cannot preserve identifiers, because without the
 * widening they are destroyed by the parse before `transformPasted` ever sees the slice.
 *
 * ## Two assumptions in here that are mine, not agreed — see the handback
 *
 *   - A pasted LIST fans out one sibling per `<li>`, not one sibling for the whole list. An author
 *     pasting a bulleted list of answer options means the options, and `<li>` is the closest thing
 *     the clipboard has to "one option".
 *   - A pasted TABLE does not fan out. Its structure is two-dimensional and has no honest linear
 *     mapping onto answer options, so it collapses to one sibling with the cell text joined.
 *
 * Both are one-line changes here if you disagree; they are marked ASSUMPTION below.
 */
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { afterEach, describe, expect, test } from 'vitest';
import { createSemanticPastePlugin } from '@citolab/prose-extensions/prosemirror';

import { createQtiSchema } from './create-qti-schema.js';
import { qtiPasteRescuePlugin } from './paste-rescue.js';

import type { Node as PmNode } from 'prosemirror-model';

const schema = createQtiSchema();

const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function choice(identifier: string, text: string): PmNode {
  return schema.nodes.qtiSimpleChoice.create(
    { identifier },
    schema.nodes.qtiSimpleChoiceParagraph.create(null, text ? schema.text(text) : null),
  );
}

function prompt(text: string): PmNode {
  return schema.nodes.qtiPrompt.create(
    null,
    schema.nodes.qtiPromptParagraph.create(null, text ? schema.text(text) : null),
  );
}

/** `qtiPrompt? qtiSimpleChoice+` — the interaction from the reported item. */
function choiceItem(): PmNode {
  return schema.nodes.doc.create(null, [
    schema.nodes.qtiChoiceInteraction.create({ responseIdentifier: 'RESPONSE_ORIG', maxChoices: 1 }, [
      prompt('Vervoeren rode bloedcellen zuurstof?'),
      choice('SIMPLE_CHOICE_1', 'Ja'),
      choice('SIMPLE_CHOICE_2', 'Nee'),
    ]),
  ]);
}

function associableChoice(identifier: string, text: string): PmNode {
  return schema.nodes.qtiSimpleAssociableChoice.create(
    { identifier },
    schema.nodes.qtiSimpleAssociableChoiceParagraph.create(null, text ? schema.text(text) : null),
  );
}

/** `qtiPrompt? qtiSimpleMatchSet{2}`, each set `qtiSimpleAssociableChoice+`. */
function matchItem(): PmNode {
  const set = (...children: PmNode[]) => schema.nodes.qtiSimpleMatchSet.create(null, children);
  return schema.nodes.doc.create(null, [
    schema.nodes.qtiMatchInteraction.create({ responseIdentifier: 'RESPONSE_MATCH' }, [
      set(associableChoice('SOURCE_1', 'Hart')),
      set(associableChoice('TARGET_1', 'Pomp')),
    ]),
  ]);
}

/** `paragraph+` — an interaction that legitimately holds many blocks. The rescue must leave it be. */
function hottextItem(): PmNode {
  const p = (t: string) => schema.nodes.paragraph.create(null, schema.text(t));
  return schema.nodes.doc.create(null, [
    schema.nodes.qtiHottextInteraction.create({ responseIdentifier: 'RESPONSE_HOTTEXT' }, [p('Eerste regel.')]),
  ]);
}

function plainItem(): PmNode {
  const p = (t: string) => schema.nodes.paragraph.create(null, schema.text(t));
  return schema.nodes.doc.create(null, [p('Losse alinea.')]);
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let teardown: Array<() => void> = [];

afterEach(() => {
  teardown.forEach((fn) => fn());
  teardown = [];
});

function mount(doc: PmNode) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const view = new EditorView(host, {
    state: EditorState.create({
      doc,
      schema,
      // The real pipeline: semantic paste normalises the Word markup, then the rescue runs on the
      // parsed slice. A rescue that only works without the semantic pass is not a fix.
      plugins: [createSemanticPastePlugin(), qtiPasteRescuePlugin],
    }),
  });
  teardown.push(() => {
    view.destroy();
    host.remove();
  });
  return view;
}

/** Put the cursor at the end of the first textblock whose text matches. */
function cursorAtEndOf(view: EditorView, text: string) {
  let pos = -1;
  view.state.doc.descendants((node, at) => {
    if (pos === -1 && node.isTextblock && node.textContent === text) pos = at + node.nodeSize - 1;
  });
  if (pos === -1) throw new Error(`No textblock with text ${JSON.stringify(text)}`);
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, pos)));
}

function paste(view: EditorView, html: string) {
  const data = new DataTransfer();
  data.setData('text/html', html);
  view.dom.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
}

/**
 * The document as an indented outline, with minted identifiers normalised to `<minted>`.
 *
 * Comparing whole outlines rather than picking at individual nodes is deliberate: the bug is
 * STRUCTURAL, and an assertion that only checks the choices would have passed happily while the
 * interaction split in two around them.
 */
function outline(doc: PmNode): string {
  const render = (node: PmNode, depth: number): string => {
    let out = '';
    node.forEach((child) => {
      const id = child.attrs?.identifier ?? child.attrs?.responseIdentifier;
      const label = typeof id === 'string' ? ` [${id.replace(new RegExp(`^([A-Z_]+)_${UUID}$`), '$1_<minted>')}]` : '';
      const text = child.isTextblock ? ` ${JSON.stringify(child.textContent)}` : '';
      out += `${'  '.repeat(depth)}${child.type.name}${label}${text}\n`;
      if (!child.isTextblock) out += render(child, depth + 1);
    });
    return out;
  };
  return render(doc, 0);
}

function identifiersOf(doc: PmNode, typeName: string): string[] {
  const found: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === typeName) found.push(node.attrs.identifier);
  });
  return found;
}

function countOf(doc: PmNode, typeName: string): number {
  let n = 0;
  doc.descendants((node) => {
    if (node.type.name === typeName) n += 1;
  });
  return n;
}

// ---------------------------------------------------------------------------
// Fanning out: the parent repeats the target
// ---------------------------------------------------------------------------

describe('pasting into a choice, whose parent is `qtiSimpleChoice+`', () => {
  test('two Word paragraphs become two choices, and the interaction does not split', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p class="MsoNormal">alpha</p><p class="MsoNormal">beta</p>');

    expect(outline(view.state.doc)).toBe(
      'qtiChoiceInteraction [RESPONSE_ORIG]\n' +
        '  qtiPrompt\n' +
        '    qtiPromptParagraph "Vervoeren rode bloedcellen zuurstof?"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_1]\n' +
        '    qtiSimpleChoiceParagraph "Jaalpha"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_<minted>]\n' +
        '    qtiSimpleChoiceParagraph "beta"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_2]\n' +
        '    qtiSimpleChoiceParagraph "Nee"\n',
    );
  });

  test('exactly one interaction survives, still carrying its original response identifier', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p>alpha</p><p>beta</p>');

    expect(countOf(view.state.doc, 'qtiChoiceInteraction')).toBe(1);
    expect(view.state.doc.firstChild?.attrs.responseIdentifier).toBe('RESPONSE_ORIG');
  });

  test('no block is ejected to item-body level', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p>alpha</p><p>beta</p><p>gamma</p>');

    expect(view.state.doc.childCount).toBe(1);
    expect(view.state.doc.firstChild?.type.name).toBe('qtiChoiceInteraction');
  });

  test('three paragraphs fan out in order', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p>een</p><p>twee</p><p>drie</p>');

    const texts: string[] = [];
    view.state.doc.descendants((node) => {
      if (node.type.name === 'qtiSimpleChoiceParagraph') texts.push(node.textContent);
    });
    expect(texts).toEqual(['Jaeen', 'twee', 'drie', 'Nee']);
  });

  test('minted identifiers use the SIMPLE_CHOICE_ prefix and are unique', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p>alpha</p><p>beta</p><p>gamma</p>');

    const ids = identifiersOf(view.state.doc, 'qtiSimpleChoice');
    expect(new Set(ids).size).toBe(ids.length);
    // Never the schema default. `identifier="A"` in an exported item is the fitter's fingerprint.
    expect(ids).not.toContain('A');
    const minted = ids.filter((id) => !['SIMPLE_CHOICE_1', 'SIMPLE_CHOICE_2'].includes(id));
    expect(minted).toHaveLength(2);
    minted.forEach((id) => expect(id).toMatch(new RegExp(`^SIMPLE_CHOICE_${UUID}$`)));
  });

  test('a single paragraph still merges inline, without creating a sibling', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p>alpha</p>');

    // Already correct today (openStart/openEnd of 1 keeps it inline) — pinned so the rescue
    // does not "fix" the one case that was never broken.
    expect(countOf(view.state.doc, 'qtiSimpleChoice')).toBe(2);
    expect(outline(view.state.doc)).toContain('qtiSimpleChoiceParagraph "Jaalpha"');
  });

  test('choices copied out of this editor keep their identifiers', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(
      view,
      '<qti-simple-choice identifier="COPIED_X"><p>Ja</p></qti-simple-choice>' +
        '<qti-simple-choice identifier="COPIED_Y"><p>Nee</p></qti-simple-choice>',
    );

    // This is the whole reason the parse guards were widened to `//`. Under the old `/` guards the
    // rule never matched on paste, both choices fell through to the plain `paragraph` rule, and
    // the identifiers were gone before `transformPasted` could see them.
    //
    // COPIED_X is the exception, and not a bug: the first pasted block always merges into the
    // block the cursor is in, so its content joins SIMPLE_CHOICE_1 and that choice keeps its own
    // identifier. Only the blocks that become new siblings can carry one across.
    expect(outline(view.state.doc)).toBe(
      'qtiChoiceInteraction [RESPONSE_ORIG]\n' +
        '  qtiPrompt\n' +
        '    qtiPromptParagraph "Vervoeren rode bloedcellen zuurstof?"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_1]\n' +
        '    qtiSimpleChoiceParagraph "JaJa"\n' +
        '  qtiSimpleChoice [COPIED_Y]\n' +
        '    qtiSimpleChoiceParagraph "Nee"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_2]\n' +
        '    qtiSimpleChoiceParagraph "Nee"\n',
    );
  });

  test('an identifier is minted only when the slice does not carry one', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(
      view,
      '<qti-simple-choice identifier="KEPT_1"><p>x</p></qti-simple-choice>' +
        '<qti-simple-choice identifier="KEPT_2"><p>y</p></qti-simple-choice>' +
        '<p>plain</p>',
    );

    const ids = identifiersOf(view.state.doc, 'qtiSimpleChoice');
    expect(ids).toContain('KEPT_2');
    // The plain paragraph has no identifier to carry, so it gets one.
    const minted = ids.filter((id) => !['SIMPLE_CHOICE_1', 'SIMPLE_CHOICE_2', 'KEPT_2'].includes(id));
    expect(minted).toHaveLength(1);
    expect(minted[0]).toMatch(new RegExp(`^SIMPLE_CHOICE_${UUID}$`));
  });

  test('a pasted identifier that already exists in the interaction is replaced, not duplicated', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(
      view,
      '<qti-simple-choice identifier="FIRST"><p>x</p></qti-simple-choice>' +
        '<qti-simple-choice identifier="SIMPLE_CHOICE_2"><p>y</p></qti-simple-choice>',
    );

    // Pasting a copy of a choice back into its own interaction. Carrying SIMPLE_CHOICE_2 across
    // would give the interaction two choices with the same identifier, which the response
    // declaration cannot address — so the copy gets a fresh one and the original keeps its own.
    const ids = identifiersOf(view.state.doc, 'qtiSimpleChoice');
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.filter((id) => id === 'SIMPLE_CHOICE_2')).toHaveLength(1);
    const minted = ids.filter((id) => !['SIMPLE_CHOICE_1', 'SIMPLE_CHOICE_2'].includes(id));
    expect(minted).toHaveLength(1);
    expect(minted[0]).toMatch(new RegExp(`^SIMPLE_CHOICE_${UUID}$`));
    // The original, not the paste, is the one that keeps the identifier: order is unchanged.
    expect(identifiersOf(view.state.doc, 'qtiSimpleChoice').at(-1)).toBe('SIMPLE_CHOICE_2');
  });
});

describe('pasting into a match set, whose parent is `qtiSimpleAssociableChoice+`', () => {
  test('two paragraphs fan out into two associable choices', () => {
    const view = mount(matchItem());
    cursorAtEndOf(view, 'Hart');
    paste(view, '<p>Long</p><p>Nier</p>');

    expect(countOf(view.state.doc, 'qtiMatchInteraction')).toBe(1);
    expect(countOf(view.state.doc, 'qtiSimpleMatchSet')).toBe(2);
    // The source set gains one; the target set is untouched.
    expect(countOf(view.state.doc, 'qtiSimpleAssociableChoice')).toBe(3);
  });

  test('minted identifiers follow the set they land in, matching the insert commands', () => {
    const view = mount(matchItem());
    cursorAtEndOf(view, 'Hart');
    paste(view, '<p>Long</p><p>Nier</p>');

    // `qti-match-interaction.commands.ts` mints SOURCE_/TARGET_ by set index, not a single prefix
    // for the node type. A paste into the first set must not produce TARGET_ identifiers.
    const ids = identifiersOf(view.state.doc, 'qtiSimpleAssociableChoice');
    expect(ids).not.toContain('A');
    const minted = ids.filter((id) => !['SOURCE_1', 'TARGET_1'].includes(id));
    expect(minted).toHaveLength(1);
    minted.forEach((id) => expect(id).toMatch(new RegExp(`^SOURCE_${UUID}$`)));
  });
});

// ---------------------------------------------------------------------------
// Joining: the parent does not repeat the target
// ---------------------------------------------------------------------------

describe('pasting into a prompt, whose parent allows `qtiPrompt?`', () => {
  test('two paragraphs join into the single prompt slot', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Vervoeren rode bloedcellen zuurstof?');
    paste(view, '<p>alpha</p><p>beta</p>');

    // "alpha beta", not " alpha beta": the runs are separated from each other by a space, but the
    // first one merges into the existing text with no separator — the same way "Ja" + "alpha"
    // becomes "Jaalpha" in the fan-out cases, and the same way any ordinary paste behaves.
    expect(outline(view.state.doc)).toBe(
      'qtiChoiceInteraction [RESPONSE_ORIG]\n' +
        '  qtiPrompt\n' +
        '    qtiPromptParagraph "Vervoeren rode bloedcellen zuurstof?alpha beta"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_1]\n' +
        '    qtiSimpleChoiceParagraph "Ja"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_2]\n' +
        '    qtiSimpleChoiceParagraph "Nee"\n',
    );
  });

  test('no phantom interaction is conjured next to it', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Vervoeren rode bloedcellen zuurstof?');
    paste(view, '<p>alpha</p><p>beta</p>');

    // Left to the fitter, the ejected paragraph gets wrapped by `findWrapping`, which reaches for
    // the first qualifying member of the `block` group and produced a whole
    // `qtiExtendedTextInteraction > qtiPrompt` out of nowhere.
    expect(countOf(view.state.doc, 'qtiExtendedTextInteraction')).toBe(0);
    expect(countOf(view.state.doc, 'qtiPrompt')).toBe(1);
    expect(view.state.doc.childCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Flattening what cannot survive `text*`
// ---------------------------------------------------------------------------

describe('content that the target cannot represent', () => {
  test('an image contributes its alt text', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p>alpha</p><p><img src="https://example.test/x.png" alt="rode bloedcel"></p>');

    expect(outline(view.state.doc)).toContain('qtiSimpleChoiceParagraph "rode bloedcel"');
    expect(countOf(view.state.doc, 'image')).toBe(0);
  });

  test('an image with no alt contributes nothing rather than an empty sibling', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<p>alpha</p><p><img src="https://example.test/x.png"></p>');

    // Asserted as a whole outline on purpose. Counting choices alone passes even when the document
    // is broken: unrescued, this splits into two interactions holding one choice each, and
    // "there are two choices" is true of both the correct and the corrupt document.
    expect(outline(view.state.doc)).toBe(
      'qtiChoiceInteraction [RESPONSE_ORIG]\n' +
        '  qtiPrompt\n' +
        '    qtiPromptParagraph "Vervoeren rode bloedcellen zuurstof?"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_1]\n' +
        '    qtiSimpleChoiceParagraph "Jaalpha"\n' +
        '  qtiSimpleChoice [SIMPLE_CHOICE_2]\n' +
        '    qtiSimpleChoiceParagraph "Nee"\n',
    );
  });

  test('ASSUMPTION: a bulleted list fans out one choice per list item', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<ul><li>alpha</li><li>beta</li><li>gamma</li></ul>');

    expect(countOf(view.state.doc, 'bullet_list')).toBe(0);
    const texts: string[] = [];
    view.state.doc.descendants((node) => {
      if (node.type.name === 'qtiSimpleChoiceParagraph') texts.push(node.textContent);
    });
    expect(texts).toEqual(['Jaalpha', 'beta', 'gamma', 'Nee']);
  });

  test('ASSUMPTION: a table collapses into one choice with its cell text joined', () => {
    const view = mount(choiceItem());
    cursorAtEndOf(view, 'Ja');
    paste(view, '<table><tbody><tr><td>alpha</td><td>beta</td></tr></tbody></table>');

    expect(countOf(view.state.doc, 'table')).toBe(0);
    expect(countOf(view.state.doc, 'qtiSimpleChoice')).toBe(2);
    expect(outline(view.state.doc)).toContain('qtiSimpleChoiceParagraph "Jaalpha beta"');
  });
});

// ---------------------------------------------------------------------------
// Where the rescue must keep its hands off
// ---------------------------------------------------------------------------

describe('targets that already accept what is being pasted', () => {
  test('an item-body paste is untouched', () => {
    const view = mount(plainItem());
    cursorAtEndOf(view, 'Losse alinea.');
    paste(view, '<p>alpha</p><p>beta</p>');

    expect(outline(view.state.doc)).toBe(
      'paragraph "Losse alinea.alpha"\nparagraph "beta"\n',
    );
  });

  test('a hottext interaction keeps multiple paragraphs, because `paragraph+` permits them', () => {
    const view = mount(hottextItem());
    cursorAtEndOf(view, 'Eerste regel.');
    paste(view, '<p>alpha</p><p>beta</p>');

    expect(outline(view.state.doc)).toBe(
      'qtiHottextInteraction [RESPONSE_HOTTEXT]\n' +
        '  paragraph "Eerste regel.alpha"\n' +
        '  paragraph "beta"\n',
    );
  });

  test('a list pasted at item-body level stays a list', () => {
    const view = mount(plainItem());
    cursorAtEndOf(view, 'Losse alinea.');
    paste(view, '<ul><li>alpha</li><li>beta</li></ul>');

    // The first item merges into the paragraph the cursor was in and only the remainder stays a
    // list. That is ordinary ProseMirror paste behaviour, unrelated to the rescue — recorded as it
    // actually is so the test does not fail for a reason that was never the rescue's business.
    expect(outline(view.state.doc)).toBe(
      'paragraph "Losse alinea.alpha"\n' + 'bullet_list\n' + '  list_item\n' + '    paragraph "beta"\n',
    );
  });
});
