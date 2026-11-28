# Plan: QTI attributes kept as authored

## Goal

A load → save round trip should not lose a QTI attribute that changes how an item is delivered.
Several node specs had no slot for attributes the QTI 3.0 XSD allows on elements the editor models
(`expected-length` on a text entry, `min-choices` on a choice interaction, `match-group` on a gap),
so the first export dropped them. Consumers that compare input and output to decide whether the
editor can hold an item (qti-construction does) open such items read-only.

The fixes landed as separate PRs. This page records the rules they share, so each one does not have
to restate them, and the questions they leave open.

## Policy

The short form lives in [roundtrip-format.md](../docs/roundtrip-format.md#qti-attributes-kept-as-authored).
The reasoning:

1. **Semantic attributes are kept verbatim.** The node holds the value as written and writes it back
   unchanged. `null` means "not written", so a node created in the editor serialises exactly as
   before. One helper, `qtiAttributes` (`packages/prose-qti/src/components/shared/qti-attributes.ts`),
   builds the spec fragment, so the parse/write boilerplate is not copied per attribute and a number
   that does not parse is dropped rather than written as `"NaN"`.

2. **Spelling-only defaults are not chased.** `shuffle="false"`, `fixed="false"`, `min-choices="0"`,
   `show-hide="show"`, `required="false"` mean what the absent attribute means. Keeping their
   spelling needs provenance state on the node (a "the source wrote this" flag) that the panel then
   shows, and it buys no QTI or runtime behaviour. This follows the "stay clean" choice in 9b1bc766
   (`shuffle` and `fixed` written only when true). A string attribute held verbatim keeps its text
   anyway; nothing tests or depends on that.

3. **A kept constraint must not contradict what the author edits.** An attribute that limits what a
   candidate may answer is a constraint. Kept but invisible, it can make the authored correct
   response unreachable: `min-choices="2"` on a choice interaction whose author has since marked one
   correct answer, `max-associations="1"` on a match whose correct response has two pairs. So each
   kept constraint is either
   - **editable** in the attributes panel (`expected-length`, `pattern-mask`, `match-group`,
     `match-min`, gap `required`), or
   - **reconciled by the composer** against what the author did edit, with a
     `CONSTRAINT_RECONCILED` warning (`min-choices`, order `max-choices`, `max-associations`,
     `min-associations`). `reconcileKeptConstraint` (`components/shared/composer/kept-constraints.ts`)
     does the clamping and the reporting, so each composer only states the bounds.

4. **References to things the editor does not keep are not kept.** `template-identifier` names a
   template variable and the composer does not carry template declarations; `string-identifier`
   names a second response variable the composer does not declare; `max-strings` > 1 implies a
   cardinality the extended-text composer does not write. Kept alone, each would leave the saved
   item inconsistent. They wait until the thing they point at survives.

5. **Nothing becomes editable by accident.** The reference attributes panel shows every attribute of
   a node and renders those outside `editableAttributes` disabled, but a node type with no
   attribute-panel metadata entry at all is fully editable. A node that gains kept attributes gets a
   metadata entry that says which ones the author may edit.

## Where the PRs stand

| PR | Attributes | Constraints |
|---|---|---|
| #85 text entry, extended text | `expected-length`, `pattern-mask`, `data-patternmask-message`, `format`, `base` | length, mask and its message editable |
| #90 choice, order, inline choice | `min-choices`, the selection messages, order `max-choices`, inline-choice `required`; choice `orientation` becomes the `qti-orientation-*` class | composer clamps `min-choices`, raises order `max-choices` |
| match and gap-match association limits (own PR, for the maintainers to decide) | `max-associations`, `min-associations`, the selection messages | composer raises `max-associations`, clamps `min-associations` |
| #94 choices and gaps | inline-choice `fixed`, `match-group`, gap `required`, gap-text `match-min` | `match-group`, `match-min` and gap `required` editable |
| #97 explicit `"false"` | none | closed: spelling only, rule 2 |

`class` and `id` on choices come with the shared class/id helper of #92, as a follow-up.

## Open questions

### Generic pass-through or modelled attributes

Every body element can carry `data-*`, `aria-*` and the global attributes (`id`, `class`, `lang`,
`dir`, `label`). Modelling them one node spec at a time is what these PRs do for the interaction
vocabulary, and it does not scale to open-ended `data-*`. The alternative is a generic pass-through:
one attribute bag per node that holds whatever the schema does not model and writes it back.

- *For:* nothing unmodelled is lost; no per-attribute PR.
- *Against:* the bag is invisible to the composer, so it cannot be reconciled (rule 3) — a
  `data-max-selections-message` would survive while the `max-choices` it describes is changed; the
  panel would need a generic editor or show it read-only; and content copied between interactions
  would carry attributes that mean something only in the original.

Not decided. The modelled route stays the default for anything the composer must understand.

### A fact-based attribute-loss report instead of byte-identical output

Consumers diff input and output because nothing tells them what was lost. That makes every
spelling difference look like a loss — `shuffle="false"` becoming absent, `"03"` becoming `"3"` —
and pushes the editor towards reproducing the input byte for byte (#97 was that route).

`@citolab/prose-extensions/schema-gaps` already reports *elements* the schema cannot represent, as
facts (`kind`, `code`, `nodeType`, excerpt) rather than sentences — see
[compatibility-messages.md](../docs/compatibility-messages.md). Extending it with an attribute
kind — an attribute on an element that its `parseDOM` rule does not read — would let a consumer
decide on facts. The report can know the XSD default, so a spelling-only difference is not reported
as a loss. This is the open item "Attribute removal still loses data silently" in
[surface-silent-document-load-failures.md](./surface-silent-document-load-failures.md#what-is-left).

That is the better answer to "can the editor hold this item?" than chasing identical output, and it
would make the remaining gaps (`template-identifier`, `data-*`) visible instead of silent.
