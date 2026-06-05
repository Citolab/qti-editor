/**
 * Save QTI test — prosekit wrapper.
 */
import {
  qtiTestFromProsemirror as qtiTestFromProsemirrorPure,
  countQtiItems as countQtiItemsPure,
  getQtiItems as getQtiItemsPure,
  type QtiItemFragment,
} from '@qti-editor/qti-test-export/pm-qti-test';
import { type QtiComposeContext } from '@qti-editor/qti-item-export/pm-qti-item';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export type { QtiComposeContext, QtiItemFragment };

export function qtiTestFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): string {
  return qtiTestFromProsemirrorPure(node, context);
}

export function countQtiItems(node: ProseMirrorNode): number {
  return countQtiItemsPure(node);
}

export function getQtiItems(node: ProseMirrorNode, context?: QtiComposeContext): QtiItemFragment[] {
  return getQtiItemsPure(node, context);
}
