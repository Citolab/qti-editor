/**
 * PURE-PROSEMIRROR ROUNDTRIP EXPORT — item-body only.
 *
 * Serializes a ProseMirror document back to the roundtrip `<qti-item-body>`
 * XML. This is the lightweight, lossless counterpart to `roundtrip-import.ts`
 * — it is NOT a full `<qti-assessment-item>` and it does NOT emit
 * `qti-response-declaration` / `qti-response-processing`. Instead it serializes
 * the PM content with the schema's `DOMSerializer` (node-spec `toDOM` emits
 * canonical authoring attributes like `correct-response` / `score`) and wraps
 * it in a bare `<qti-item-body>`.
 *
 * The roundtrip item-body keeps authoring attributes CANONICAL (unprefixed) and
 * carries no editor markers. identifier/title/lang live on the composed
 * `<qti-assessment-item>`, not on the body. The composer
 * (`@qti-editor/core/composer`) expands the resulting item-body into a complete
 * QTI item — deriving `qti-response-declaration` / `qti-response-processing`
 * from the canonical attributes — when a full document is needed.
 *
 * No ProseKit, no Lit. Pure DOM + prosemirror-model.
 */
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from 'prosemirror-model';

const QTI_NS = 'http://www.imsglobal.org/xsd/imsqtiasi_v3p0';

export interface RoundtripExportContext {
  identifier: string;
  title: string;
  lang?: string;
}

function escapeXmlAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context: RoundtripExportContext,
  schema: Schema,
): string {
  // Serialize into an XML document (not the HTML document) so the output is
  // well-formed XML: void elements like <img>/<br> are self-closed instead of
  // left open, which would make the re-parsed `application/xml` fail.
  const xmlDoc = document.implementation.createDocument(null, null, null);
  const serializer = DOMSerializer.fromSchema(schema);
  const fragment = serializer.serializeFragment(node.content, { document: xmlDoc });
  const wrapper = xmlDoc.createElement('div');
  wrapper.appendChild(fragment);

  const attrs = [`xmlns="${QTI_NS}"`];
  if (context.lang) attrs.push(`xml:lang="${escapeXmlAttribute(context.lang)}"`);

  const xmlSerializer = new XMLSerializer();
  let inner = '';
  wrapper.childNodes.forEach(child => {
    inner += xmlSerializer.serializeToString(child);
  });

  return `<qti-item-body ${attrs.join(' ')}>${inner}</qti-item-body>`;
}
