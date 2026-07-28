/**
 * The QTI roundtrip content model: which nodes may contain which, and in what number.
 *
 * Consumed by tools/build/cem-interactions-mcp.mjs, which merges these expressions into
 * custom-elements.interactions.json as a `content` field per element plus top-level `groups`
 * and `marks`. The QTI MCP server reads only that manifest — it contains no QTI knowledge of
 * its own, so anything the generator must know has to be expressible here.
 *
 * ## Why this file exists
 *
 * `cem generate` cannot produce it. The analyzer describes a JavaScript class; a content model
 * is a document grammar. Nothing in `QtiChoiceInteraction` states that it needs at least one
 * `qti-simple-choice`, so no amount of static analysis can recover it. It is authored.
 *
 * It lives in one block rather than as a `@content` JSDoc tag per element for two reasons:
 * the grammar has to CLOSE (every name used must be defined, and that is far easier to verify
 * when the whole thing is visible at once), and a third of the nodes below — `p`, `li`, `td`,
 * `text` — have no component to hang a JSDoc block on.
 *
 * ## Syntax
 *
 * DTD-shaped, the same notation ProseMirror uses for `content`:
 *
 *   a b        sequence — a then b          a?     zero or one
 *   a | b      alternatives                 a*     zero or more
 *   (a b)      grouping                     a+     one or more
 *   a{2}       exactly two                  a{2,}  two or more
 *
 * Names are TAG names, hyphenated, matching `tagName` in the manifest exactly, so the engine
 * needs no mapping between grammar and markup. (ProseMirror conventionally uses `snake_case`
 * node names; if prose-qti consumes this, that is a mechanical rename in one place.)
 *
 * `text` is the only built-in. Everything else — including `p`, `br` and `img` — is declared
 * below, because the engine must not carry a private list of what HTML is.
 *
 * ## Provenance
 *
 * Seeded by compiling the QTI 3 XSD's element declarations into content expressions, then
 * curated. The XSD was right about structure and useless about content: `qti-simple-choice`
 * came back with 40+ alternatives spanning the whole HTML flow model. Rows marked `corrected`
 * below are ones where these components deviate from the standard.
 */

/**
 * Named sets of nodes, referenced by the expressions in CONTENT. Groups may reference other
 * groups; the engine expands them transitively.
 *
 * The static / non-static split is QTI's own. `ItemBodyDType` admits block interactions
 * directly, while a prompt is static content only — so `inline` and `block` are the full sets,
 * and `*_static` are the same sets minus anything a candidate can respond to.
 *
 * This split earns its keep in exactly one place: `qti-prompt` is static, which makes an
 * interaction nested inside a prompt ungrammatical. That is a mistake a generator makes
 * readily, and it is worth catching structurally rather than in prose.
 *
 * The QTI XSD has no named groups — it inlines every alternative at every use site, which is
 * why compiling it produced those 40+ branches. Naming them is what keeps CONTENT readable.
 */
export const GROUPS = {
  inline_static: 'text | br | img',

  inline:
    'inline_static | qti-text-entry-interaction | qti-inline-choice-interaction ' +
    '| qti-hottext | qti-gap',

  block_static: 'p | ul | ol | table',

  block:
    'block_static | qti-choice-interaction | qti-order-interaction | qti-match-interaction ' +
    '| qti-gap-match-interaction | qti-hottext-interaction | qti-extended-text-interaction ' +
    '| qti-select-point-interaction'
};

/**
 * Inline formatting, carried as ProseMirror-style marks rather than as alternatives in the
 * expressions. A mark wraps text without taking part in the node model, so these need no
 * entries in CONTENT and no closure obligation.
 *
 * Marks are available wherever `text` is. `sub` / `sup` are here because chemistry and maths
 * items cannot do without them.
 */
export const MARKS = ['em', 'strong', 'sub', 'sup'];

/**
 * One entry per node. An empty string means the node is empty (void).
 *
 * Every name appearing in any expression — here or in GROUPS — must be a key of this object,
 * or the literal `text`. cem-interactions-mcp.mjs asserts that closure before writing the
 * manifest; a dangling name fails the build rather than surfacing later as an MCP tool that
 * cannot generate one particular element.
 */
