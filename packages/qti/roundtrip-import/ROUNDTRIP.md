# Lossless ProseMirror ↔ QTI Roundtrip

The canonical conceptual reference lives in the architecture doc:
[Roundtrip-QTI Format](../../../docs/architecture.md#roundtrip-qti-format) and
[Lossless QTI Roundtrip Packages](../../../docs/architecture.md#lossless-qti-roundtrip-packages).

Both the export (`@qti-editor/qti-item-export`) and this import package are
paired. **Do not change the `DATA_ATTRIBUTE_MAPPINGS` table in `src/index.ts`
without updating the sibling export path and the contract table in the
architecture doc.**
