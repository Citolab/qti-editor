/**
 * Save XML — prosekit wrapper
 *
 * Thin wrapper around @qti-editor/qti-item-export/pm-xml that injects
 * prosekit's ListDOMSerializer for list-aware serialization.
 */

import { ListDOMSerializer } from 'prosekit/extensions/list';
import { xmlFromNode as xmlFromNodePure } from '@qti-editor/qti-item-export/pm-xml';

import type { ProseMirrorNode } from 'prosekit/pm/model';


export function xmlFromNode(node: ProseMirrorNode): string {
  return xmlFromNodePure(node, ListDOMSerializer.fromSchema(node.type.schema));
}

export { xmlToHTML } from '@qti-editor/qti-item-export/pm-xml';
