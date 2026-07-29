/**
 * The editor's document model: every node the QTI editor schema defines, what it may contain,
 * and the flags that govern how it behaves.
 *
 * ## What this is
 *
 * A declarative mirror of the ProseMirror schema the editor actually builds at runtime. It is
 * data, not code — nothing imports ProseKit or ProseMirror to read it — but every `content`
 * string here is a valid ProseMirror content expression and every node name is a real PM node
 * name, so `NODES` can be fed to `new Schema()` after dropping `tagName` and supplying
 * `parseDOM` / `toDOM`.
 *
 * ## What consumes it
 *
 * Nothing, yet. It exists so that a generator, validator, importer or MCP server can reason
 * about the editor's grammar without instantiating an editor — which today requires a DOM,
 * custom-element registration and the whole ProseKit stack. Its contract is simply: this file
 * says what the editor's schema says.
 *
 * ## Where the real schema lives
 *
 * There is no single schema file. It is composed:
 *
 *   1. `listInteractionSchemaNodeSpecs()` in packages/prose-qti/src/core/interactions/composer.ts
 *      flattens 12 interaction descriptors into a deduped (first-wins) list of NodeSpecs.
 *   2. Each descriptor's `nodeSpecs` entry points at a `*.schema.ts` file under
 *      packages/prose-qti/src/components/ — those are the authoritative `content` values.
 *   3. The base prose nodes come from ProseKit's `defineBasicExtension()` (doc, text, paragraph,
 *      heading, image, hardBreak, table) plus `defineList()` in
 *      packages/prose-extensions/src/prosekit/list.ts.
 *
 * This file mirrors that **portable core** — the schema any consumer of `@citolab/prose-qti`
 * gets. It deliberately omits app-local nodes: `qtiItemDivider` and the `doc` override in
 * apps/qti-prosekit-app, and `qtiLayoutDiv` in apps/qti-prosemirror-item.
 *
 * ## Names
 *
 * Keys are ProseMirror node names — camelCase for QTI nodes, ProseKit's own names for the base
 * ones (`paragraph`, `hardBreak`, `tableRow`, `bullet_list`). `tagName` carries the markup name
 * where the two differ.
 *
 * This is not cosmetic. ProseMirror tokenizes content expressions with
 * `string.split(/\s*(?=\b|\W|$)/)`, so a hyphen terminates a name and `parseExprAtom` throws
 * `Unexpected token '-'`. Hyphenated tag names cannot appear in a content expression at all.
 *
 * ## Provenance
 *
 * Seeded by compiling the QTI 3 XSD's element declarations into content expressions, then
 * reconciled against the editor. The XSD was right about structure and far too permissive about
 * content: `qti-simple-choice` came back with 40+ alternatives spanning the whole HTML flow
 * model, where the editor allows exactly one paragraph of text. Where the editor narrows or
 * departs from the standard, an `XSD:` comment on the node records what the standard permits
 * and why the editor does not.
 */

/**
 * One entry per node, keyed by ProseMirror node name.
 *
 * Fields mirror `NodeSpec` one-to-one — `content`, `group`, `inline`, `atom`, `marks`,
 * `defining`, `isolating`, `selectable`, `draggable`, `topNode`, `attrs` — minus `parseDOM` and
 * `toDOM`, which are serialization concerns and not part of the grammar. `tagName` and
 * `placeholder` are the two additions: the markup name, and the editor's empty-node hint.
 *
 * A node with no `content` is a leaf. `atom: true` says the editor treats it as an opaque unit.
 *
 * Closure obligation: every bare name appearing in any `content` expression must be a key of
 * this object, a key of `GROUPS`, or the built-in `text`.
 */
