# The roundtrip QTI format

The editor saves and loads a QTI **item body**, not a whole assessment item. That body is the single
source of truth: everything the author has decided lives on the elements themselves, including things
QTI 3.0 has no attribute for — which answer is correct, what an interaction is worth.

Two formats, one document:

| | what it is | who reads it |
|---|---|---|
| **roundtrip** | the item body, with authoring attributes on the interactions | the editor |
| **QTI 3.0** | a complete `<qti-assessment-item>` with declarations and response processing | everyone else |

Export folds the authoring attributes into standard declarations and strips them. Import hoists them
back out. Both directions are idempotent, so feeding either format back through its own pipeline is a
no-op rather than an error.

## The authoring attributes

Each interaction declares which attributes are its own in `composer/metadata.ts`, as
`strippedAttributes` — named for what export does with them.

| attribute | on | recovered on import from |
|---|---|---|
| `correct-response` | all interactions except extended-text | `qti-correct-response` in the matching `qti-response-declaration` |
| `score` | every interaction | `qti-response-processing` (defaults to `1`) |
| `case-sensitive` | text-entry | **nothing — editor-only** |
| `area-mappings` | select-point | `qti-area-mapping` (see below) |

Extended-text has no `correct-response` because there is no correct answer to record; it carries
`score` alone.

### `correct-response`

One attribute, comma-separated, whatever the interaction's shape. A choice interaction writes
`"choice1,choice3"`; the pair-based interactions — match and gap-match — write
`"source target"` inside each entry and commas between them:
`"left_druk right_pascal,left_frequentie right_hertz"`. Keeping one spelling across every
interaction is what lets a single shared codec read and write them all.

On export it becomes `qti-correct-response` inside the response declaration, with the base type and
cardinality the interaction requires. On import the per-type transforms read it back.

### `score`

What a correct response is worth. Absent, it is `1`.

Recovering it on import is the fiddly half, because QTI expresses scoring as a *program* rather than
a number. `extractItemScore` reads `qti-response-processing` and:

- returns `1` when the item uses the standard `match_correct` template — that template is worth one
  mark by definition and carries no number to read;
- otherwise looks for a `qti-set-outcome-value identifier="SCORE"` and takes the first positive
  `qti-base-value`, whether it sits directly under it or inside a `qti-sum`;
- falls back to `1`.

So a hand-written item with unusual response processing imports at `1` rather than failing. That is
deliberate: a wrong score is visible and editable in the panel, an import error is not.

## Select-point is the exception

Every other interaction says "these are the right answers" with `qti-correct-response`. Select-point
says it with an **area mapping** — the correct answer is a region, not a value:

```xml
<qti-response-declaration identifier="RESPONSE" base-type="point" cardinality="single">
  <qti-area-mapping default-value="0">
    <qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/>
  </qti-area-mapping>
</qti-response-declaration>
```

Three consequences:

1. **The editor mirrors it as JSON.** `area-mappings` holds the entries as
   `[{"shape":"circle","coords":"191,393,10","mappedValue":1,"defaultValue":0}]`, because a
   comma-separated string cannot express a shape.
2. **`correct-response` is derived, not authored.** The runtime also wants a plain point list, so
   import computes one from the shape centres — the centre of a circle, the centre of a rect — when
   the source has no literal `qti-correct-response`.
3. **Scoring uses a different template**: `map_response_point` rather than `match_correct`, since the
   score comes from which region was hit.

Round-tripping is lossless in both directions: `area-mappings` composes back into
`qti-area-mapping`, and import reconstructs it from the same element.

`case-sensitive` on text-entry is the genuine loss. There is no standard QTI element that carries it,
so a third-party item that never had it imports without it. That is a documented one-way attribute,
not a bug to fix.

## Adding an authoring attribute

1. Add it to `strippedAttributes` in the interaction's `composer/metadata.ts`, so export strips it.
2. Read it in that interaction's `.compose.ts` and fold it into the response declaration — or into
   whatever element it belongs in.
3. Decide whether it survives a third-party round trip. If standard QTI can express it, teach the
   matching transform in `qti3-item-import/roundtrip-<name>/` to hoist it back. If it cannot, say so
   here, as `case-sensitive` does.

Step 3 is the one that gets skipped, and skipping it is silent: the attribute works perfectly until
someone opens an item the editor did not write.

## Related

- [Node API](./node-api.md) — running this conversion outside a browser
- The published docs site carries a longer version of this page, with the composer internals:
  [qti-editor.citolab.nl](https://qti-editor.citolab.nl/)
