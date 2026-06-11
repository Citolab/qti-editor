/**
 * Compare two XML documents structurally in the browser.
 *
 * Walks both trees comparing element names, attributes (order-independent), and
 * trimmed/collapsed text content. Comments, processing instructions, and
 * whitespace-only text nodes are ignored. Accepts a `Document` (or `Element`) or
 * an XML string for either side.
 */

const parse = value =>
  typeof value === 'string' ? new DOMParser().parseFromString(value, 'application/xml') : value;

const rootElement = node =>
  node && node.nodeType === 9 /* Document */ ? node.documentElement : node;

const collapse = text => text.replace(/\s+/g, ' ').trim();

/** Significant child nodes: elements + non-empty text; comments/PIs dropped. */
const significantChildren = element =>
  Array.from(element.childNodes).filter(node => {
    if (node.nodeType === 1) return true; // Element
    if (node.nodeType === 3) return collapse(node.nodeValue) !== ''; // Text
    return false;
  });

/** Direct text of an element with no element children (a leaf's value). */
const leafText = element =>
  collapse(
    Array.from(element.childNodes)
      .filter(node => node.nodeType === 3)
      .map(node => node.nodeValue)
      .join(''),
  );

const attrsEqual = (a, b) => {
  if (a.attributes.length !== b.attributes.length) return false;
  for (const attr of Array.from(a.attributes)) {
    if (b.getAttribute(attr.name) !== attr.value) return false;
  }
  return true;
};

const elementsEqual = (a, b) => {
  if (a.nodeName !== b.nodeName) return false;
  if (!attrsEqual(a, b)) return false;

  const aChildren = significantChildren(a);
  const bChildren = significantChildren(b);

  const aElements = aChildren.filter(node => node.nodeType === 1);
  const bElements = bChildren.filter(node => node.nodeType === 1);

  // Leaf node (no element children): compare collapsed text value.
  if (aElements.length === 0 && bElements.length === 0) {
    return leafText(a) === leafText(b);
  }

  if (aElements.length !== bElements.length) return false;
  for (let i = 0; i < aElements.length; i++) {
    if (!elementsEqual(aElements[i], bElements[i])) return false;
  }
  return true;
};

export function toEqualXmlDoc(received, expected) {
  const receivedRoot = rootElement(parse(received));
  const expectedRoot = rootElement(parse(expected));

  const pass = elementsEqual(receivedRoot, expectedRoot);

  if (pass) {
    return { message: () => `expected XML documents not to be equal`, pass: true };
  }

  const serializer = new XMLSerializer();
  return {
    message: () =>
      `Expected XML documents to be equal:\n\nReceived:\n${serializer.serializeToString(
        receivedRoot,
      )}\n\nExpected:\n${serializer.serializeToString(expectedRoot)}`,
    pass: false,
  };
}
