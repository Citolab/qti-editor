import type { JsonNode } from './shared.js';
import type { CompatibilityChange, MigrationStep } from '@citolab/prose-qti/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * v5 → v6: convert legacy prosekit `bold`/`italic` marks to the standard
 * prosemirror `strong`/`em` marks.
 *
 *   { type: 'text', marks: [{ type: 'bold' }, { type: 'italic' }] }
 *     → { type: 'text', marks: [{ type: 'strong' }, { type: 'em' }] }
 */
const MARK_RENAMES: Readonly<Record<string, string>> = {
  bold: 'strong',
  italic: 'em',
};

function convertMarks(
  node: JsonNode,
  path: string,
  addChange: (change: CompatibilityChange) => void,
): JsonNode {
  let changed = false;

  let nextMarks = node.marks;
  if (Array.isArray(node.marks)) {
    const mapped = node.marks.map(mark => {
      const renamed = MARK_RENAMES[mark.type];
      if (!renamed) return mark;
      changed = true;
      addChange({
        code: 'RENAME_NODE',
        severity: 'info',
        message: `Renamed legacy mark "${mark.type}" to "${renamed}".`,
        path,
        nodeType: node.type,
        data: { fromMark: mark.type, toMark: renamed },
      });
      return { ...mark, type: renamed };
    });
    if (changed) nextMarks = mapped;
  }

  const nextContent = Array.isArray(node.content)
    ? node.content.map((child, index) => {
        const transformed = convertMarks(child, `${path}.content[${index}]`, addChange);
        if (transformed !== child) changed = true;
        return transformed;
      })
    : node.content;

  if (!changed) return node;

  return {
    ...node,
    ...(nextMarks !== undefined ? { marks: nextMarks } : {}),
    ...(nextContent !== undefined ? { content: nextContent } : {}),
  };
}

export const jsonV5ToV6: MigrationStep<NodeJSON> = {
  id: 'json-v5-to-v6-bold-italic-marks-to-strong-em',
  fromVersion: 5,
  toVersion: 6,
  description: 'Convert legacy bold/italic marks to strong/em.',
  migrate(document, context) {
    return convertMarks(document as JsonNode, '$', context.addChange.bind(context)) as NodeJSON;
  },
};
