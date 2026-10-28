import type { AttributeSpec, Attrs } from 'prosemirror-model';

/**
 * QTI attributes a node keeps as authored through a load → save round trip, written as a NodeSpec
 * fragment: the `attrs` to spread into the spec, a `parse` for its `getAttrs` and a `domAttrs` for
 * its `toDOM`. The policy it implements is in `docs/roundtrip-format.md` ("QTI attributes kept as
 * authored").
 *
 * Each attribute defaults to `null`, which means "not written", so a node created in the editor
 * serialises exactly as it did before the attribute was modelled. A `string` attribute holds the
 * attribute's text. An `integer` attribute holds a number, so the attributes panel offers a number
 * field; text that is not an integer reads as `null` and is not written, rather than becoming
 * `"NaN"`.
 *
 * ```ts
 * const kept = qtiAttributes({
 *   expectedLength: { name: 'expected-length', type: 'integer' },
 *   patternMask: 'pattern-mask',
 * });
 *
 * export const spec: NodeSpec = {
 *   attrs: { responseIdentifier: { default: null }, ...kept.attrs },
 *   parseDOM: [{ tag: 'qti-text-entry-interaction', getAttrs: node => ({ ...kept.parse(node) }) }],
 *   toDOM: node => ['qti-text-entry-interaction', { ...kept.domAttrs(node.attrs) }],
 * };
 * ```
 */
export function qtiAttributes<const K extends string>(
  definitions: Record<K, string | QtiAttributeDefinition>,
): QtiAttributeFragment<K> {
  const entries = (Object.entries(definitions) as [K, string | QtiAttributeDefinition][]).map(
    ([key, definition]): [K, Required<QtiAttributeDefinition>] =>
      typeof definition === 'string'
        ? [key, { name: definition, type: 'string' }]
        : [key, { name: definition.name, type: definition.type ?? 'string' }],
  );

  const attrs = Object.fromEntries(entries.map(([key]) => [key, { default: null }])) as Record<K, AttributeSpec>;

  return {
    attrs,
    parse(node) {
      const element = typeof node !== 'string' && 'getAttribute' in node ? (node as Element) : null;
      return Object.fromEntries(
        entries.map(([key, { name, type }]) => {
          const value = element?.getAttribute(name) ?? null;
          return [key, type === 'integer' ? parseQtiInteger(value) : value || null];
        }),
      ) as Record<K, string | number | null>;
    },
    domAttrs(nodeAttrs) {
      const dom: Record<string, string> = {};
      for (const [key, { name, type }] of entries) {
        const value = formatQtiAttribute(nodeAttrs[key], type);
        if (value != null) dom[name] = value;
      }
      return dom;
    },
  };
}

/** How a node holds a kept attribute. */
export type QtiAttributeType = 'string' | 'integer';

/** A kept attribute: its QTI name and how the node holds it. A bare string is a `string` attribute. */
export interface QtiAttributeDefinition {
  /** The attribute's name in QTI, e.g. `expected-length`. */
  name: string;
  /** `string` (the default) or `integer`. */
  type?: QtiAttributeType;
}

/** The NodeSpec pieces {@link qtiAttributes} returns. */
export interface QtiAttributeFragment<K extends string> {
  /** Spread into the NodeSpec's `attrs`. Every attribute defaults to `null`. */
  attrs: Record<K, AttributeSpec>;
  /** Spread into a `getAttrs` result: `null` for each attribute the element does not have. */
  parse(node: Node | string): Record<K, string | number | null>;
  /** Spread into the `toDOM` attributes: only the ones the node holds a writable value for. */
  domAttrs(attrs: Attrs): Record<string, string>;
}

/**
 * An integer attribute's value, or `null` when it is absent or not an integer (`"abc"`, `"1.5"`,
 * `""`). Stricter than `parseInt`, which reads `"12px"` as 12.
 */
export function parseQtiInteger(value: string | null | undefined): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!/^[+-]?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

// The attributes panel writes what it was given: a number from a number field, but a string from
// the text field it renders while the attribute is still `null`. Both are accepted here.
function formatQtiAttribute(value: unknown, type: QtiAttributeType): string | null {
  if (value == null) return null;
  if (type === 'integer') {
    const parsed = typeof value === 'number' ? (Number.isSafeInteger(value) ? value : null) : parseQtiInteger(String(value));
    return parsed == null ? null : String(parsed);
  }
  const text = String(value);
  return text === '' ? null : text;
}
