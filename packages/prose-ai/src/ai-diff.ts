/**
 * AI diff extension — render an AI-produced `Commit` as a per-fragment
 * track-changes diff with accept / reject commands. Vendored from @prosekit/ai.
 */

import {
  defineCommands,
  definePlugin,
  union,
  type Extension,
} from 'prosekit/core';
import type { Commit } from 'prosekit/extensions/commit';
import { decorateDeletion, getChanges } from './commit-helpers';
import type { Node as ProseMirrorNode, Schema } from 'prosekit/pm/model';
import {
  PluginKey,
  ProseMirrorPlugin,
  type Command,
} from 'prosekit/pm/state';
import { Step } from 'prosekit/pm/transform';
import { Decoration, DecorationSet } from 'prosekit/pm/view';
import { simplifyChanges } from 'prosemirror-changeset';

interface CheckFragment {
  index: number;
  fromA: number;
  toA: number;
  fromB: number;
  toB: number;
}

interface ActiveDiff {
  id: string;
  commit: Commit;
  parentNode: ProseMirrorNode;
  parsedSteps: Step[];
  fragments: CheckFragment[];
}

export interface AiDiffState {
  diffs: ActiveDiff[];
  decorations: DecorationSet;
}

export interface AddAiDiffOptions {
  id?: string;
}

export type AiDiffExtension = Extension<{
  Commands: {
    addAiDiff: [commit: Commit, options?: AddAiDiffOptions];
    acceptAiDiff: [id?: string];
    rejectAiDiff: [id?: string];
    acceptAiDiffFragment: [id: string, changeIndex: number];
    rejectAiDiffFragment: [id: string, changeIndex: number];
  };
}>;

type AiDiffMeta =
  | { type: 'add'; diff: ActiveDiff }
  | { type: 'remove'; id: string }
  | { type: 'clear' }
  | { type: 'removeFragment'; id: string; changeIndex: number };

export const aiDiffPluginKey: PluginKey<AiDiffState> = new PluginKey<AiDiffState>(
  'prosekit-ai-diff'
);

export const AI_DIFF_ID_ATTR = 'data-ai-diff-id';
export const AI_DIFF_CHANGE_INDEX_ATTR = 'data-ai-diff-change-index';

function randomId(): string {
  return `ai-diff-${Math.random().toString(36).slice(2, 10)}`;
}

function decorateAdditionTagged(
  from: number,
  to: number,
  diffId: string,
  changeIndex: number
): Decoration {
  return Decoration.inline(from, to, {
    class: 'prosekit-commit-addition',
    [AI_DIFF_ID_ATTR]: diffId,
    [AI_DIFF_CHANGE_INDEX_ATTR]: String(changeIndex),
  });
}

function buildFragmentDecorations(diff: ActiveDiff): Decoration[] {
  const decorations: Decoration[] = [];
  for (const fragment of diff.fragments) {
    if (fragment.fromA < fragment.toA) {
      decorations.push(
        ...decorateDeletion(
          diff.parentNode,
          fragment.fromA,
          fragment.toA,
          fragment.fromB,
          {
            [AI_DIFF_ID_ATTR]: diff.id,
            [AI_DIFF_CHANGE_INDEX_ATTR]: String(fragment.index),
          }
        )
      );
    }
    if (fragment.fromB < fragment.toB) {
      decorations.push(
        decorateAdditionTagged(fragment.fromB, fragment.toB, diff.id, fragment.index)
      );
    }
  }
  return decorations;
}

function rebuildDecorations(
  diffs: readonly ActiveDiff[],
  doc: ProseMirrorNode
): DecorationSet {
  if (diffs.length === 0) return DecorationSet.empty;
  const all = diffs.flatMap(buildFragmentDecorations);
  return DecorationSet.create(doc, all);
}

const WORD_CHAR = /[\p{L}\p{N}]/u;

function isWordChar(node: ProseMirrorNode, pos: number): boolean {
  const ch = node.textBetween(pos, pos + 1, ' ', ' ');
  return !!ch && WORD_CHAR.test(ch);
}

function expandLeftToWord(node: ProseMirrorNode, pos: number): number {
  while (pos > 0 && isWordChar(node, pos - 1)) pos--;
  return pos;
}

function expandRightToWord(node: ProseMirrorNode, pos: number, max: number): number {
  while (pos < max && isWordChar(node, pos)) pos++;
  return pos;
}

function hydrate(
  commit: Commit,
  schema: Schema,
  doc: ProseMirrorNode,
  id: string
): ActiveDiff {
  const parentNode = schema.nodeFromJSON(commit.parent);
  const parsedSteps = commit.steps.map(step => Step.fromJSON(schema, step));
  const changes = getChanges(doc, parentNode, parsedSteps);
  const simplified = simplifyChanges(changes, doc);
  const parentMax = parentNode.content.size;
  const docMax = doc.content.size;
  const fragments: CheckFragment[] = simplified.map((change, index) => ({
    index,
    fromA: expandLeftToWord(parentNode, change.fromA),
    toA: expandRightToWord(parentNode, change.toA, parentMax),
    fromB: expandLeftToWord(doc, change.fromB),
    toB: expandRightToWord(doc, change.toB, docMax),
  }));
  return { id, commit, parentNode, parsedSteps, fragments };
}

function mapDiffsForward(
  diffs: readonly ActiveDiff[],
  tr: { mapping: { map(pos: number, assoc?: number): number } }
): ActiveDiff[] {
  return diffs.map(diff => ({
    ...diff,
    fragments: diff.fragments
      .map(f => ({
        ...f,
        fromB: tr.mapping.map(f.fromB, 1),
        toB: tr.mapping.map(f.toB, -1),
      }))
      .filter(f => f.fromB <= f.toB),
  }));
}

