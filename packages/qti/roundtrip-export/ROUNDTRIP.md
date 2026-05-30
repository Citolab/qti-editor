# Lossless ProseMirror ↔ QTI Roundtrip

> See [Itembody-only QTI subformat](../../../apps/site/src/content/docs/packages/itembody-subformat.mdx) for the conceptual overview (also published on the docs site under Package Reference). This file documents the per-tag mapping table.

> **This package and its sibling `@qti-editor/qti-roundtrip-import` are NOT a generic QTI 3.0 importer/exporter.** They exist solely to let the editor save and restore its own authoring state through QTI 3.0 packages without losing information. Importing QTI 3.0 produced by another vendor will silently drop correct-response and scoring data, because the importer ignores `qti-response-declaration` and `qti-response-processing`.

## What this is

`@qti-editor/qti-roundtrip-export` + `@qti-editor/qti-roundtrip-import` form a **paired contract**:

- The editor's ProseMirror schema carries authoring-only attributes on interaction nodes (e.g. `correct-response`, `score`, `case-sensitive`, `area-mappings`). These attributes are richer than what QTI 3.0's `qti-response-declaration` / `qti-response-processing` model can express without lossy interpretation.
- On **export**, these attributes are mirrored onto the QTI interaction element as `data-*` attributes (in addition to writing standard `qti-response-declaration` / `qti-response-processing` for QTI 3.0 conformance).
- On **import**, `qti-response-declaration` and `qti-response-processing` are deliberately stripped, and only the itemBody plus the `data-*` mirrors are read back into ProseMirror, which rehydrates them into the original schema attributes.

The result: **export-then-import preserves authoring state byte-for-byte at the schema level**. The standard QTI nodes are decoration for external readers.

## What this is NOT

- ❌ A reader for third-party QTI 3.0. Anything that depends on parsing `qti-response-declaration` / `qti-response-processing` is out of scope. Loading such packages will yield interactions with empty correct-response / score attributes.
- ❌ A generic QTI 3.0 writer. Although the export does produce QTI-3.0-conformant XML, its job is to preserve roundtrip, not to be a reference implementation of the standard.
- ❌ A migration tool. If you need to import a foreign QTI package, that belongs in a **separate** future package (the names `@qti-editor/qti-export` / `@qti-editor/qti-import` are reserved for that).

## The contract table (human-readable per-tag view)

The forward source of truth for these mappings is each interaction's `nonQtiAttributes` declaration in `packages/prosemirror/interaction-*/src/composer/metadata.ts`. At runtime, [`collectMirrorMappings`](../../prosemirror/interaction-shared/src/composer/non-qti-attributes.ts) in `@qti-editor/interaction-shared/composer/non-qti-attributes` walks those declarations to produce the `{ source, target: 'data-<source>' }` pairs used by:

- the compose pipeline (`@qti-editor/qti-core`)
- the export regex pass in this package
- the inverse `data-*` → schema-attr mapping in `@qti-editor/qti-roundtrip-import` (derived from the same registry)

The table below is the human-readable per-tag view of the resulting wire format. The wire format itself is unchanged by the unification — only the source of the mapping moved.

| ProseMirror schema attribute | QTI tag(s) where written | `data-*` attribute on QTI tag |
| --- | --- | --- |
| `correct-response` / `correctResponse` / `correctAnswer` | all `qti-*-interaction` | `data-correct-response` |
| `score` | all `qti-*-interaction` | `data-score` |
| `case-sensitive` | `qti-text-entry-interaction` | `data-case-sensitive` |
| `area-mappings` | `qti-select-point-interaction` | `data-area-mappings` |

The QTI standard nodes (`qti-response-declaration`, `qti-response-processing`) are **written** by export (for conformance) and **discarded** by import (`stripIgnoredQtiSections`). They are not part of the contract.

## The asymmetry, visually

```
        ┌───────────── ProseMirror authoring tree ─────────────┐
        │                                                      │
        │   <interaction correct-response="..." score="...">   │
        │                                                      │
        └───────────────────────┬──────────────────────────────┘
                                │  EXPORT
                                ▼
        ┌──────────── QTI 3.0 item XML (in ZIP) ──────────────┐
        │                                                     │
        │  <qti-*-interaction                                 │
        │     correct-response="..."        ← QTI-conformant  │
        │     score="..."                   ← QTI-conformant  │
        │     data-correct-response="..."   ← roundtrip       │
        │     data-score="..."              ← roundtrip       │
        │  >                                                  │
        │  <qti-response-declaration .../>  ← QTI-conformant, │
        │  <qti-response-processing .../>     IGNORED on      │
        │                                     import          │
        └───────────────────────┬─────────────────────────────┘
                                │  IMPORT
                                │  - strip qti-response-*
                                │  - copy data-* → schema attrs
                                ▼
        ┌───────────── ProseMirror authoring tree ─────────────┐
        │                                                      │
        │   <interaction correct-response="..." score="...">   │
        │                                                      │
        └──────────────────────────────────────────────────────┘
```

Third-party QTI lacks the `data-*` mirrors. Run it through this importer and the rehydrated tree will have empty authoring attributes — the import does not attempt to reconstruct them from the standard nodes.

## Adding a new roundtripped attribute

1. Add the attribute to the ProseMirror schema for the relevant interaction (under `packages/prosemirror/interaction-*/`).
2. Add it to `nonQtiAttributes` in that interaction's `composer/metadata.ts` (plain string, or object form for `mirror: false` / `aliases`). The export's regex pass and the import's inverse mapping are derived from this declaration automatically.
3. Extend the roundtrip integration test in `packages/qti/roundtrip-export/src/index.roundtrip.test.ts` so a ProseMirror document with the attribute set survives export→import unchanged.
4. Add a row to the contract table above.

No parallel mapping tables to keep in sync — `collectMirrorMappings` does the derivation.

## What NOT to change

- Do not make the importer read `qti-response-declaration` / `qti-response-processing` as a source of authoring state. They exist for external QTI readers; treating them as input here would partially un-do the design.
- Do not reintroduce parallel hardcoded mapping tables in the roundtrip packages — they must continue to derive from `nonQtiAttributes` via `collectMirrorMappings`.
- Do not "generalize" these packages to handle third-party QTI input. Reserve that for a separate package.
- Do not rename the `data-*` keys without bumping both packages' major versions and migrating any persisted QTI packages.
