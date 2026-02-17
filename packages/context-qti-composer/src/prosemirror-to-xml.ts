import type { ItemContext } from '@qti-editor/context-qti-assessment-item';

export interface QtiComposerCodeDetail {
  json: string;
  html: string;
  xml: string;
  timestamp: number;
}

export function htmlToXmlString(html: string): string {
  const wrapped = `<qti-item-body>${html}</qti-item-body>`;
  const parsed = new DOMParser().parseFromString(wrapped, 'application/xml');
  const parseError = parsed.querySelector('parsererror');

  if (parseError) {
    // Fall back to wrapped HTML if XML parsing fails due to malformed markup.
    return wrapped;
  }

  return new XMLSerializer().serializeToString(parsed.documentElement);
}

export function buildCodeDetailFromItemContext(context?: ItemContext): QtiComposerCodeDetail {
  const json = context?.state?.prosemirrorDoc ?? '';
  const html = context?.state?.prosemirrorHtml ?? '';

  return {
    json,
    html,
    xml: htmlToXmlString(html),
    timestamp: Date.now(),
  };
}
