/**
 * PURE-PROSEMIRROR ROUNDTRIP IMPORT — item-body only.
 *
 * Reads a roundtrip `<qti-item-body>` (the output of `roundtrip-export.ts` or
 * the composer's item-body) and rehydrates a ProseMirror document. It is the
 * inverse of `roundtrip-export.ts`: the item-body already carries CANONICAL
 * authoring attributes (`correct-response` / `score` / …) inline, so it simply
 * parses the content into a ProseMirror document with the schema's `DOMParser`
 * (whose node-spec `parseDOM` reads those canonical attributes directly).
 *
 * `qti-response-declaration` / `qti-response-processing` are not part of the
 * roundtrip item-body — authoring state lives in the canonical attributes.
 *
 * No ProseKit, no Lit. Pure DOM + prosemirror-model.
 */
import { DOMParser as PMDOMParser, type Node as ProseMirrorNode, type Schema } from 'prosemirror-model';

export function prosemirrorFromQtiItem(xml: string, schema: Schema): ProseMirrorNode {
  const xmlDoc = new globalThis.DOMParser().parseFromString(xml, 'application/xml');
  const itemBody =
    xmlDoc.querySelector('qti-item-body') ?? xmlDoc.documentElement;

  // Re-host the item-body content as HTML so the schema's DOMParser (which
  // matches lowercase tag names) can read the canonical authoring attributes.
  const template = document.createElement('template');
  template.innerHTML = new XMLSerializer().serializeToString(itemBody);
  const htmlBody = template.content.firstElementChild as HTMLElement;

  return PMDOMParser.fromSchema(schema).parse(htmlBody);
}
