# @citolab/qti-ai-core

Provider-independent contracts for conversational QTI authoring. No DOM, no ProseMirror, no
provider SDK: the package describes conversations, not the QTI schema.

- `AuthoringReply` (`version: 1`): the structured envelope an agent returns — `requestId`,
  `capabilityId`, `summary`, `operations`, `suggestions`, optional `clarification`.
- `Operation`: `setAttributes`, `setVocabulary`, `insert`, `replace`, always aimed at a target id
  handed out by the host.
- `parseAuthoringReply(value)`: runtime validation of untrusted model output with structured
  errors. Bounds sizes, rejects unknown operation kinds and clarifications that carry edits.
- `readAuthoringStream(raw, complete)`: compatibility adapter for text-only transports that carry
  the envelope in a fenced ` ```qti-authoring ` block. The prose it returns never contains any part
  of the fence, at any streaming boundary.
- `ConversationEvent` / `ConversationTransport`: the discriminated event union a provider adapter
  translates into (text, reply, status, complete, cancelled, error).
- `fingerprint(value)`: non-cryptographic identity for a serialized capability manifest.

Pair it with `@citolab/qti-ai-prosemirror` for target capture and atomic application, and with
`@citolab/qti-ai-ui` for optional Lit review controls.
