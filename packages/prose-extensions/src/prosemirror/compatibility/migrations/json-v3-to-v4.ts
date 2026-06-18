import type { JsonNode } from './shared.js';
import type { CompatibilityChange, MigrationStep } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * v3 → v4: extended-text no longer carries a `rubricScoringBlock` authoring
 * attribute. Walk the tree and, for every `qtiExtendedTextInteraction`:
 *   - always drop the `rubricScoringBlock` attr (PM rejects unknown attrs), and
 *   - when it held a value, insert a sibling `qtiRubricBlock` node right after
 *     it carrying that value as a paragraph.
 */
function migrateExtendedTextRubricScoringBlock(
  document: NodeJSON,
  addChange: (change: CompatibilityChange) => void,
): NodeJSON {
  return liftExtendedTextRubric(document as JsonNode, '$', addChange);
}

function normalizeRubricValue(value: unknown): string {
  const text = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string').join('\n')
    : typeof value === 'string'
      ? value
      : '';
  return text.trim().length > 0 ? text : '';
}

function createRubricBlockJson(text: string): JsonNode {
  return {
    type: 'qtiRubricBlock',
    attrs: { use: 'scoring', view: 'scorer' },
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

function liftExtendedTextRubric(
  node: JsonNode,
  path: string,
  addChange: (change: CompatibilityChange) => void,
): JsonNode {
  if (!Array.isArray(node.content)) return node;

  const nextContent: JsonNode[] = [];
  let changed = false;

  node.content.forEach((child, index) => {
    const childPath = `${path}.content[${index}]`;
    const transformedChild = liftExtendedTextRubric(child, childPath, addChange);
    if (transformedChild !== child) changed = true;

    if (
      transformedChild.type === 'qtiExtendedTextInteraction' &&
      transformedChild.attrs &&
      'rubricScoringBlock' in transformedChild.attrs
    ) {
      changed = true;
      const { rubricScoringBlock, ...restAttrs } = transformedChild.attrs;
      nextContent.push({ ...transformedChild, attrs: restAttrs });

      const text = normalizeRubricValue(rubricScoringBlock);
      if (text) {
        nextContent.push(createRubricBlockJson(text));
        addChange({
          code: 'ATTRIBUTE_MOVED',
          severity: 'info',
          message: 'Moved "rubricScoringBlock" off qtiExtendedTextInteraction into a sibling qtiRubricBlock node.',
          path: childPath,
          nodeType: 'qtiExtendedTextInteraction',
          attributeName: 'rubricScoringBlock',
          data: { movedTo: 'qtiRubricBlock' },
        });
      } else {
        addChange({
          code: 'ATTRIBUTE_REMOVED',
          severity: 'info',
          message: 'Dropped empty "rubricScoringBlock" attribute from qtiExtendedTextInteraction.',
          path: childPath,
          nodeType: 'qtiExtendedTextInteraction',
          attributeName: 'rubricScoringBlock',
        });
      }
      return;
    }

    nextContent.push(transformedChild);
  });

  return changed ? { ...node, content: nextContent } : node;
}

export const jsonV3ToV4: MigrationStep<NodeJSON> = {
  id: 'json-v3-to-v4-extended-text-rubricScoringBlock-to-rubric-block',
  fromVersion: 3,
  toVersion: 4,
  description: 'Lift rubricScoringBlock off qtiExtendedTextInteraction into a sibling qtiRubricBlock node.',
  migrate(document, context) {
    return migrateExtendedTextRubricScoringBlock(document, context.addChange.bind(context));
  },
};
