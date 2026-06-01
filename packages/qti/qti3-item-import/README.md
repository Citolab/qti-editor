# @qti-editor/qti3-item-import

Transform standard QTI 3.0 items into the editor's roundtrip-format by hoisting
`correct-response` and `score` onto the matching interaction element. Output is
then importable by the editor's `parseDOM` path.

```ts
import { qtiTransformItem } from '@qti-components/transformers';
import { roundtripChoice, roundtripTextEntry, roundtripExtendedText } from '@qti-editor/qti3-item-import';

const editorReady = qtiTransformItem()
  .parse(thirdPartyQti3Xml)
  .fn(roundtripChoice)
  .fn(roundtripTextEntry)
  .fn(roundtripExtendedText)
  .xml();
```

Or via the convenience wrapper:

```ts
import { roundtripQtiItem } from '@qti-editor/qti3-item-import';
const editorReady = roundtripQtiItem(thirdPartyQti3Xml);
```

## Scope (v1)

Each transform runs only if the item contains exactly **one** matching interaction
(`qti-choice-interaction`, `qti-text-entry-interaction`, `qti-extended-text-interaction`).
Multi-interaction items pass through untouched. See
[plans/qti3-item-import.md](../../../plans/qti3-item-import.md) for the full
contract, and
[apps/site/src/content/docs/packages/itembody-subformat.mdx](../../../apps/site/src/content/docs/packages/itembody-subformat.mdx)
for the roundtrip-format spec.
