/**
 * PURE-PROSEMIRROR ROUNDTRIP EXPORT — item-body only.
 *
 * Serializes a ProseMirror document back to the editor-origin
 * `<qti-item-body>` XML. This is the lightweight, lossless counterpart to
 * `roundtrip-import.ts` — it is NOT a full `<qti-assessment-item>` and it does
 * NOT emit `qti-response-declaration` / `qti-response-processing`. Instead it:
 *
 *   1. Serializes the PM content with the schema's `DOMSerializer` (node-spec
 *      `toDOM` emits canonical authoring attributes like `correct-response`,
 *      `score`).
 *   2. Mirrors those non-QTI authoring attributes onto each interaction as
 *      `data-*` and strips the canonical source — the same contract the
 *      composer's `copyMirrorsToTarget` / `stripNonQtiAttributesFromElement`
 *      use, so the `data-*` mapping stays single-sourced via
 *      `collectMirrorMappings`.
 *   3. Stamps the editor-origin markers (`data-identifier`, `data-title`,
 *      `data-schema-version`) on the `<qti-item-body>`.
 *
 * The composer (`@qti-editor/core/composer`) expands the resulting item-body
 * into a complete QTI item when a full document is needed.
 *
 * No ProseKit, no Lit. Pure DOM + prosemirror-model.
 */
import { DOMSerializer, type Node as ProseMirrorNode, type Schema } from 'prosemirror-model';
import { CURRENT_SCHEMA_VERSION, type InteractionComposerMetadata } from '@qti-editor/interfaces';

import { collectMirrorMappings } from './composer/non-qti-attributes.js';

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

/**
 * Copy each interaction's canonical authoring attributes onto `data-*`
 * mirrors, then strip the canonical source. Operates in place on the
 * serialized HTML body.
 */
function applyNonQtiMirrors(
  body: HTMLElement,
  interactionMetadata: readonly InteractionComposerMetadata[],
): void {
  for (const metadata of interactionMetadata) {
    const mappings = collectMirrorMappings(metadata);
    if (mappings.length === 0) continue;
    body.querySelectorAll(metadata.tagName).forEach(element => {
      for (const { source, target } of mappings) {
        const value = element.getAttribute(source);
        if (value == null) continue;
        if (!element.hasAttribute(target)) element.setAttribute(target, value);
        element.removeAttribute(source);
      }
    });
  }
}

export function qtiItemFromProsemirror(
  node: ProseMirrorNode,
  context: RoundtripExportContext,
  schema: Schema,
  interactionMetadata: readonly InteractionComposerMetadata[] = [],
): string {
  // Serialize into an XML document (not the HTML document) so the output is
  // well-formed XML: void elements like <img>/<br> are self-closed instead of
  // left open, which would make the re-parsed `application/xml` fail.
  const xmlDoc = document.implementation.createDocument(null, null, null);
  const serializer = DOMSerializer.fromSchema(schema);
  const fragment = serializer.serializeFragment(node.content, { document: xmlDoc });
  const wrapper = xmlDoc.createElement('div');
  wrapper.appendChild(fragment);

  applyNonQtiMirrors(wrapper, interactionMetadata);

  const attrs = [
    `xmlns="${QTI_NS}"`,
    `data-identifier="${escapeXmlAttribute(context.identifier)}"`,
    `data-title="${escapeXmlAttribute(context.title)}"`,
    `data-schema-version="${CURRENT_SCHEMA_VERSION}"`,
  ];
  if (context.lang) attrs.push(`xml:lang="${escapeXmlAttribute(context.lang)}"`);

  const xmlSerializer = new XMLSerializer();
  let inner = '';
  wrapper.childNodes.forEach(child => {
    inner += xmlSerializer.serializeToString(child);
  });

  return `<qti-item-body ${attrs.join(' ')}>${inner}</qti-item-body>`;
}
