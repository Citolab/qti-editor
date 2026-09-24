import { clearFormattingInRange } from '@citolab/prose-extensions/clear-formatting';

import { listInteractionDescriptors } from '@citolab/prose-qti/core/interactions/composer';

import type { Node as ProseMirrorNode, Schema } from 'prosemirror-model';
import type { Command } from 'prosemirror-state';

type SelectionRange = { from: number; to: number };

function getInteractionTypeNames(schema: Schema): Set<string> {
  const names = new Set<string>();
  for (const descriptor of listInteractionDescriptors()) {
    if (schema.nodes[descriptor.nodeTypeName]) names.add(descriptor.nodeTypeName);
  }
  return names;
}

/**
 * Splits [from, to] into the maximal sub-ranges that never contain, at any
 * depth, a node whose type is a registered QTI interaction (including
 * `qtiRubricBlock`). "Opmaak wissen" leaves interaction subtrees completely
 * untouched — their content is authored through their own dedicated UI, not
 * through a generic formatting command, and interaction nodes are not
 * reliably distinguishable from plain content by schema `group` alone (see
 * the schema notes in `create-qti-schema.ts`).
 */
function collectSafeRanges(
  doc: ProseMirrorNode,
  from: number,
  to: number,
  interactionTypeNames: Set<string>,
): SelectionRange[] {
  const ranges: SelectionRange[] = [];
  let segmentStart: number | null = null;

  const closeSegment = (end: number) => {
    if (segmentStart != null && end > segmentStart) {
      ranges.push({ from: segmentStart, to: end });
    }
    segmentStart = null;
  };

  doc.nodesBetween(from, to, (node, pos) => {
    if (interactionTypeNames.has(node.type.name)) {
      closeSegment(Math.max(from, pos));
      return false; // don't descend into the interaction
    }
    if (segmentStart == null) segmentStart = Math.max(from, pos);
    return true;
  });
  closeSegment(to);

  return ranges;
}

/**
 * resets the selection back to plain paragraphs: every mark
 * is stripped, headings/blockquotes/lists collapse to paragraphs, and any
 * interaction the selection happens to span is skipped over rather than
 * touched. A no-op (returns `false`) on an empty selection or one that is
 * entirely inside/around interaction nodes.
 */
export function clearFormatting(): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection;
    if (from === to) return false;

    const interactionTypeNames = getInteractionTypeNames(state.schema);
    const ranges = collectSafeRanges(state.doc, from, to, interactionTypeNames);
    if (ranges.length === 0) return false;

    const tr = state.tr;
    let changed = false;

    // Reverse order: a range's own edits stay within its (mapped) bounds, so
    // processing the highest-position range first means edits there can never
    // invalidate the still-unprocessed, lower-position ranges before them.
    for (let i = ranges.length - 1; i >= 0; i -= 1) {
      const range = ranges[i];
      const mappedFrom = tr.mapping.map(range.from, 1);
      const mappedTo = tr.mapping.map(range.to, -1);
      if (clearFormattingInRange(tr, { from: mappedFrom, to: mappedTo })) {
        changed = true;
      }
    }

    if (!changed) return false;
    if (dispatch) dispatch(tr);
    return true;
  };
}
