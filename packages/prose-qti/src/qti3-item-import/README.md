# @citolab/prose-qti/qti3-item-import

Transform standard QTI 3.0 items into the editor's roundtrip-format by hoisting
`correct-response` and `score` onto the matching interaction element. Output is
then importable by the editor's `parseDOM` path.

```ts
import { qtiTransformItem } from '@qti-components/transformers';
import { roundtripChoice, roundtripTextEntry, roundtripExtendedText, roundtripMatch } from '@citolab/prose-qti/qti3-item-import';

const editorReady = qtiTransformItem()
  .parse(thirdPartyQti3Xml)
  .fn(roundtripChoice)
  .fn(roundtripTextEntry)
  .fn(roundtripExtendedText)
  .fn(roundtripMatch)
  .xml();
```

Or via the convenience wrapper:

```ts
import { roundtripQtiItem } from '@citolab/prose-qti/qti3-item-import';
const editorReady = roundtripQtiItem(thirdPartyQti3Xml);
```

## Scope

`roundtripQtiItem` runs every per-type transform (`roundtripChoice`,
`roundtripTextEntry`, `roundtripExtendedText`, `roundtripAssociate`,
`roundtripMatch`, `roundtripGapMatch`, `roundtripOrder`,
`roundtripSelectPoint`, `roundtripInteractions`, `roundtripItemBody`)
followed by `reduceToItemBody`. All transforms are idempotent and
independent — order doesn't affect correctness, only which source wins when
an attribute is expressed more than one way.

Each transform except `roundtripAssociate` is also exported individually from
this barrel (`roundtripChoice`, `roundtripTextEntry`, `roundtripExtendedText`,
`roundtripMatch`, `roundtripGapMatch`, `roundtripOrder`,
`roundtripSelectPoint`, `roundtripInteractions`, `roundtripItemBody`,
`reduceToItemBody`) for callers that need to run a subset;
`roundtripAssociate` is currently only reachable via `roundtripQtiItem`.

`roundtripMatch` converts the standard `directedPair` correct response
(`<qti-value>SOURCE TARGET</qti-value>`) into the same shape `qti-components`
uses internally: a JSON array of space-separated `source target` strings
(`["SOURCE TARGET", ...]`) that `qti-match-interaction` round-trips. Because
that format differs from the generic comma-joined hoist, `qti-match-interaction`
is excluded from the generic `roundtripInteractions` fallback.

See
[apps/site/src/content/docs/packages/qti3-item-import.mdx](../../../../apps/site/src/content/docs/packages/qti3-item-import.mdx)
for the public-facing overview, and
[apps/site/src/content/docs/packages/itembody-subformat.mdx](../../../../apps/site/src/content/docs/packages/itembody-subformat.mdx)
for the roundtrip-format spec.
