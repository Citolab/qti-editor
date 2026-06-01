/**
 * Save QTI item — prosekit wrapper.
 * Injects ListDOMSerializer for list-aware serialization.
 */
import { ListDOMSerializer } from 'prosekit/extensions/list';
import {
  qtiItemFromProsemirror as qtiItemFromProsemirrorPure,
  type QtiComposeContext,
} from '@qti-editor/qti-item-export/pm-qti-item';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export type { QtiComposeContext };

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): string {
  return qtiItemFromProsemirrorPure(
    node,
    context,
    ListDOMSerializer.fromSchema(node.type.schema),
  );
}
