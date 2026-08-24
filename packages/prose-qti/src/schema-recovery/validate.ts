import type { NodeJson } from './types.js';
import type { Schema } from 'prosemirror-model';

/**
 * Why a document could not be loaded against a schema.
 *
 * `parse` — `nodeFromJSON` rejected it outright: an unknown node or mark type, or an attribute whose
 * stored value no longer satisfies the spec's `validate` (e.g. a numeric `width` after the attribute
 * became `'string|null'`).
 *
 * `structure` — it parsed, but the node tree is not legal for the schema, e.g. a node that used to
 * be block sitting somewhere only blocks may go.
 */
export interface SchemaViolation {
  stage: 'parse' | 'structure';
  message: string;
}

/**
 * Checks a document against a schema, returning the violation or `null` if it is loadable.
 *
 * Worth being explicit about why this exists as a separate step: **neither ProseMirror nor ProseKit
 * validates structure on the way in.** `nodeFromJSON` checks attributes and node names, and
 * `EditorState.create` checks nothing at all — a structurally invalid document is accepted and only
 * misbehaves later, once an operation trips over the illegal position. `Node.check()` is the only
 * thing that catches it, and nothing calls it for you.
 *
 * So a load that "succeeded" is not evidence the document is sound. Anything that decides whether to
 * write back over stored data has to ask here first.
 */
export function findSchemaViolation(schema: Schema, doc: NodeJson): SchemaViolation | null {
  let node;
  try {
    node = schema.nodeFromJSON(doc);
  } catch (error) {
    return { stage: 'parse', message: messageOf(error) };
  }

  try {
    node.check();
  } catch (error) {
    return { stage: 'structure', message: messageOf(error) };
  }

  return null;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
