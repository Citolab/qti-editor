import { createMigrationRegistry } from './index.js';
import { HTML_MIGRATION_STEPS } from './migrations.js';

import type { MigrationResult } from '@qti-editor/interfaces';

/** Derived from the last entry in HTML_MIGRATION_STEPS — do not edit manually. */
export const CURRENT_HTML_DOCUMENT_VERSION = HTML_MIGRATION_STEPS[HTML_MIGRATION_STEPS.length - 1].toVersion;

/** Attributes and element tags to snapshot into the preservation sidecar before ProseMirror parses. */
export interface HtmlCompatibilityPreservationOptions {
  /** Attribute names whose values should be captured regardless of schema support. */
  attributeNames?: readonly string[];
  /** Tag names for elements whose `outerHTML` should be captured regardless of schema support. */
  elementTags?: readonly string[];
}

export interface MigrateHtmlFragmentOptions {
  sourceVersion?: number | null;
  fallbackVersion?: number;
  metadata?: Record<string, unknown>;
  /** Content to preserve in the sidecar even after migration, for post-parse inspection. */
  preserve?: HtmlCompatibilityPreservationOptions;
}

/**
 * HTML/XML/QTI VERSION METADATA DESIGN
 *
 * QTI XML is a standard format — we cannot embed proprietary version markers
 * in it, and HTML fragments from the editor carry no version stamp either.
 * Version detection therefore relies entirely on the call site:
 *
 *   migrateHtmlFragment(html, { sourceVersion: 1 })
 *   migrateHtmlFragment(html, { metadata: { documentVersion: 1 } })
 *
 * If neither is provided, `detectVersion` returns null and the pipeline
 * falls back to version 1 with a VERSION_ASSUMED warning in the change log.
 * "No version marker" means "assume oldest known content."
 *
 * Do not try to detect version from HTML content heuristics — that is
 * fragile. Pass `sourceVersion` explicitly wherever the version is known
 * (e.g. from an envelope, a DB field, or a protocol header).
 */
const htmlMigrationRegistry = createMigrationRegistry<string>({
  targetVersion: CURRENT_HTML_DOCUMENT_VERSION,
  detectVersion(_document, options) {
    if (typeof options?.sourceVersion === 'number') return options.sourceVersion;
    if (typeof options?.metadata?.documentVersion === 'number') return options.metadata.documentVersion;
    return null;
  },
  steps: HTML_MIGRATION_STEPS,
});

/**
 * Migrates an HTML string to the current version before ProseMirror parsing.
 *
 * Call this on any HTML or serialised QTI XML fragment before passing it to
 * `jsonFromHTML`. The returned `MigrationResult.document` is the normalised
 * HTML ready for parsing; `changes` and `preservedFragments` carry the audit
 * trail for the compatibility report.
 *
 * ```ts
 * const result = migrateHtmlFragment(xmlToHTML(xml), { sourceVersion: 1 });
 * const json = jsonFromHTML(result.document, { schema });
 * ```
 */
export function migrateHtmlFragment(
  html: string,
  options: MigrateHtmlFragmentOptions = {},
): MigrationResult<string> {
  const result = htmlMigrationRegistry.migrate(html, {
    source: 'html',
    sourceVersion: options.sourceVersion,
    fallbackVersion: options.fallbackVersion ?? 1,
    metadata: options.metadata,
  });

  if (!options.preserve?.attributeNames?.length && !options.preserve?.elementTags?.length) {
    return result;
  }

  return preserveHtmlFragments(result, options.preserve);
}

function preserveHtmlFragments(
  result: MigrationResult<string>,
  preserve: HtmlCompatibilityPreservationOptions,
): MigrationResult<string> {
  const document = new DOMParser().parseFromString(result.document, 'text/html');
  const elementTagSet = new Set((preserve.elementTags ?? []).map(tag => tag.toLowerCase()));
  const attributeNameSet = new Set((preserve.attributeNames ?? []).map(name => name.toLowerCase()));

  Array.from(document.querySelectorAll('*')).forEach((element, elementIndex) => {
    const tagName = element.tagName.toLowerCase();
    const path = `${tagName}[${elementIndex}]`;

    if (elementTagSet.has(tagName)) {
      result.preservedFragments.push({
        path,
        reason: `Preserved potentially unsupported element <${tagName}> during HTML compatibility migration.`,
        payload: element.outerHTML,
        nodeType: tagName,
        sourceVersion: result.sourceVersion,
      });
      result.changes.push({
        code: 'UNKNOWN_NODE_PRESERVED',
        severity: 'warning',
        message: `Preserved potentially unsupported element <${tagName}> in compatibility sidecar.`,
        path,
        nodeType: tagName,
      });
    }

    Array.from(element.getAttributeNames()).forEach(attributeName => {
      if (!attributeNameSet.has(attributeName.toLowerCase())) return;
      result.preservedFragments.push({
        path,
        reason: `Preserved potentially unsupported attribute "${attributeName}" during HTML compatibility migration.`,
        payload: {
          tagName,
          attributeName,
          value: element.getAttribute(attributeName),
        },
        nodeType: tagName,
        attributeName,
        sourceVersion: result.sourceVersion,
      });
      result.changes.push({
        code: 'UNKNOWN_ATTRIBUTE_PRESERVED',
        severity: 'warning',
        message: `Preserved potentially unsupported attribute "${attributeName}" in compatibility sidecar.`,
        path,
        nodeType: tagName,
        attributeName,
      });
    });
  });

  return result;
}