export const NODES = {
  // ── base: document ─────────────────────────────────────────────────────────
  //
  // apps/qti-prosekit-app narrows this to `heading paragraph qtiItemDivider block*` to pin a
  // locked title/intro header. That is an app decision, not part of the portable core.
  doc: {
    content: 'block+',
    topNode: true,
    attrs: { title: { default: '' }, identifier: { default: '' } }
  },

  // ── base: prose ────────────────────────────────────────────────────────────
  text: { group: 'inline' },

  // The `richtext` membership cannot be patched on from an extension: ProseKit's
  // `defineParagraph()` wraps its spec in `withPriority(spec, 4)` — the highest — so
  // paragraph's payload reduces last and `mergeSpecs` lets its own `group: 'block'` overwrite
  // any later patch. A `defineNodeSpec({name:'paragraph', group:'block richtext'})` from an
  // extension is silently discarded, with no error and no warning.
  //
  // So the group is declared on the spec itself. `defineBasicExtension` in
  // prose-extensions/src/prosekit/basic.ts composes paragraph from ProseKit's exported
  // commands and keymap plus a spec of its own, never admitting the priority-4 spec to the
  // union. qtiRubricBlock's `richtext+` depends on this.
  paragraph: { tagName: 'p', content: 'inline*', group: 'block richtext' },

  heading: {
    tagName: 'h1..h6',
    content: 'inline*',
    group: 'block',
    defining: true,
    attrs: { level: { default: 1 } }
  },

  // Block, not inline. Worth stating plainly: a bare `<img>` in running text does not survive
  // as inline content — it is lifted out of the paragraph.
  //
  // XSD: no `alt`. The standard requires a text alternative and the editor does not model one
  // here. (imgSelectPoint does, as `imageAlt`.)
  image: {
    tagName: 'img',
    group: 'block',
    defining: true,
    draggable: true,
    attrs: { src: { default: null }, width: { default: null }, height: { default: null } }
  },

  hardBreak: { tagName: 'br', group: 'inline', inline: true, selectable: false },

  // ── base: lists ────────────────────────────────────────────────────────────
  bullet_list: { tagName: 'ul', content: 'list_item+', group: 'block richtext' },

  // XSD: `start` and `type`. ProseMirror's list package models only the start number, as
  // `order`; list-marker style is left to CSS.
  ordered_list: {
    tagName: 'ol',
    content: 'list_item+',
    group: 'block richtext',
    attrs: { order: { default: 1 } }
  },

  list_item: { tagName: 'li', content: 'paragraph block*', defining: true },

  // ── base: tables ───────────────────────────────────────────────────────────
  //
  // No `caption` node exists. `thead` / `tbody` / `colgroup` are likewise absent, as
  // prosemirror-tables omits them — `th` carries the accessibility weight.
  // `richtext` is patched on by `defineBasicExtension`, not declared by prosekit's
  // `defineTable()`. Unlike paragraph, table's spec carries no priority override, so an
  // ordinary `defineNodeSpec` patch reaches it.
  table: { content: 'tableRow+', group: 'block richtext', isolating: true },
  tableRow: { tagName: 'tr', content: '(tableCell | tableHeaderCell)*' },

  // XSD: `th` also carries `scope`. Not modelled — screen-reader table navigation currently
  // relies on the th/td distinction alone.
  tableCell: {
    tagName: 'td',
    content: 'block+',
    isolating: true,
    attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } }
  },
  tableHeaderCell: {
    tagName: 'th',
    content: 'block+',
    isolating: true,
    attrs: { colspan: { default: 1 }, rowspan: { default: 1 }, colwidth: { default: null } }
  },

  // ── QTI: block interactions ────────────────────────────────────────────────
  //
  // All of them are `defining` and `isolating`: an interaction is a unit that paste must not
  // dissolve and that selection must not escape by accident.
  //
  // XSD: every one of these has `qti-prompt?` — optional. The editor requires it, so an
  // interaction always has a stable first child to land the cursor in and a place for the
  // question text to live. An empty prompt renders as its placeholder, not as nothing.

  qtiChoiceInteraction: {
    tagName: 'qti-choice-interaction',
    content: 'qtiPrompt qtiSimpleChoice+',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      maxChoices: { default: 0 },
      class: { default: null },
      correctResponse: { default: null },
      responseIdentifier: { default: null },
      score: { default: 1 },
      shuffle: { default: false }
    }
  },

  qtiOrderInteraction: {
    tagName: 'qti-order-interaction',
    content: 'qtiPrompt qtiSimpleChoice+',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      shuffle: { default: false },
      orientation: { default: 'vertical' },
      class: { default: null },
      correctResponse: { default: null },
      responseIdentifier: { default: null },
      score: { default: 1 }
    }
  },

  qtiAssociateInteraction: {
    tagName: 'qti-associate-interaction',
    content: 'qtiPrompt qtiSimpleAssociableChoice+',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      maxAssociations: { default: 1 },
      minAssociations: { default: 0 },
      shuffle: { default: false },
      class: { default: null },
      correctResponse: { default: null },
      responseIdentifier: { default: null },
      score: { default: 1 }
    }
  },

  // Exactly two match sets: sources first, then targets. The direction is what makes a
  // `correct-response` pair mean anything.
  //
  // XSD: permits an empty match set (`minOccurs="0"`) — see qtiSimpleMatchSet.
  qtiMatchInteraction: {
    tagName: 'qti-match-interaction',
    content: 'qtiPrompt qtiSimpleMatchSet{2}',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      shuffle: { default: false },
      class: { default: null },
      correctResponse: { default: null },
      responseIdentifier: { default: null },
      score: { default: 1 }
    }
  },

  // Same tag as qtiMatchInteraction. The only discriminator is `class~="qti-match-tabular"`:
  // the tabular parse rule requires it at priority 80, and the non-tabular rule returns false
  // when it is present. Two PM nodes, one markup element.
  qtiMatchInteractionTabular: {
    tagName: 'qti-match-interaction',
    content: 'qtiPrompt qtiSimpleMatchSet{2}',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      shuffle: { default: false },
      class: { default: null },
      correctResponse: { default: null },
      responseIdentifier: { default: null },
      score: { default: 1 },
      dataFirstColumnHeader: { default: null }
    }
  },

  // The draggable sources come first as a flat list, then the prose holding the gaps.
  //
  // XSD: `qti-gap-text` is `+`. The editor requires two — a single-source gap match is a
  // degenerate interaction with only one possible answer.
  qtiGapMatchInteraction: {
    tagName: 'qti-gap-match-interaction',
    content: 'qtiPrompt qtiGapText{2,} paragraph+',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      maxAssociations: { default: 0 },
      shuffle: { default: false },
      class: { default: null },
      correctResponse: { default: null },
      responseIdentifier: { default: null },
      score: { default: 1 }
    }
  },

  // The exception to the prompt rule: no prompt at all. Hottext choices are embedded in
  // running text, so the instruction and the answerable content are the same paragraphs —
  // a separate prompt would have nothing to say.
  //
  // XSD: nests hottexts inside the full block model. Collapsed to `paragraph+`.
  qtiHottextInteraction: {
    tagName: 'qti-hottext-interaction',
    content: 'paragraph+',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      responseIdentifier: { default: null },
      maxChoices: { default: 1 },
      minChoices: { default: 0 },
      class: { default: null },
      correctResponse: { default: null },
      score: { default: 1 }
    }
  },

  // Prompt only — the response is a textarea the runtime supplies, with no authored content.
  qtiExtendedTextInteraction: {
    tagName: 'qti-extended-text-interaction',
    content: 'qtiPrompt',
    group: 'block',
    defining: true,
    isolating: true,
    attrs: {
      responseIdentifier: { default: null },
      expectedLength: { default: null },
      expectedLines: { default: null },
      placeholderText: { default: null },
      patternMask: { default: null },
      class: { default: null },
      score: { default: 1 }
    }
  },

  // XSD: allows `object | img | picture`. The editor uses a dedicated `imgSelectPoint` node
  // rather than the generic `image`, because the image here is the response surface — its
  // coordinates are the answer key — and it must not be draggable, liftable or replaceable
  // the way a decorative image is.
  //
  // Note this one is `isolating` but not `defining`.
  qtiSelectPointInteraction: {
    tagName: 'qti-select-point-interaction',
    content: 'qtiPrompt imgSelectPoint',
    group: 'block',
    selectable: true,
    isolating: true,
    attrs: {
      responseIdentifier: { default: null },
      maxChoices: { default: 0 },
      minChoices: { default: 0 },
      class: { default: null },
      areaMappings: { default: '[]' },
      correctResponse: { default: null },
      score: { default: 1 }
    }
  },

  // ── QTI: inline interactions ───────────────────────────────────────────────
  //
  // XSD: has a leading `qti-label?`. The editor uses the `data-prompt` attribute instead, so
  // the element has no child prompt.
  qtiInlineChoiceInteraction: {
    tagName: 'qti-inline-choice-interaction',
    content: 'qtiInlineChoice+',
    group: 'inline',
    inline: true,
    selectable: true,
    isolating: true,
    attrs: {
      responseIdentifier: { default: null },
      shuffle: { default: false },
      class: { default: null },
      correctResponse: { default: null },
      score: { default: 1 },
      dataPrompt: { default: null }
    }
  },

  // Leaf: the input is the interaction. It sits inside a paragraph, between text.
  // `marks: '_'` so it survives inside emphasised or bold runs.
  qtiTextEntryInteraction: {
    tagName: 'qti-text-entry-interaction',
    group: 'inline',
    inline: true,
    atom: true,
    marks: '_',
    selectable: true,
    attrs: {
      responseIdentifier: { default: null },
      correctResponse: { default: null },
      caseSensitive: { default: false },
      class: { default: null },
      placeholderText: { default: null },
      score: { default: 1 }
    }
  },

  // ── QTI: interaction children ──────────────────────────────────────────────
  //
  // XSD: permits an empty match set (`minOccurs="0"`). Valid, and never what anyone means.
  qtiSimpleMatchSet: {
    tagName: 'qti-simple-match-set',
    content: 'qtiSimpleAssociableChoice+',
    group: 'block'
  },

  // The `*Paragraph` wrappers below are the editor's central narrowing of the standard.
  //
  // XSD: these choice bodies admit the whole HTML flow model. The editor pins each to exactly
  // one paragraph of plain text. That is what makes a choice a single editable line with a
  // stable cursor target, a working placeholder, and predictable Enter behaviour — Enter
  // creates the next choice rather than a second paragraph inside the current one.
  //
  // The cost is real and worth naming: no images, line breaks or lists inside a choice.
  // qtiSimpleAssociableChoice is the one exception, and it takes media as an alternative to
  // its paragraph, never alongside it.

  qtiSimpleChoice: {
    tagName: 'qti-simple-choice',
    content: 'qtiSimpleChoiceParagraph',
    placeholder: 'Enter answer option…',
    attrs: { identifier: { default: 'A' }, fixed: { default: false } }
  },
  qtiSimpleChoiceParagraph: { tagName: 'p', content: 'text*', group: 'block' },

  qtiSimpleAssociableChoice: {
    tagName: 'qti-simple-associable-choice',
    content: 'qtiSimpleAssociableChoiceParagraph | qtiMedia',
    group: 'block',
    placeholder: 'Enter matching option…',
    attrs: {
      identifier: { default: 'A' },
      matchMax: { default: 1 },
      matchMin: { default: 0 },
      fixed: { default: false }
    }
  },
  // The one choice body that is `inline*` rather than `text*`, so marks and hard breaks
  // survive here. It belongs to no group — reachable only through its parent.
  qtiSimpleAssociableChoiceParagraph: { tagName: 'p', content: 'inline*' },

  qtiGapText: {
    tagName: 'qti-gap-text',
    content: 'text*',
    group: 'block',
    placeholder: 'Enter gap text…',
    attrs: { identifier: { default: null }, matchMax: { default: 1 } }
  },

  qtiHottext: {
    tagName: 'qti-hottext',
    content: 'text*',
    group: 'inline',
    inline: true,
    marks: '_',
    selectable: true,
    attrs: { identifier: { default: null } }
  },

  qtiInlineChoice: {
    tagName: 'qti-inline-choice',
    content: 'text*',
    group: 'inline',
    inline: true,
    selectable: true,
    placeholder: 'Enter option…',
    attrs: { identifier: { default: 'A' } }
  },

  // Leaf: a drop target. Its content is whatever the candidate puts there.
  qtiGap: {
    tagName: 'qti-gap',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    attrs: { identifier: { default: null }, matchMax: { default: 1 } }
  },

  // ── QTI: shared static content ─────────────────────────────────────────────
  //
  // XSD: a prompt is static content — inline and block, no interactions. The editor is
  // stricter still: exactly one paragraph of text. The static/non-static split the standard
  // needs to keep interactions out of prompts is therefore unnecessary here; `text*` already
  // admits nothing to nest.
  //
  // Belongs to no group — reachable only as a named child of an interaction.
  qtiPrompt: {
    tagName: 'qti-prompt',
    content: 'qtiPromptParagraph',
    placeholder: 'Enter the question or instruction…'
  },
  qtiPromptParagraph: { tagName: 'p', content: 'text*', group: 'block' },

  // ── QTI: media ─────────────────────────────────────────────────────────────
  //
  // The response surface of a select-point interaction. A leaf: its coordinates are the answer
  // key, so it is selected and replaced whole, never edited in place.
  imgSelectPoint: {
    tagName: 'img',
    group: 'block qtiMedia',
    atom: true,
    selectable: true,
    attrs: {
      imageSrc: { default: null },
      imageAlt: { default: null },
      imageWidth: { default: null },
      imageHeight: { default: null }
    }
  },

  // Not declared by any descriptor. Injected by the composer from
  // `baseSchemaDependencyNodeSpecs.qtiMedia` when a descriptor declares
  // `baseSchemaDependencies.nodeGroups: ['qtiMedia']` — associate, match and matchTabular do.
  // It exists so `qtiSimpleAssociableChoice`'s `| qtiMedia` branch resolves in schemas that
  // include those interactions but not select-point.
  qtiMediaStub: {
    tagName: 'qti-media-stub',
    group: 'block qtiMedia',
    atom: true,
    selectable: true
  },

  // ── QTI: rubric ────────────────────────────────────────────────────────────
  //
  // Author-facing instructions / scoring / navigation guidance. `richtext+` deliberately
  // excludes interactions: a rubric is prose about the item, never part of it.
  //
  // On the wire the body is wrapped in a `qti-content-body` element. That wrapper is pure
  // serialization framing and has no PM node.
  //
  // A group, not the four node types spelled out. Spelling them out looks like it removes a
  // coordination requirement and in fact tightens one: a group reference resolves as long as
  // *some* node carries the group, whereas a name reference obliges every host schema to
  // define that exact node. The pure-ProseMirror hosts — the e2e story harnesses among them,
  // built on `prosemirror-schema-basic` — have no table or list nodes, and naming those makes
  // `new Schema()` throw outright.
  //
  // What was genuinely broken before was paragraph's membership, patched on from an extension
  // and silently dropped (see the note on `paragraph`), leaving the group as tables and lists
  // only. A rubric block came out holding a table, and qti-rubric-block.commands.ts — which
  // builds one around a paragraph — produced a document that failed `.check()`. Paragraph now
  // declares `richtext` on its own spec, so the group is whole.
  qtiRubricBlock: {
    tagName: 'qti-rubric-block',
    content: 'richtext+',
    group: 'block',
    defining: true,
    createGapCursor: true,
    attrs: {
      use: { default: 'instructions', values: ['instructions', 'scoring', 'navigation'] },
      view: {
        default: 'author',
        values: ['author', 'candidate', 'proctor', 'scorer', 'testConstructor', 'tutor']
      }
    }
  }
};

