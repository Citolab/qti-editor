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

/**
 * Maps a node's `content`, returning the ORIGINAL array when every child comes back identical.
 *
 * Every walk in this directory decides "did anything change" by reference equality, and
 * `Array.prototype.map` always allocates — so a step that assigned its result unconditionally would
 * report a change for every node that has children, and rebuild the whole document on a no-op
 * migration. Two steps did exactly that until `ladder.browser.test.ts` asked them not to.
 */
export function mapContent(
  content: JsonNode[],
  visit: (child: JsonNode, index: number) => JsonNode,
): JsonNode[] {
  const mapped = content.map(visit);
  return mapped.some((child, index) => child !== content[index]) ? mapped : content;
}
