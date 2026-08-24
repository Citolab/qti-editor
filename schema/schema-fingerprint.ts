import type { Schema } from 'prosemirror-model';

/**
 * The parts of a schema that decide whether a document already on disk can still be loaded.
 *
 * Deliberately narrow. A schema changes constantly and most of it cannot hurt a stored document —
 * adding an attribute with a default, widening a content expression, introducing a new node — so
 * recording everything would produce a check that fails on every ordinary change, and a check that
 * fails on every ordinary change gets re-blessed without being read. Only these four things can
 * stop an old document loading:
 *
 *   - a node or mark disappearing            -> "Unknown node type" on parse
 *   - `inline` flipping                      -> the node is no longer legal where it used to sit
 *   - a content expression changing          -> its children may no longer be legal
 *   - an attribute's `validate` changing     -> a stored value may no longer satisfy it
 *
 * Everything else is left out on purpose, so that a failure here always means something.
 */
export interface SchemaFingerprint {
  schemaVersion: number;
  nodes: Record<string, NodeFingerprint>;
  marks: string[];
}

export interface NodeFingerprint {
  inline: boolean;
  content: string;
  /**
   * Every attribute, mapped to its `validate` (empty string when it declares none).
   *
   * All of them, not just the validating ones, so that an attribute *gaining* a `validate` — which
   * can reject a value already stored — is distinguishable from an attribute being *added*, which
   * cannot, because no old document carries it.
   */
  attrValidate: Record<string, string>;
}

export function fingerprintSchema(schema: Schema, schemaVersion: number): SchemaFingerprint {
  const nodes: Record<string, NodeFingerprint> = {};

  for (const [name, type] of Object.entries(schema.nodes)) {
    const attrValidate: Record<string, string> = {};
    for (const [attr, spec] of Object.entries(type.spec.attrs ?? {})) {
      const validate = (spec as { validate?: unknown }).validate;
      attrValidate[attr] =
        typeof validate === 'string' ? validate : typeof validate === 'function' ? '<function>' : '';
    }
    nodes[name] = {
      inline: Boolean(type.isInline),
      content: type.spec.content ?? '',
      attrValidate,
    };
  }

  return { schemaVersion, nodes, marks: Object.keys(schema.marks).sort() };
}
