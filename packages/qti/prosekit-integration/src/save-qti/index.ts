/**
 * Save QTI — prosekit wrapper
 *
 * Thin wrapper around @qti-editor/qti-roundtrip-export/pm-qti that injects
 * prosekit's ListDOMSerializer for list-aware serialization.
 */

import { ListDOMSerializer } from 'prosekit/extensions/list';
import {
  qtiFromNode as qtiFromNodePure,
  countQtiItems as countQtiItemsPure,
  getQtiItems as getQtiItemsPure,
  type QtiComposeContext,
  type QtiComposeMode,
  type QtiItemFragment,
} from '@qti-editor/qti-roundtrip-export/pm-qti';

import type { ProseMirrorNode } from 'prosekit/pm/model';


export type { QtiComposeContext, QtiComposeMode, QtiItemFragment };

export function qtiFromNode(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
  mode: QtiComposeMode = 'multiple',
): string {
  return qtiFromNodePure(node, context, mode, ListDOMSerializer.fromSchema(node.type.schema));
}

export function countQtiItems(node: ProseMirrorNode): number {
  return countQtiItemsPure(node, ListDOMSerializer.fromSchema(node.type.schema));
}

export function getQtiItems(node: ProseMirrorNode, context?: QtiComposeContext): QtiItemFragment[] {
  return getQtiItemsPure(node, context, ListDOMSerializer.fromSchema(node.type.schema));
}
