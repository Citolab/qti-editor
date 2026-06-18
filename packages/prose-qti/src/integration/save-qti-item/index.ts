/**
 * Save QTI item — prosekit wrapper.
 */
import {
  qtiItemFromProsemirror as qtiItemFromProsemirrorPure,
  type QtiComposeContext,
} from '@citolab/prose-qti/item-export/pm-qti-item';

import type { ProseMirrorNode } from 'prosekit/pm/model';

export type { QtiComposeContext };

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context?: QtiComposeContext,
): string {
  return qtiItemFromProsemirrorPure(node, context);
}
