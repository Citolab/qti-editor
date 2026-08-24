/**
 * Locks the first three top-level children of the document to be, in order:
 *   1. heading (level 1)  — title
 *   2. paragraph          — subtitle
 *   3. qtiItemDivider
 *
 * Their content remains editable (text in title/subtitle, attrs on the divider),
 * but they cannot be removed, replaced, or reordered. Everything below is
 * free-form `block*` content.
 *
 * Pattern adapted from `qtiLayoutDivLockPlugin` in @citolab/prose-qti's schema/qti-layout-div.ts:
 * a `filterTransaction` that rejects any transaction which would change the locked prefix.
 */

import { defineNodeSpec, definePlugin, union, type Extension, type NodeJSON } from 'prosekit/core';
import { Plugin } from 'prosekit/pm/state';

import type { Node as ProseMirrorNode } from 'prosekit/pm/model';

const LOCKED_TYPES = ['heading', 'paragraph', 'qtiItemDivider'] as const;

function hasLockedPrefix(doc: ProseMirrorNode): boolean {
  if (doc.childCount < LOCKED_TYPES.length) return false;
  for (let i = 0; i < LOCKED_TYPES.length; i++) {
    const child = doc.child(i);
    if (child.type.name !== LOCKED_TYPES[i]) return false;
  }
  if (doc.child(0).attrs.level !== 1) return false;
  return true;
}

const lockPlugin = new Plugin({
  filterTransaction(tr, _state) {
    if (!tr.docChanged) return true;
    return hasLockedPrefix(tr.doc);
  },
});

export function defineLockedHeaderExtension(): Extension {
  return union(
    defineNodeSpec({
      name: 'doc',
      topNode: true,
      content: 'heading paragraph qtiItemDivider block*',
      /*
       * Without this there is no gap cursor anywhere in the document, and the collapsed space
       * between two adjacent interactions is unreachable — nothing can be typed between them.
       *
       * prosemirror-gapcursor only guesses. `GapCursor.valid` first checks that the neighbours are
       * closed, which every QTI interaction is (they are `isolating`), and then asks whether a
       * textblock could go here by reading `contentMatchAt(index).defaultType.isTextblock`.
       * `defaultType` is the first type the content expression admits that has no required
       * attributes — and in `block*` that is `qtiItemDivider`, whose two attributes both default.
       * A divider is not a textblock, so the guess comes back no, at every position.
       *
       * The guess is simply wrong here: `paragraph` is in `block`, so a textblock demonstrably can
       * go at any of those positions. `allowGapCursor` is the override the library provides for
       * exactly this, and it short-circuits the heuristic rather than fighting it.
       *
       * The alternative — giving `qtiItemDivider` a required attribute so it stops winning
       * `defaultType` — would move a load-bearing default that `createAndFill` and every
       * auto-insertion path also read, to fix a cursor. Not worth it.
       *
       * Tables are deliberately NOT given this: `table` defaults to `tableRow` and `tableRow` to
       * `tableCell`, and there the heuristic is right, because no textblock may sit between two
       * rows or two cells. Those denials are correct and stay.
       */
      allowGapCursor: true,
    }),
    definePlugin(() => lockPlugin),
  );
}

export const LOCKED_HEADER_DEFAULT_CONTENT: NodeJSON = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [] },
    { type: 'paragraph', content: [] },
    { type: 'qtiItemDivider', attrs: { title: '', identifier: '' } },
    { type: 'paragraph', content: [] },
  ],
};

function hasJsonLockedPrefix(doc: NodeJSON): boolean {
  const children = doc.content ?? [];
  if (children.length < LOCKED_TYPES.length) return false;
  for (let i = 0; i < LOCKED_TYPES.length; i++) {
    if (children[i]?.type !== LOCKED_TYPES[i]) return false;
  }
  if (children[0]?.attrs?.level !== 1) return false;
  return true;
}

function removeAdjacentItemDividersAfterLockedPrefix(content: NodeJSON[]): NodeJSON[] {
  const normalized = [...content];
  while (normalized[LOCKED_TYPES.length]?.type === 'qtiItemDivider') {
    normalized.splice(LOCKED_TYPES.length, 1);
  }
  return normalized;
}

/**
 * One-shot migration for documents persisted before this extension existed.
 * If the doc doesn't already start with the locked trio, prepend it so the
 * existing user content is preserved verbatim *below* the new header.
 */
export function ensureLockedHeader(doc: NodeJSON | undefined): NodeJSON {
  if (!doc || doc.type !== 'doc') return LOCKED_HEADER_DEFAULT_CONTENT;
  if (hasJsonLockedPrefix(doc)) {
    const content = doc.content ?? [];
    const normalizedContent = removeAdjacentItemDividersAfterLockedPrefix(content);
    if (normalizedContent.length === content.length) return doc;
    return {
      ...doc,
      content: normalizedContent,
    };
  }
  const existing = doc.content ?? [];
  const seeded = LOCKED_HEADER_DEFAULT_CONTENT.content ?? [];
  return {
    ...doc,
    content: removeAdjacentItemDividersAfterLockedPrefix([...seeded.slice(0, 3), ...existing]),
  };
}
