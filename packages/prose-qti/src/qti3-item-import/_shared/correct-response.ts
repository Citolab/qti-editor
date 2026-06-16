/**
 * Walk every qti-response-declaration in the document and build a map from
 * response-identifier to a comma-joined correct-response value string.
 *
 * Empty <qti-correct-response> (no <qti-value> children) is treated as
 * "no correct response known" and is omitted from the map (the transform
 * will then skip).
 */
export function buildCorrectResponseIndex(xmlDoc: XMLDocument): Map<string, string> {
  const index = new Map<string, string>();
  const declarations = xmlDoc.querySelectorAll('qti-response-declaration');
  declarations.forEach((decl) => {
    const identifier = decl.getAttribute('identifier');
    if (!identifier) return;
    const values: string[] = [];
    decl.querySelectorAll('qti-correct-response > qti-value').forEach((v) => {
      const text = v.textContent?.trim();
      if (text) values.push(text);
    });
    if (values.length > 0) {
      index.set(identifier, values.join(','));
    }
  });
  return index;
}
