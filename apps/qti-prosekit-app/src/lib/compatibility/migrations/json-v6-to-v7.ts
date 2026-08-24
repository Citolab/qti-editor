import type { JsonNode } from './shared.js';
import type { CompatibilityChange, MigrationStep } from '@citolab/prose-qti/interfaces';
import type { NodeJSON } from 'prosekit/core';

/**
 * v6 → v7: bring stored `image` nodes in line with the rebuilt image spec.
 *
 * `image` used to be ProseKit's: a BLOCK node with numeric `width`/`height`. It is now modelled on
 * `prosemirror-schema-basic` instead — inline, with `width`/`height` declared `'string|null'` (the
 * sample items use `width="100%"` as well as `width="250"`, and a numeric attr drops the
 * percentage). See `defineQtiImage` in prose-extensions and schema/notes.ts.
 *
 * Both halves of that change reject a v6 document, and they fail at different stages:
 *
 *   { type: 'image', attrs: { width: 250 } }
 *     -> throws in nodeFromJSON: Expected value of type string,null for attribute width
 *        on type image, got number
 *
 *   { type: 'doc', content: [ { type: 'image' } ] }
 *     -> parses, then check() fails: Invalid content for node doc: <image>
 *
 * So this step does two things: stringify numeric sizes, and wrap an image that sits in a block
 * position in a paragraph. An image already inside a paragraph is left exactly as it is.
 */

/**
 * Node types whose content is inline, as of the v6-era schema.
 *
 * Deliberately a frozen snapshot rather than something derived from the live schema: a v6 document
 * can only contain node types that existed at v6, so the set this step has to reason about cannot
 * grow after the fact. Reading today's schema would instead make an old document's migration change
 * meaning every time the schema does.
 *
 * An `image` directly inside one of these is already in a legal inline position. Anywhere else —
 * `doc`, `qtiItemBody`, `qtiRubricBlock`, a list item, a table cell — it was a block node and now
 * needs a block parent to live in.
 *
 * Exported so `ladder.browser.test.ts` can assert every entry actually leaves an image alone. An
 * entry added here without being exercised fails that test.
 */
export const V6_INLINE_CONTENT_NODES: ReadonlySet<string> = new Set([
  'code_block',
  'heading',
  'paragraph',
  'qtiGapText',
  'qtiHottext',
  'qtiInlineChoice',
  'qtiInlineChoiceInteraction',
  'qtiPromptParagraph',
  'qtiSimpleAssociableChoiceParagraph',
  'qtiSimpleChoiceParagraph',
]);

const SIZE_ATTRS = ['width', 'height'] as const;

/** `width: 250` → `width: '250'`, leaving strings and nulls untouched. */
function coerceImageSize(
  node: JsonNode,
  path: string,
  addChange: (change: CompatibilityChange) => void,
): JsonNode {
  if (node.type !== 'image' || !node.attrs) return node;

  let attrs = node.attrs;
  let changed = false;

  for (const name of SIZE_ATTRS) {
    const value = node.attrs[name];
    if (typeof value !== 'number') continue;

    if (!changed) {
      attrs = { ...node.attrs };
      changed = true;
    }
    attrs[name] = String(value);

    addChange({
      code: 'ATTRIBUTE_COERCED',
      severity: 'info',
      message: `Converted numeric "${name}" to a string on image, so a percentage size can round-trip.`,
      path,
      nodeType: 'image',
      attributeName: name,
      data: { from: value, to: String(value) },
    });
  }

  return changed ? { ...node, attrs } : node;
}

function migrateImages(
  node: JsonNode,
  path: string,
  addChange: (change: CompatibilityChange) => void,
): JsonNode {
  const next = coerceImageSize(node, path, addChange);

  if (!Array.isArray(next.content)) return next;

  // Whether THIS node holds inline content decides if an `image` child is already legal.
  const holdsInlineContent = V6_INLINE_CONTENT_NODES.has(next.type);
  const nextContent: JsonNode[] = [];
  let changed = false;

  next.content.forEach((child, index) => {
    const childPath = `${path}.content[${index}]`;
    const migratedChild = migrateImages(child, childPath, addChange);
    if (migratedChild !== child) changed = true;

    if (migratedChild.type === 'image' && !holdsInlineContent) {
      changed = true;
      nextContent.push({ type: 'paragraph', content: [migratedChild] });
      addChange({
        code: 'NODE_WRAPPED',
        severity: 'info',
        message: 'Wrapped a block-level image in a paragraph — image is an inline node now.',
        path: childPath,
        nodeType: 'image',
        data: { wrappedIn: 'paragraph', parentType: next.type },
      });
      return;
    }

    nextContent.push(migratedChild);
  });

  return changed ? { ...next, content: nextContent } : next;
}

export const jsonV6ToV7: MigrationStep<NodeJSON> = {
  id: 'json-v6-to-v7-image-inline-and-string-size',
  fromVersion: 6,
  toVersion: 7,
  description: 'Stringify numeric image width/height and wrap block-level images in a paragraph.',
  migrate(document, context) {
    return migrateImages(document as JsonNode, '$', context.addChange.bind(context)) as NodeJSON;
  },
};
