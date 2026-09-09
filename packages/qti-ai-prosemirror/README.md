# @citolab/qti-ai-prosemirror

The ProseMirror side of conversational QTI authoring: capability collection from the host schema,
snapshot-scoped targets, typed operation validation, and one atomic transaction per proposal.

```ts
import {
  createAuthoringPlugin,
  captureAuthoringContext,
  prepareProposal,
  acceptProposal,
  discardProposal
} from '@citolab/qti-ai-prosemirror';
// ProseKit hosts:
import { defineQtiAi } from '@citolab/qti-ai-prosemirror/prosekit';
```

Flow:

1. Install `createAuthoringPlugin()` (or `defineQtiAi()`), once.
2. `captureAuthoringContext(view)` before each request. It records a snapshot keyed by a fresh
   `requestId`, and returns the effective capabilities (`createCapabilities`), the document HTML,
   and stable target ids with node type, attributes, text and selection state. Send it to the agent.
3. `prepareProposal(view, reply)` validates the reply against the snapshot and the current
   document without dispatching. Stale targets, changed capabilities, unknown attributes, unknown
   vocabulary options, unsafe or unsupported HTML, and invalid response/scoring combinations throw.
4. `acceptProposal(view, prepared)` rebuilds and dispatches one transaction. Author edits made in
   the meantime are preserved because target positions are mapped through every transaction.
   `discardProposal(view, requestId)` settles it without touching the document.

Nothing is applied until acceptance, so rejection never restores an earlier document.

## Structural operations

- `remove` deletes one node. When it sits inside an interaction (a distractor, a gap, a hottext),
  the interaction's `correctResponse` is remapped: entries and pairs that named the removed
  identifier are dropped, and an emptied answer key becomes `null` rather than a dangling reference.
- `convert` replaces one interaction with another type. The model supplies the new interaction as
  HTML; the code insists on exactly one node of the requested type, keeps the item's
  `responseIdentifier` (and the score unless the HTML sets one), and validates the answer key for
  the new type: single identifiers for choice and hottext, one for inline choice, a full permutation
  for order, `"source target"` pairs for match and gap match.

`validateResponses(doc)` is the shared invariant check and is exported for hosts.

## Effective manifest

`createCapabilities(schema, options)` derives the host's manifest (version 2) by annotating the
actual schema with the versioned baseline in `baseline.ts`:

- Every attribute gets an explicit `type` (`string`, `integer`, `number`, `boolean`, `response`,
  `enum`), `nullable`, `min`/`values` where relevant, an `editable` flag, and EN/NL descriptions.
  Types are never inferred from a `null` default alone.
- The HTML attribute name is found by probing the node's `toDOM`, so `imageSrc → src` and
  `dataPrompt → data-prompt` come out right; the baseline name is only a fallback.
- Vocabulary groups are mutually exclusive class tokens per node type (`vocabularyBaseline`):
  selecting an option replaces the group's other tokens and preserves unrelated classes; `null`
  clears the group. Each group states its `support.rendering` (`components` when the pinned
  `@qti-components` packages style it, otherwise `unverified`) and `support.export`.
- The `id` fingerprints the whole manifest, so a host with a different schema, vocabulary or
  attribute filter gets a different id and stale proposals are refused.

Hosts customize through `AuthoringOptions`: `vocabulary` (per node, `[]` disables), `annotations`
(per attribute), `allowAttribute` and a `validateDocument` veto. `docs/ai-support-matrix.md` in
the repository is generated from this manifest (`pnpm ai:matrix`).