const aiDiffPluginExtension = definePlugin((): ProseMirrorPlugin => {
  return new ProseMirrorPlugin<AiDiffState>({
    key: aiDiffPluginKey,
    state: {
      init: (): AiDiffState => ({
        diffs: [],
        decorations: DecorationSet.empty,
      }),
      apply: (tr, prev, _oldState, newState): AiDiffState => {
        const meta = tr.getMeta(aiDiffPluginKey) as AiDiffMeta | undefined;
        let diffs = prev.diffs;

        if (tr.docChanged) {
          diffs = mapDiffsForward(diffs, tr);
        }

        if (meta) {
          if (meta.type === 'add') {
            diffs = [...diffs, meta.diff];
          } else if (meta.type === 'remove') {
            diffs = diffs.filter(d => d.id !== meta.id);
          } else if (meta.type === 'clear') {
            diffs = [];
          } else if (meta.type === 'removeFragment') {
            diffs = diffs
              .map((d): ActiveDiff | null => {
                if (d.id !== meta.id) return d;
                const fragments = d.fragments.filter(f => f.index !== meta.changeIndex);
                if (fragments.length === 0) return null;
                return { ...d, fragments };
              })
              .filter((d): d is ActiveDiff => d !== null);
          }
        }

        if (!meta && !tr.docChanged) return prev;

        return {
          diffs,
          decorations: rebuildDecorations(diffs, newState.doc),
        };
      },
    },
    props: {
      decorations: (state): DecorationSet | undefined => {
        return aiDiffPluginKey.getState(state)?.decorations;
      },
    },
  });
});

function addAiDiffCommand(commit: Commit, options?: AddAiDiffOptions): Command {
  return (state, dispatch) => {
    const id = options?.id ?? randomId();
    if (dispatch) {
      const diff = hydrate(commit, state.schema, state.doc, id);
      const tr = state.tr.setMeta(aiDiffPluginKey, {
        type: 'add',
        diff,
      } satisfies AiDiffMeta);
      tr.setMeta('addToHistory', false);
      dispatch(tr);
    }
    return true;
  };
}

function acceptAiDiffCommand(id?: string): Command {
  return (state, dispatch) => {
    const pluginState = aiDiffPluginKey.getState(state);
    if (!pluginState || pluginState.diffs.length === 0) return false;
    if (id && !pluginState.diffs.some(d => d.id === id)) return false;
    if (dispatch) {
      const meta: AiDiffMeta = id ? { type: 'remove', id } : { type: 'clear' };
      const tr = state.tr.setMeta(aiDiffPluginKey, meta);
      tr.setMeta('addToHistory', false);
      dispatch(tr);
    }
    return true;
  };
}

function rejectAiDiffCommand(id?: string): Command {
  return (state, dispatch) => {
    const pluginState = aiDiffPluginKey.getState(state);
    if (!pluginState || pluginState.diffs.length === 0) return false;

    const toRevert = id ? pluginState.diffs.filter(d => d.id === id) : pluginState.diffs;
    if (toRevert.length === 0) return false;

    if (dispatch) {
      const tr = state.tr;
      for (const diff of [...toRevert].reverse()) {
        const sorted = [...diff.fragments].sort((a, b) => b.fromB - a.fromB);
        for (const f of sorted) {
          const originalSlice = diff.parentNode.slice(f.fromA, f.toA);
          tr.replaceRange(f.fromB, f.toB, originalSlice);
        }
      }
      const meta: AiDiffMeta = id ? { type: 'remove', id } : { type: 'clear' };
      tr.setMeta(aiDiffPluginKey, meta);
      dispatch(tr);
    }
    return true;
  };
}

function acceptAiDiffFragmentCommand(id: string, changeIndex: number): Command {
  return (state, dispatch) => {
    const pluginState = aiDiffPluginKey.getState(state);
    const diff = pluginState?.diffs.find(d => d.id === id);
    if (!diff || !diff.fragments.some(f => f.index === changeIndex)) return false;
    if (dispatch) {
      const tr = state.tr.setMeta(aiDiffPluginKey, {
        type: 'removeFragment',
        id,
        changeIndex,
      } satisfies AiDiffMeta);
      tr.setMeta('addToHistory', false);
      dispatch(tr);
    }
    return true;
  };
}

function rejectAiDiffFragmentCommand(id: string, changeIndex: number): Command {
  return (state, dispatch) => {
    const pluginState = aiDiffPluginKey.getState(state);
    const diff = pluginState?.diffs.find(d => d.id === id);
    if (!diff) return false;
    const fragment = diff.fragments.find(f => f.index === changeIndex);
    if (!fragment) return false;

    if (dispatch) {
      const tr = state.tr;
      const originalSlice = diff.parentNode.slice(fragment.fromA, fragment.toA);
      tr.replaceRange(fragment.fromB, fragment.toB, originalSlice);
      tr.setMeta(aiDiffPluginKey, {
        type: 'removeFragment',
        id,
        changeIndex,
      } satisfies AiDiffMeta);
      dispatch(tr);
    }
    return true;
  };
}

export function defineAiDiff(): AiDiffExtension {
  return union(
    aiDiffPluginExtension,
    defineCommands({
      addAiDiff: addAiDiffCommand,
      acceptAiDiff: acceptAiDiffCommand,
      rejectAiDiff: rejectAiDiffCommand,
      acceptAiDiffFragment: acceptAiDiffFragmentCommand,
      rejectAiDiffFragment: rejectAiDiffFragmentCommand,
    })
  ) as AiDiffExtension;
}
