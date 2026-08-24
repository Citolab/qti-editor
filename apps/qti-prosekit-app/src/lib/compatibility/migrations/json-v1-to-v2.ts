import { mapContent } from './shared.js';

import type { JsonNode } from './shared.js';
import type { CompatibilityChange, MigrationStep } from '@citolab/prose-qti/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * v1 → v2: normalize legacy hyphenated snapshot attribute names to canonical
 * camelCase JSON attrs (e.g. `response-identifier` → `responseIdentifier`).
 *
 * Exported so `ladder.browser.test.ts` can assert every entry is exercised. A rename added here
 * without a fixture attribute fails that test rather than going untested.
 */
export const LEGACY_JSON_ATTRIBUTE_RENAMES: Readonly<Record<string, string>> = {
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
    ? mapContent(node.content, (child, index) => visitJsonNode(child, `${path}.content[${index}]`, addChange))
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

    // Already canonical: keep it, and let it win over any legacy spelling of the same attribute.
    // The canonical value is the newer one — a document carrying both was written across a version
    // boundary, and the legacy key is the stale half.
    if (canonicalKey === key) {
      nextAttrs[key] = value;
      continue;
    }

    // Ask the INPUT whether the canonical key is present, not the half-built `nextAttrs`: a
    // document holding both spellings must migrate identically whichever one `Object.entries`
    // happens to yield first. `nextAttrs` is consulted too, which catches two legacy spellings
    // that map to one canonical name.
    if (canonicalKey in attrs || canonicalKey in nextAttrs) {
      changed = true;
      addChange({
        code: 'ATTRIBUTE_REMOVED',
        severity: 'warning',
        message: `Dropped legacy attribute "${key}" because canonical attribute "${canonicalKey}" already existed.`,
        path,
        nodeType,
        attributeName: key,
        data: { previousAttributeName: key, keptAttributeName: canonicalKey },
      });
      continue;
    }

    changed = true;
    nextAttrs[canonicalKey] = value;
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
