import { parseHTML } from 'linkedom';

/**
 * Give Node the DOM the conversion needs.
 *
 * The conversion is not browser-dependent, but it is DOM-dependent: `DOMParser`, `XMLSerializer`,
 * `document`, `document.implementation.createDocument`, and `HTMLElement` for the `getAttrs` guards
 * in every interaction's `parseDOM`. None of it needs layout, events or custom elements — grep the
 * conversion path for `customElements` and there are no hits — so a lightweight DOM is enough.
 *
 * This lives in the package rather than in each consumer because two pieces are easy to get wrong,
 * and getting them wrong fails deep inside the pipeline with an error that names neither:
 *
 *   - **`createDocument` takes a root element name.** `createDocument(ns, 'qti-item-body', null)`
 *     must return a document whose `documentElement` IS that element. Returning an empty document
 *     makes `convertDividersToHr` call `replaceChild(node, null)`, which surfaces as
 *     "Cannot read properties of null (reading 'nodeType')" from inside linkedom.
 *   - **linkedom ships no `XMLSerializer`.** Its nodes stringify themselves, so the shim is a
 *     one-method class — but its absence shows up as `XMLSerializer is not defined` at export time.
 *
 * Idempotent, and never overwrites a global that already exists: importing this in an environment
 * that has a real DOM (a browser, jsdom, a Vitest browser test) leaves everything alone.
 *
 * ## Known gap
 *
 * linkedom drops the `xmlns:xsi` declaration while keeping `xsi:schemaLocation`, so serialized QTI
 * is namespace-incomplete. Measured on all 17 regression fixtures. It does not affect the document
 * model — the roundtrip still reproduces every committed snapshot — but output destined for a
 * validator will need that declaration restored, or a different DOM implementation.
 */
export function installNodeDom(): void {
  const { window } = parseHTML('<!doctype html><html><body></body></html>');

  const globals = [
    'document',
    'DOMParser',
    'HTMLElement',
    'Element',
    'Node',
    'DocumentFragment',
    'Document',
    'XMLDocument',
    'Text',
    'Comment',
    'CharacterData',
    'Attr',
    'NodeList',
    'HTMLCollection',
    'customElements',
    'navigator'
  ] as const;

  const target = globalThis as unknown as Record<string, unknown>;
  const source = window as unknown as Record<string, unknown>;

  for (const name of globals) {
    if (target[name] === undefined && source[name] !== undefined) target[name] = source[name];
  }

  if (target.XMLSerializer === undefined) {
    target.XMLSerializer = class XMLSerializer {
      serializeToString(node: unknown): string {
        return String(node);
      }
    };
  }

  const doc = target.document as Document | undefined;
  if (doc && !doc.implementation?.createDocument) {
    Object.defineProperty(doc, 'implementation', {
      configurable: true,
      value: {
        createDocument: (namespaceURI: string | null, qualifiedName: string | null) => {
          const Parser = target.DOMParser as typeof DOMParser;
          if (qualifiedName) {
            const xmlns = namespaceURI ? ` xmlns="${namespaceURI}"` : '';
            return new Parser().parseFromString(`<${qualifiedName}${xmlns}/>`, 'text/xml');
          }
          const empty = new Parser().parseFromString('<root/>', 'text/xml');
          if (empty.documentElement) empty.removeChild(empty.documentElement);
          return empty;
        }
      }
    });
  }
}