/**
 * Inline formatting, carried as ProseMirror marks. A mark wraps text without taking part in the
 * node model, so these need no entries in NODES and no closure obligation.
 *
 * Two, and only two. An earlier revision of this file listed `sub` and `sup` on the grounds
 * that chemistry and maths items cannot do without them — true, and they are still not in the
 * editor. If they are added, they belong here and in prose-extensions/src/prosekit/strong-em.ts.
 *
 * The pure-ProseMirror apps (apps/qti-prosemirror-item, apps/site) pass `marks` from
 * prosemirror-schema-basic wholesale and therefore also carry `link` and `code`. Those are not
 * part of the portable core.
 *
 * Marks are available wherever `text` is, except where a node restricts them. `marks: '_'` on
 * qtiHottext and qtiTextEntryInteraction means "all marks", so that those nodes survive inside
 * an emphasised or bold run rather than splitting it.
 */
export const MARKS = {
  em: { tagName: 'em' },
  strong: { tagName: 'strong' }
};

/**
 * Group membership, derived from the `group` fields in NODES.
 *
 * This is a reverse index for reading convenience, **not** a definition. ProseMirror groups are
 * plain space-separated labels declared on each node; they cannot be defined as expressions and
 * cannot reference one another. NODES is the source of truth — if these disagree, NODES wins.
 *
 * `richtext` is prose a candidate cannot respond to — block content minus every interaction.
 * `qtiRubricBlock` is its consumer here (`richtext+`), and the pure-ProseMirror app uses it a
 * second time as `tableNodes({ cellContent: 'richtext+' })`. Membership is declared in three
 * places: paragraph and table in `prose-extensions/src/prosekit/basic.ts`, the two list nodes
 * in `prose-extensions/src/prosekit/list.ts`. Hosts outside ProseKit tag their own prose nodes
 * — the e2e story harnesses do it with `group: 'block richtext'` on paragraph alone.
 *
 * Note what is absent. The QTI XSD's static / non-static split — `inline_static` and
 * `block_static`, the sets a candidate cannot respond to — has no counterpart here. The
 * standard needs it to keep interactions out of prompts; the editor gets the same guarantee
 * from concrete node types, because `qtiPrompt` admits only `qtiPromptParagraph`, which admits
 * only `text`.
 */
