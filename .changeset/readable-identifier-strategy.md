---
"@citolab/prose-qti": minor
---

Add a configurable identifier strategy for every identifier the editor mints.

Insert commands, Enter on a choice / gap text / associable choice, the add-answer decoration, hottext
wrapping, gap insertion, the paste rescue, the copy action's re-mint and the composer's
duplicate-response guard no longer call `crypto.randomUUID()` themselves; they ask an
`IdentifierStrategy` (`responseIdentifier(ctx)` / `optionIdentifier(ctx)`, where `ctx` carries the
interaction's QTI tag, the option `role`, the identifiers already taken and the document).

New API, all additive:

- `uuidIdentifierStrategy` (the default — identifiers are unchanged: `RESPONSE_<uuid>`,
  `SIMPLE_CHOICE_<uuid>`, …) and `readableIdentifierStrategy` (`RESPONSE`, `RESPONSE2`; `A`, `B`, `C`
  for choices, inline choices, hottexts, order and gap texts; `S1`/`T1` for match sets; `G1` for gaps).
- `defineQtiExtension({ identifierStrategy })` / `defineQtiInteractionsExtension({ identifierStrategy })`,
  `defineIdentifierStrategyExtension(strategy)` for ProseKit, and `createIdentifierStrategyPlugin(strategy)`
  for plain ProseMirror.
- `identifierStrategy` on `ComposerItemContext`, `QtiComposeContext` and `RoundtripExportContext`.
- `createIdentifierMinter`, `getIdentifierStrategy` and helpers for custom interactions.
- `remintIdentifiers(node, options?)` and `createSimpleChoiceNode(schema, state?, interaction?)` take
  optional extra arguments.

Also fixes the paste rescue minting `TARGET_` identifiers for a paste into the *source* set of a
match interaction that has a prompt.
