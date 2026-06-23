import { defineAiDiff, createStreamingPlugin } from '@citolab/prose-ai';
import { definePlugin, union } from 'prosekit/core';
import { CommitRecorder, defineCommitRecorder } from 'prosekit/extensions/commit';

// One recorder per editor instance. The ai-check toolbar resets it before each
// AI invocation and reads the resulting `Commit` afterward to render the diff.
export const commitRecorder = new CommitRecorder();

export function defineAiExtension() {
  return union(
    defineCommitRecorder(commitRecorder),
    defineAiDiff(),
    definePlugin(createStreamingPlugin())
  );
}

export type AiExtension = ReturnType<typeof defineAiExtension>;
