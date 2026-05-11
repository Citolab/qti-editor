# Lossless ProseMirror ↔ QTI Roundtrip

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

## The contract table (source of truth)

If you change any row here, you MUST change both packages in the same commit.

| ProseMirror schema attribute | QTI tag(s) where written | `data-*` attribute on QTI tag | Export site | Import site |
| --- | --- | --- | --- | --- |
| `correct-response` / `correctResponse` / `correctAnswer` | all `qti-*-interaction` | `data-correct-response` | [`EDITOR_DATA_ATTRIBUTE_MAPPINGS`](src/index.ts) in `roundtrip-export/src/index.ts` | [`DATA_ATTRIBUTE_MAPPINGS`](../roundtrip-import/src/index.ts) in `roundtrip-import/src/index.ts` |
| `score` | all `qti-*-interaction` | `data-score` | `EDITOR_DATA_ATTRIBUTE_MAPPINGS` | `DATA_ATTRIBUTE_MAPPINGS` |
| `case-sensitive` | `qti-text-entry-interaction` | `data-case-sensitive` | `TEXT_ENTRY_DATA_ATTRIBUTE_MAPPINGS` | `DATA_ATTRIBUTE_MAPPINGS` |
| `area-mappings` | `qti-select-point-interaction` | `data-area-mappings` | `SELECT_POINT_DATA_ATTRIBUTE_MAPPINGS` | `DATA_ATTRIBUTE_MAPPINGS` |

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
2. In `packages/qti/roundtrip-export/src/index.ts`, add `{ source: '<schema-attr>', target: 'data-<schema-attr>' }` to the appropriate mapping list (`EDITOR_DATA_ATTRIBUTE_MAPPINGS` for shared, or the per-interaction list).
3. In `packages/qti/roundtrip-import/src/index.ts`, add the inverse `{ source: 'data-<schema-attr>', target: '<schema-attr>' }` to `DATA_ATTRIBUTE_MAPPINGS`.
4. Extend the roundtrip integration test in `packages/qti/roundtrip-export/src/index.roundtrip.test.ts` so a ProseMirror document with the attribute set survives export→import unchanged.
5. Add a row to the contract table above.

**All five steps in one commit.** Half-updates are exactly what this package's design is meant to prevent.

## What NOT to change

- Do not make the importer read `qti-response-declaration` / `qti-response-processing` as a source of authoring state. They exist for external QTI readers; treating them as input here would partially un-do the design.
- Do not add a `data-*` mapping in one package without its mirror in the other.
- Do not "generalize" these packages to handle third-party QTI input. Reserve that for a separate package.
- Do not rename the `data-*` keys without bumping both packages' major versions and migrating any persisted QTI packages.
