import type { CompatibilityChange, MigrationStep } from '@citolab/prose-qti/interfaces';

/**
 * v1 → v2: normalize legacy camelCase HTML attrs to canonical hyphenated attrs
 * (e.g. `responseIdentifier` → `response-identifier`).
 */
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

export const htmlV1ToV2: MigrationStep<string> = {
  id: 'html-v1-to-v2-normalize-legacy-attrs',
  fromVersion: 1,
  toVersion: 2,
  description: 'Normalize legacy camelCase HTML attrs to canonical hyphenated attrs.',
  migrate(document, context) {
    return renameLegacyHtmlAttributes(document, context.addChange.bind(context));
  },
};
