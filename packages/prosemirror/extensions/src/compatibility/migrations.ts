import { composeJsonStep, jsonRenameAttr } from './helpers.js';

import type { CompatibilityChange, MigrationStep } from '@qti-editor/interfaces';
import type { NodeJSON } from 'prosekit/core';

// ── JSON: private helpers ─────────────────────────────────────────────────────

type JsonNode = NodeJSON & {
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

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

// ── JSON: migration steps ─────────────────────────────────────────────────────

/**
 * JSON SCHEMA CHANGELOG
 *
 * To add a new schema version:
 *   1. Append a step below (fromVersion = previous, toVersion = new).
 *   2. That's it — CURRENT_JSON_DOCUMENT_VERSION in json.ts derives automatically.
 *
 * Version history:
 *   v1 — Baseline. Documents without a version marker are treated as v1.
 *   v2 — Normalize legacy hyphenated attrs to canonical camelCase
 *         (e.g. response-identifier → responseIdentifier).
 *   v3 — Rename correctResponse → rubricScoringBlock on qtiExtendedTextInteraction.
 */
export const JSON_MIGRATION_STEPS = [
  {
    id: 'json-v1-to-v2-normalize-legacy-attrs',
    fromVersion: 1,
    toVersion: 2,
    description: 'Normalize legacy hyphenated snapshot attribute names to canonical JSON attrs.',
    migrate(document: NodeJSON, context: Parameters<MigrationStep<NodeJSON>['migrate']>[1]): NodeJSON {
      return renameLegacyJsonAttributes(document, context.addChange.bind(context));
    },
  },
  composeJsonStep({
    id: 'json-v2-to-v3-extended-text-correctResponse-to-rubricScoringBlock',
    fromVersion: 2,
    toVersion: 3,
    description: 'Rename correctResponse → rubricScoringBlock on qtiExtendedTextInteraction.',
    transforms: [
      (attrs, nodeType, path, context) => {
        if (nodeType !== 'qtiExtendedTextInteraction') return attrs;
        return jsonRenameAttr('correctResponse', 'rubricScoringBlock')(attrs, nodeType, path, context);
      },
    ],
  }),
] satisfies MigrationStep<NodeJSON>[];

// ── HTML: private helpers ─────────────────────────────────────────────────────

const LEGACY_HTML_ATTRIBUTE_RENAMES: Readonly<Record<string, string>> = {
  responseIdentifier: 'response-identifier',
  responseidentifier: 'response-identifier',
  correctResponse: 'correct-response',
  correctresponse: 'correct-response',
  correctAnswer: 'correct-response',
  correctanswer: 'correct-response',
  caseSensitive: 'case-sensitive',
  casesensitive: 'case-sensitive',
  areaMappings: 'area-mappings',
  areamappings: 'area-mappings',
  matchMax: 'match-max',
  matchmax: 'match-max',
  maxChoices: 'max-choices',
  maxchoices: 'max-choices',
  minChoices: 'min-choices',
  minchoices: 'min-choices',
  expectedLength: 'expected-length',
  expectedlength: 'expected-length',
  expectedLines: 'expected-lines',
  expectedlines: 'expected-lines',
};

function renameLegacyHtmlAttributes(
  html: string,
  addChange: (change: CompatibilityChange) => void,
): string {
  const document = new DOMParser().parseFromString(html, 'text/html');

  Array.from(document.querySelectorAll('*')).forEach((element, elementIndex) => {
    Array.from(element.getAttributeNames()).forEach(attributeName => {
      const canonicalName = LEGACY_HTML_ATTRIBUTE_RENAMES[attributeName];
      if (!canonicalName) return;

      const value = element.getAttribute(attributeName);
      if (value == null) return;

      const path = `${element.tagName.toLowerCase()}[${elementIndex}]`;
      if (!element.hasAttribute(canonicalName)) {
        element.setAttribute(canonicalName, value);
        addChange({
          code: 'RENAME_ATTRIBUTE',
          severity: 'info',
          message: `Renamed legacy HTML attribute "${attributeName}" to "${canonicalName}".`,
          path,
          nodeType: element.tagName.toLowerCase(),
          attributeName: canonicalName,
          data: { previousAttributeName: attributeName },
        });
      } else {
        addChange({
          code: 'ATTRIBUTE_REMOVED',
          severity: 'warning',
          message: `Dropped legacy HTML attribute "${attributeName}" because canonical attribute "${canonicalName}" already existed.`,
          path,
          nodeType: element.tagName.toLowerCase(),
          attributeName: attributeName,
          data: { keptAttributeName: canonicalName },
        });
      }

      element.removeAttribute(attributeName);
    });
  });

  return document.body.innerHTML;
}

// ── HTML: migration steps ─────────────────────────────────────────────────────

/**
 * HTML/QTI SCHEMA CHANGELOG
 *
 * To add a new schema version:
 *   1. Append a step below (fromVersion = previous, toVersion = new).
 *   2. That's it — CURRENT_HTML_DOCUMENT_VERSION in dom.ts derives automatically.
 *
 * Version history:
 *   v1 — Baseline. HTML/QTI without a version marker is treated as v1.
 *   v2 — Normalize legacy camelCase HTML attrs to canonical hyphenated attrs
 *         (e.g. responseIdentifier → response-identifier).
 */
export const HTML_MIGRATION_STEPS = [
  {
    id: 'html-v1-to-v2-normalize-legacy-attrs',
    fromVersion: 1,
    toVersion: 2,
    description: 'Normalize legacy camelCase HTML attrs to canonical hyphenated attrs.',
    migrate(document: string, context: Parameters<MigrationStep<string>['migrate']>[1]): string {
      return renameLegacyHtmlAttributes(document, context.addChange.bind(context));
    },
  },
] satisfies MigrationStep<string>[];
