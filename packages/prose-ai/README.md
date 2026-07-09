# @citolab/prose-ai

AI-related extensions for ProseKit, vendored from `@prosekit/ai`. Private,
app-only package — not published to npm.

Provides three independent pieces: an AI-diff extension (track-changes-style
accept/reject UI for AI-produced edits), HTML/ProseMirror bridging helpers,
and a streaming-content command that incrementally parses and inserts HTML
into the document as it arrives.

## Why vendored

`@prosekit/ai` isn't consumed as a dependency because the installed
`prosekit`/`@prosekit/extensions` version (0.17.3) doesn't yet export the
`Commit` diffing helpers this package needs (`getChanges`, `decorateDeletion`
in `src/commit-helpers.ts` are inlined from upstream `@prosekit/extensions`
for this reason). Vendoring also lets this package depend directly on
`prosemirror-changeset` without waiting on an upstream release.

## Installation

Workspace-internal only:

```ts
import { defineAiDiff, createStreamingPlugin } from '@citolab/prose-ai';
```

Peer dependency: `prosekit` (`^0.21.3`). Also depends on `prosemirror-changeset`.

## `ai-diff`

```ts
import { defineAiDiff } from '@citolab/prose-ai';
import { defineCommitRecorder, CommitRecorder } from 'prosekit/extensions/commit';
import { union } from 'prosekit/core';

const commitRecorder = new CommitRecorder();
const extension = union(defineCommitRecorder(commitRecorder), defineAiDiff());
```

`defineAiDiff()` registers a ProseMirror plugin plus five commands for
rendering an AI-produced `Commit` (from `prosekit/extensions/commit`) as a
per-fragment diff, and resolving it fragment-by-fragment or all at once:

- `addAiDiff(commit, options?)` — hydrate a `Commit` into decorations
  (insertions tagged `.prosekit-commit-addition`, deletions rendered as
  widget decorations tagged `.prosekit-commit-deletion`), word-boundary
  expanded so partial-word diffs read cleanly. `options.id` sets a custom
  diff id; otherwise one is generated.
- `acceptAiDiff(id?)` — drop the diff's decorations, keeping the new content.
  Omit `id` to accept every active diff.
- `rejectAiDiff(id?)` — revert the diff's fragments back to the original
  content and drop its decorations. Omit `id` to reject every active diff.
- `acceptAiDiffFragment(id, changeIndex)` / `rejectAiDiffFragment(id, changeIndex)`
  — accept or revert a single changed fragment within a diff, leaving the
  rest of that diff active.

Each fragment carries `data-ai-diff-id` / `data-ai-diff-change-index`
attributes (`AI_DIFF_ID_ATTR` / `AI_DIFF_CHANGE_INDEX_ATTR`) so host UI (e.g.
a popover anchored to a decoration) can target and resolve individual
changes. All diff/accept/reject transactions are excluded from undo history
(`addToHistory: false`) except the initial reject-all replace.

## `html-bridge`

```ts
import { serializeDocToHtml, serializeSelectionToHtml, parseHtmlToDoc, parseHtmlToSlice } from '@citolab/prose-ai';
```

Thin wrappers around ProseKit's `DOMSerializer`/`DOMParser` for round-tripping
HTML with an AI service:

- `serializeDocToHtml(editor)` / `serializeRangeToHtml(editor, from, to)` /
  `serializeSelectionToHtml(editor)` — serialize the whole document, a
  position range, or the current selection to an HTML string (the selection
  variant returns `undefined` for a collapsed selection).
- `parseHtmlToDoc(editor, html)` — parse an HTML string into a full
  ProseMirror doc node.
- `parseHtmlToSlice(editor, html, context?)` — parse an HTML string into a
  `Slice`. Pass a `ResolvedPos` as `context` when inserting block-level HTML
  into an inline range, so ProseMirror can compute `openStart`/`openEnd`
  correctly.

## `stream-content-command`

```ts
import { streamContentCommand, createStreamingPlugin } from '@citolab/prose-ai';
import { definePlugin } from 'prosekit/core';

const extension = definePlugin(createStreamingPlugin());

editor.commands.call(
  streamContentCommand({
    from,
    to,
    onStream: async write => {
      for await (const chunk of aiResponseStream) write(chunk);
    },
  })
);
```

`createStreamingPlugin()` registers plugin state (keyed by `streamingPluginKey`)
that tracks in-flight streaming ranges, renders them with an `.is-streaming`
decoration, and makes the editor read-only inside an active range (so the
user can't type into text that's still arriving).

`streamContentCommand(options)` / `streamContent(view, options)` drive a
streaming HTML insertion into `[from, to)`:

- Buffers incoming HTML from `onStream`'s `write(chunk)` callback and only
  flushes (parses + replaces into the doc) at a safe boundary — after a
  closing tag from `DEFAULT_FLUSH_TAGS` (block-level tags: `p`, `li`,
  headings, `table`/`thead`/`tbody`/`tfoot`, etc.), so partially-streamed
  markup never gets parsed mid-tag. Pass `extraFlushTags` to recognize
  additional closing tags as flush points.
- On completion (or `signal` abort), trims any trailing partial tag and does
  a final flush, then clears the streaming range.
- `options.signal` (`AbortSignal`) cancels the stream; an aborted stream
  finalizes cleanly rather than throwing into the caller.
- All streaming transactions are excluded from undo history.

## Consumer

`apps/qti-prosekit-item/src/extensions/ai-extension.ts` shows the intended
composition: one `CommitRecorder` per editor instance, combined with
`defineAiDiff()` and `createStreamingPlugin()` in a single `union(...)`
extension, consumed by the app's `ai-chat`, `ai-check`, `ai-create`, and
`ai-stream-content` toolbar components.