export const CONTENT = {
  // ── document ───────────────────────────────────────────────────────────────
  //
  // `ItemBodyDType` verbatim. With `doc` present the roundtrip "fragment" needs no definition
  // of its own: a fragment is any single `block`, a whole item body is `doc`, and the engine
  // has one code path for both.
  doc: 'block+',

  // ── block interactions ─────────────────────────────────────────────────────
  'qti-choice-interaction': 'qti-prompt? qti-simple-choice+',
  'qti-order-interaction': 'qti-prompt? qti-simple-choice+',

  // Exactly two match sets: sources first, then targets. The direction is what makes a
  // `correct-response` pair mean anything.
  'qti-match-interaction': 'qti-prompt? qti-simple-match-set{2}',

  // The draggable sources come first as a flat list, then the prose holding the gaps.
  'qti-gap-match-interaction': 'qti-prompt? qti-gap-text+ p+',

  // corrected: the XSD nests hottexts inside the full block model. Collapsed to `p`, which is
  // where they actually go — the choices are embedded in running text, not siblings of it.
  'qti-hottext-interaction': 'qti-prompt? p+',

  'qti-extended-text-interaction': 'qti-prompt?',

  // corrected: the XSD allows `object | img | picture`. These components render an image.
  'qti-select-point-interaction': 'qti-prompt? img',

  // ── inline interactions ────────────────────────────────────────────────────
  //
  // corrected: the XSD has a leading `qti-label?`. These components use the `data-prompt`
  // attribute instead, so the element has none.
  'qti-inline-choice-interaction': 'qti-inline-choice+',

  // Void: the input is the interaction. It sits inside a `p`, between text.
  'qti-text-entry-interaction': '',

  // ── interaction children ───────────────────────────────────────────────────
  //
  // corrected: the XSD permits an empty match set (`minOccurs="0"`). Valid, and never what
  // anyone means.
  'qti-simple-match-set': 'qti-simple-associable-choice+',

  'qti-simple-choice': 'inline_static*',
  'qti-simple-associable-choice': 'inline_static*',
  'qti-gap-text': 'inline_static*',
  'qti-hottext': 'inline_static*',
  'qti-inline-choice': 'inline_static*',

  // Void: a drop target. Its content is whatever the candidate puts there.
  'qti-gap': '',

  // ── static content ─────────────────────────────────────────────────────────
  //
  // Mixed on purpose. A one-line prompt emits bare text with no `p` wrapper, and a prompt that
  // needs a table can have one. Static, so no interaction may be a direct child.
  'qti-prompt': '(inline_static | block_static)*',

  p: 'inline*',

  ul: 'li+',
  ol: 'li+',
  li: '(inline | block)*',

  // `thead` / `tbody` / `colgroup` omitted, as prosemirror-tables omits them: the XSD allows
  // `tr` directly under `table`, and `th` + `scope` carries the accessibility weight.
  table: 'caption? tr+',
  tr: '(td | th)+',

  // Non-static: a table of gaps to fill in is a real and common item shape.
  td: '(inline | block)*',
  th: '(inline | block)*',
  caption: 'inline_static*',

  br: '',
  img: ''
};

/**
 * Attributes these nodes need that no CEM analysis will ever produce, because they are HTML,
 * not custom elements. Merged into the manifest so the engine can validate them like any
 * other attribute — without them it would reject `colspan` as unknown.
 */
export const HTML_ATTRIBUTES = {
  img: [
    { name: 'src', required: true, type: 'string' },
    { name: 'alt', type: 'string', description: 'Text alternative. Required for accessibility.' },
    { name: 'width', type: 'number' },
    { name: 'height', type: 'number' }
  ],
  ol: [
    { name: 'start', type: 'number' },
    { name: 'type', type: "'1'|'a'|'A'|'i'|'I'", values: ['1', 'a', 'A', 'i', 'I'] }
  ],
  td: [
    { name: 'colspan', type: 'number' },
    { name: 'rowspan', type: 'number' }
  ],
  th: [
    { name: 'colspan', type: 'number' },
    { name: 'rowspan', type: 'number' },
    {
      name: 'scope',
      type: "'row'|'col'|'rowgroup'|'colgroup'",
      values: ['row', 'col', 'rowgroup', 'colgroup'],
      description: 'Which cells this header describes. Needed for screen-reader table navigation.'
    }
  ]
};

/**
 * Nodes whose `identifier` attribute is the target of a `correct-response` reference.
 *
 * This is the one thing a content model structurally cannot express, and the one that matters
 * most. `correct-response="c_amsterdam"` against a choice whose identifier is `c_ams` is
 * grammatically perfect and scores zero forever — it renders, it reviews clean, and every
 * candidate is marked wrong. DTDs carry ID/IDREF as a separate mechanism for exactly this
 * reason; ProseMirror has no equivalent at all.
 *
 * The manifest already types the answer keys machine-readably (`identifier`,
 * `identifier[]`, `directedPair[]`, `point[]`, `string`), so the engine can resolve references
 * generically — reading the type, never the tag name. This list is the other half: what a
 * reference may resolve TO.
 */
export const IDENTIFIED = [
  'qti-simple-choice',
  'qti-simple-associable-choice',
  'qti-gap',
  'qti-gap-text',
  'qti-hottext',
  'qti-inline-choice'
];