export const GROUPS = {
  block: [
    'paragraph',
    'heading',
    'image',
    'bullet_list',
    'ordered_list',
    'table',
    'qtiChoiceInteraction',
    'qtiOrderInteraction',
    'qtiAssociateInteraction',
    'qtiMatchInteraction',
    'qtiMatchInteractionTabular',
    'qtiGapMatchInteraction',
    'qtiHottextInteraction',
    'qtiExtendedTextInteraction',
    'qtiSelectPointInteraction',
    'qtiSimpleMatchSet',
    'qtiSimpleAssociableChoice',
    'qtiSimpleChoiceParagraph',
    'qtiPromptParagraph',
    'qtiGapText',
    'imgSelectPoint',
    'qtiMediaStub',
    'qtiRubricBlock'
  ],

  inline: [
    'text',
    'hardBreak',
    'qtiInlineChoiceInteraction',
    'qtiTextEntryInteraction',
    'qtiHottext',
    'qtiInlineChoice',
    'qtiGap'
  ],

  // Vestigial — declared by the list nodes, referenced by nothing. See the note above.
  richtext: ['bullet_list', 'ordered_list', 'paragraph', 'table'],

  qtiMedia: ['imgSelectPoint', 'qtiMediaStub']
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
 * The interactions type their answer keys machine-readably (`identifier`, `identifier[]`,
 * `directedPair[]`, `point[]`, `string`), so a consumer can resolve references generically —
 * reading the type, never the tag name. This list is the other half: what a reference may
 * resolve TO.
 *
 * Not every `identifier` attribute is one of these. `doc.identifier` is the item's own
 * identifier, and the app-local `qtiItemDivider.identifier` names an item within a package.
 * Neither is a response-reference target.
 */
export const IDENTIFIED = [
  'qtiSimpleChoice',
  'qtiSimpleAssociableChoice',
  'qtiGap',
  'qtiGapText',
  'qtiHottext',
  'qtiInlineChoice'
];
