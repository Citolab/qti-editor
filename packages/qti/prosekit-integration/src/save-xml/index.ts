/**
 * Save XML — prosekit wrapper
 *
 * Thin wrapper around @qti-editor/qti-roundtrip-export/pm-xml that injects
 * prosekit's ListDOMSerializer for list-aware serialization.
 */

import { ListDOMSerializer } from 'prosekit/extensions/list';
import type { ProseMirrorNode } from 'prosekit/pm/model';

import { xmlFromNode as xmlFromNodePure } from '@qti-editor/qti-roundtrip-export/pm-xml';

export function xmlFromNode(node: ProseMirrorNode): string {
  return xmlFromNodePure(node, ListDOMSerializer.fromSchema(node.type.schema));
}

export { xmlToHTML } from '@qti-editor/qti-roundtrip-export/pm-xml';
