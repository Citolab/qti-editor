import type { JsonNode } from './shared.js';

import type { CompatibilityChange, MigrationStep } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * v4 → v5: convert prosekit flat `list` nodes to the standard
 * prosemirror-schema-list shape.
 *
 * Old (flat list — paragraphs are direct children, `kind` attr selects style):
 *   { type: 'list', attrs: { kind: 'bullet' | 'ordered' | 'task' | 'toggle' },
 *     content: [ paragraph, paragraph, ... ] }
 *
 * New (each child wrapped in a `list_item`):
 *   { type: 'bullet_list' | 'ordered_list',
 *     content: [ { type: 'list_item', content: [ paragraph ] }, ... ] }
 *
 * `task` and `toggle` lists are not QTI-compatible; they are coerced to
 * `bullet_list` so their content is preserved.
 */
function listTypeForKind(kind: unknown): 'ordered_list' | 'bullet_list' {
  return kind === 'ordered' ? 'ordered_list' : 'bullet_list';
}

function convertFlatLists(
  node: JsonNode,
  path: string,
  addChange: (change: CompatibilityChange) => void,
): JsonNode {
  const nextContent = Array.isArray(node.content)
    ? node.content.map((child, index) =>
        convertFlatLists(child, `${path}.content[${index}]`, addChange),
      )
    : node.content;

  let current: JsonNode =
    nextContent === node.content ? node : { ...node, content: nextContent };

  if (current.type === 'list') {
    const kind = current.attrs?.kind;
    const listType = listTypeForKind(kind);
    const children = Array.isArray(current.content) ? current.content : [];
    const items: JsonNode[] = children.map(child => ({
      type: 'list_item',
      content: [child],
    }));

    addChange({
      code: 'RENAME_NODE',
      severity: 'info',
      message: `Converted flat "list" (kind "${String(kind)}") to "${listType}" with list_item children.`,
      path,
      nodeType: 'list',
      data: { fromNodeType: 'list', toNodeType: listType, kind },
    });

    if (kind === 'task' || kind === 'toggle') {
      addChange({
        code: 'NODE_REMOVED',
        severity: 'warning',
        message: `Coerced unsupported "${String(kind)}" list to "${listType}".`,
        path,
        nodeType: 'list',
        data: { kind },
      });
    }

    current = { type: listType, content: items };
  }

  return current;
}

export const jsonV4ToV5: MigrationStep<NodeJSON> = {
  id: 'json-v4-to-v5-flat-list-to-schema-list',
  fromVersion: 4,
  toVersion: 5,
  description: 'Convert prosekit flat list nodes to bullet_list/ordered_list with list_item children.',
  migrate(document, context) {
    return convertFlatLists(document as JsonNode, '$', context.addChange.bind(context)) as NodeJSON;
  },
};
