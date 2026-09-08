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

Vocabulary groups (`defaultVocabulary`) are mutually exclusive class tokens: selecting an option
replaces the group's other tokens and preserves unrelated classes. Hosts can pass their own
`vocabulary`, an `allowAttribute` filter and a `validateDocument` veto through `AuthoringOptions`.
