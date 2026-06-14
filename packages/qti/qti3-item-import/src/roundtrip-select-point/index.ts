import { extractItemScore } from '../_shared';

/**
 * Hoist area-mappings, correct-response and score onto a single
 * qti-select-point-interaction.
 *
 * Standard QTI 3.0 declares select-point correctness through the response
 * declaration. The canonical source is a `qti-area-mapping` whose
 * `qti-area-map-entry` children carry the scorable shapes:
 *
 *   <qti-response-declaration identifier="RESPONSE" base-type="point" cardinality="single">
 *     <qti-area-mapping default-value="0">
 *       <qti-area-map-entry shape="circle" coords="191,393,10" mapped-value="1"/>
 *     </qti-area-mapping>
 *   </qti-response-declaration>
 *
 * qti-components renders the correct response for select-point primarily from
 * the area-mapping (areaMapEntries), falling back to a `qti-correct-response`
 * point list when no mapping is present. Every interaction in qti-components
 * also exposes a comma-separated `correct-response` attribute (declared on the
 * shared Interaction base class). The editor mirrors the area-mapping as a JSON
 * `area-mappings` attribute on the interaction (the same shape its compose path
 * round-trips back into `qti-area-mapping`), and keeps the correct point(s) in a
 * comma-separated `correct-response` attribute. This transform reconstructs
 * both from the response declaration, deriving the correct point from the area
 * mapping (circle centre / rect centre) when there is no literal
 * qti-correct-response.
 *
 * Conditions (all must hold; otherwise no-op):
 * - Exactly ONE qti-select-point-interaction in the item.
 * - The interaction's response-identifier maps to a qti-response-declaration.
 *
 * Idempotent: existing area-mappings/correct-response/score attributes are
 * preserved.
 */
export const roundtripSelectPoint = (xmlDoc: XMLDocument): void => {
  const interactions = xmlDoc.querySelectorAll('qti-select-point-interaction');
  if (interactions.length !== 1) return;
  const interaction = interactions[0];

  const responseIdentifier = interaction.getAttribute('response-identifier');
  if (!responseIdentifier) return;

  const declaration = Array.from(xmlDoc.querySelectorAll('qti-response-declaration')).find(
    (decl) => decl.getAttribute('identifier') === responseIdentifier,
  );
  if (!declaration) return;

  const score = extractItemScore(xmlDoc);

  if (!interaction.getAttribute('area-mappings')) {
    const areaMappings = readAreaMappings(declaration);
    if (areaMappings) interaction.setAttribute('area-mappings', areaMappings);
  }

  if (!interaction.getAttribute('correct-response')) {
    // Prefer literal correct points; otherwise derive them from the area
    // mapping so select-point carries the same comma-separated correct-response
    // attribute every other interaction exposes (qti-components' Interaction
    // base class). qti-components does the reverse at runtime: when no
    // area-mapping is present it builds circles from correct-response points.
    const points = readCorrectPoints(declaration);
    const derived = points.length > 0 ? points : derivePointsFromAreaMapping(declaration);
    if (derived.length > 0) interaction.setAttribute('correct-response', derived.join(','));
  }

  if (!interaction.getAttribute('score')) {
    interaction.setAttribute('score', String(score));
  }
};

/**
 * Derive representative `"x y"` points from a qti-area-mapping's entries:
 * circle → centre (cx cy), rect → centre of the bounding box. Used as the
 * correct-response when the declaration has no literal qti-correct-response.
 */
function derivePointsFromAreaMapping(declaration: Element): string[] {
  const areaMapping = declaration.querySelector('qti-area-mapping');
  if (!areaMapping) return [];

  const points: string[] = [];
  areaMapping.querySelectorAll('qti-area-map-entry').forEach((entry) => {
    const shape = entry.getAttribute('shape');
    const coords = entry
      .getAttribute('coords')
      ?.split(',')
      .map((c) => Number(c.trim()));
    if (!coords || coords.some((c) => !Number.isFinite(c))) return;

    if (shape === 'circle' && coords.length >= 2) {
      points.push(`${coords[0]} ${coords[1]}`);
    } else if (shape === 'rect' && coords.length >= 4) {
      const cx = (coords[0] + coords[2]) / 2;
      const cy = (coords[1] + coords[3]) / 2;
      points.push(`${cx} ${cy}`);
    }
  });
  return points;
}

/**
 * Read the qti-area-mapping for the response declaration and serialize it to
 * the editor's `area-mappings` JSON format: an array of
 * `{ id, shape, coords, mappedValue, defaultValue }`. Only the editor-supported
 * shapes (circle, rect) are kept. Returns null when there is no usable mapping.
 */
function readAreaMappings(declaration: Element): string | null {
  const areaMapping = declaration.querySelector('qti-area-mapping');
  if (!areaMapping) return null;

  const defaultValueRaw = Number(areaMapping.getAttribute('default-value'));
  const defaultValue = Number.isFinite(defaultValueRaw) ? defaultValueRaw : 0;

  const entries = Array.from(areaMapping.querySelectorAll('qti-area-map-entry'))
    .map((entry, index) => {
      const shape = entry.getAttribute('shape');
      const coords = entry.getAttribute('coords')?.trim();
      if ((shape !== 'circle' && shape !== 'rect') || !coords) return null;
      const mappedValueRaw = Number(entry.getAttribute('mapped-value'));
      const mappedValue = Number.isFinite(mappedValueRaw) ? mappedValueRaw : 0;
      return { id: `A${index + 1}`, shape, coords, mappedValue, defaultValue };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (entries.length === 0) return null;
  return JSON.stringify(entries);
}

/**
 * Read literal correct points from `qti-correct-response > qti-value`, in
 * document order. Each value is a `"x y"` coordinate string.
 */
function readCorrectPoints(declaration: Element): string[] {
  const points: string[] = [];
  declaration.querySelectorAll('qti-correct-response > qti-value').forEach((value) => {
    const text = value.textContent?.trim();
    if (text) points.push(text);
  });
  return points;
}
