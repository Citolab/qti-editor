/**
 * Save QTI test — prosekit wrapper.
 * Injects ListDOMSerializer for list-aware serialization.
 */
import { ListDOMSerializer } from 'prosekit/extensions/list';
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
  return qtiTestFromProsemirrorPure(
    node,
    context,
    ListDOMSerializer.fromSchema(node.type.schema),
  );
}

export function countQtiItems(node: ProseMirrorNode): number {
  return countQtiItemsPure(node, ListDOMSerializer.fromSchema(node.type.schema));
}

export function getQtiItems(node: ProseMirrorNode, context?: QtiComposeContext): QtiItemFragment[] {
  return getQtiItemsPure(node, context, ListDOMSerializer.fromSchema(node.type.schema));
}
