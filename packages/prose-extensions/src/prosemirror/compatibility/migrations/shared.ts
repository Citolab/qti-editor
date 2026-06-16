import type { NodeJSON } from 'prosekit/core';

/**
 * Loose structural view of a ProseMirror `NodeJSON` used by the JSON migration
 * steps. Migrations operate on plain JSON before the document is parsed against
 * the schema, so every field is optional.
 */
export type JsonNode = NodeJSON & {
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  text?: string;
};
