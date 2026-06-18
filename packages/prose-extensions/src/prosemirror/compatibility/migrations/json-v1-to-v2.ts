import type { JsonNode } from './shared.js';
import type { CompatibilityChange, MigrationStep } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * v1 → v2: normalize legacy hyphenated snapshot attribute names to canonical
 * camelCase JSON attrs (e.g. `response-identifier` → `responseIdentifier`).
 */
const LEGACY_JSON_ATTRIBUTE_RENAMES: Readonly<Record<string, string>> = {
  'response-identifier': 'responseIdentifier',
  'correct-response': 'correctResponse',
  'case-sensitive': 'caseSensitive',
  'area-mappings': 'areaMappings',
  'match-max': 'matchMax',
  'max-choices': 'maxChoices',
  'min-choices': 'minChoices',
  'expected-length': 'expectedLength',
  'expected-lines': 'expectedLines',
};

function renameLegacyJsonAttributes(
  document: NodeJSON,
  addChange: (change: CompatibilityChange) => void,
): NodeJSON {
  return visitJsonNode(document as JsonNode, '$', addChange);
}

function visitJsonNode(
  node: JsonNode,
  path: string,
  addChange: (change: CompatibilityChange) => void,
): JsonNode {
  const nextAttrs = node.attrs ? renameNodeAttributes(node.attrs, path, node.type, addChange) : node.attrs;
  const nextContent = Array.isArray(node.content)
    ? node.content.map((child, index) => visitJsonNode(child, `${path}.content[${index}]`, addChange))
    : node.content;

  if (nextAttrs === node.attrs && nextContent === node.content) return node;

  return {
    ...node,
    ...(nextAttrs ? { attrs: nextAttrs } : {}),
    ...(nextContent ? { content: nextContent } : {}),
  };
}

function renameNodeAttributes(
  attrs: Record<string, unknown>,
  path: string,
  nodeType: string,
  addChange: (change: CompatibilityChange) => void,
): Record<string, unknown> {
  let changed = false;
  const nextAttrs: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(attrs)) {
    const canonicalKey = LEGACY_JSON_ATTRIBUTE_RENAMES[key] ?? key;
    if (canonicalKey !== key) {
      changed = true;
      addChange({
        code: 'RENAME_ATTRIBUTE',
        severity: 'info',
        message: `Renamed legacy attribute "${key}" to "${canonicalKey}".`,
        path,
        nodeType,
        attributeName: canonicalKey,
        data: { previousAttributeName: key },
      });
    }

    if (!(canonicalKey in nextAttrs)) {
      nextAttrs[canonicalKey] = value;
      continue;
    }

    if (canonicalKey !== key) {
      addChange({
        code: 'ATTRIBUTE_REMOVED',
        severity: 'warning',
        message: `Dropped legacy attribute "${key}" because canonical attribute "${canonicalKey}" already existed.`,
        path,
        nodeType,
        attributeName: key,
        data: { keptAttributeName: canonicalKey },
      });
      changed = true;
      continue;
    }

    nextAttrs[key] = value;
  }

  return changed ? nextAttrs : attrs;
}

export const jsonV1ToV2: MigrationStep<NodeJSON> = {
  id: 'json-v1-to-v2-normalize-legacy-attrs',
  fromVersion: 1,
  toVersion: 2,
  description: 'Normalize legacy hyphenated snapshot attribute names to canonical JSON attrs.',
  migrate(document, context) {
    return renameLegacyJsonAttributes(document, context.addChange.bind(context));
  },
};
