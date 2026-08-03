/* eslint-disable import/no-relative-packages -- these are intra-package imports; the rule
   misreads this monorepo's layout and 'fixes' them into specifiers that do not resolve. */
import { Schema } from 'prosemirror-model';
import { bulletList, listItem, orderedList } from 'prosemirror-schema-list';
import { tableNodes } from 'prosemirror-tables';

import { listInteractionSchemaNodeSpecs } from '../core/interactions/composer.js';
import { qtiBasicMarks, qtiBasicNodes } from './basic-qti-schema.js';

import type { NodeSpec } from 'prosemirror-model';

/**
 * The roundtrip schema: the document model a QTI item is imported into and exported from.
 *
 * One definition, so the editor, the tests and the Node conversion functions cannot disagree. It
 * was previously assembled by hand in `apps/e2e/stories/prosemirror-base.ts` and again in each app,
 * which is how the layout wrappers came to be dropped in 15 of 17 stories without anyone noticing.
 *
 * ## Which schema this is
 *
 * There are two ways to build a schema in this repo and they are NOT interchangeable:
 *
 *   qtiBasicNodes + descriptors   <- this one. Plain ProseMirror.
 *   ProseKit's basic extension + descriptors
 *
 * This is the one measured against the regression corpus: with it, a Node roundtrip of all 17 ITEM
 * fixtures reproduces the committed snapshots 17/17. The ProseKit path has never been measured
 * against the corpus and does not carry `qtiLayoutDiv`, so building conversion on it would silently
 * drop author layout.
 *
 * ## Why lists and tables are in here
 *
 * Not decoration — measured. Removing them takes the corpus from 17/17 to **7/17**. An item body is
 * HTML, and rubric blocks in particular already contain `<ul>`/`<li>`. `paragraph` is re-declared
 * into the `richtext` group because `tableNodes` uses `cellContent: 'richtext+'`.
 *
 * ## doc attributes
 *
 * `identifier` and `title` are required, with no defaults. They are hoisted from the item-body on
 * import (see `roundtripXmlToPm`), which is why the `roundtripItemBody` transform has to run —
 * without it `schema.nodes.doc.create()` throws.
 */
export interface CreateQtiSchemaOptions {
  /** Restrict to specific interactions by tag name, e.g. `['qti-order-interaction']`. */
  include?: string[];
  /**
   * Extra node specs, merged last so they win.
   *
   * An escape hatch for a host that owns nodes this package does not — not a place to put anything
   * belonging to the item format. If an item can contain it, it belongs in the package.
   */
  extraNodes?: Record<string, NodeSpec>;
}

export function createQtiSchema(options: CreateQtiSchemaOptions = {}): Schema {
  const { include, extraNodes = {} } = options;

  const interactionNodes = Object.fromEntries(
    listInteractionSchemaNodeSpecs(include ? { include } : undefined).map(({ name, spec }) => [name, spec])
  );

  const nodes: Record<string, NodeSpec> = {
    ...qtiBasicNodes,
    // tableNodes' cellContent is `richtext+`, so paragraph has to join that group.
    paragraph: { ...qtiBasicNodes.paragraph, group: 'block richtext' },
    ordered_list: { ...orderedList, content: 'list_item+', group: 'block richtext' },
    bullet_list: { ...bulletList, content: 'list_item+', group: 'block richtext' },
    list_item: { ...listItem, content: 'paragraph (paragraph | bullet_list | ordered_list)*' },
    ...tableNodes({ tableGroup: 'block richtext', cellContent: 'richtext+', cellAttributes: {} }),
    ...interactionNodes,
    ...extraNodes
  };

  return new Schema({
    nodes: {
      ...nodes,
      doc: {
        ...nodes.doc,
        attrs: { identifier: {}, title: {} }
      }
    },
    marks: qtiBasicMarks
  });
}
