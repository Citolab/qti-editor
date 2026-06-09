import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from 'prosemirror-model';

function escapeXmlAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context: { identifier: string; title: string; lang?: string },
  schema: Schema,
): string {
  const serializer = DOMSerializer.fromSchema(schema);
  const fragment = serializer.serializeFragment(node.content);
  const wrapper = document.createElement('div');
  wrapper.appendChild(fragment);
  const itemBody = wrapper.innerHTML;

  return `<?xml version="1.0" encoding="UTF-8"?>
<qti-assessment-item xmlns="http://www.imsglobal.org/xsd/imsqtiasi_v3p0" identifier="${escapeXmlAttribute(
    context.identifier,
  )}" title="${escapeXmlAttribute(context.title)}" adaptive="false" time-dependent="false" xml:lang="${escapeXmlAttribute(
    context.lang ?? 'en',
  )}">
  <qti-item-body>${itemBody}</qti-item-body>
</qti-assessment-item>`;
}
