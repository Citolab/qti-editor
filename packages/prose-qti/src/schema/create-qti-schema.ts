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
 * This is the one measured against the regression corpus: with it, a Node roundtrip of every ITEM
 * fixture reproduces the committed snapshots — 16/16 today. The ProseKit path has never been measured
 * against the corpus and does not carry `qtiLayoutDiv`, so building conversion on it would silently
 * drop author layout.
 *
 * ## Why lists and tables are in here
 *
 * Not decoration — measured. Removing them took the corpus from 17/17 to **7/17** (measured when
 * it was 17 items, before ITEM017 left with the associate interaction). An item body is
 * HTML, and rubric blocks in particular already contain `<ul>`/`<li>`. `paragraph` is re-declared
 * into the `richtext` group because `tableNodes` uses `cellContent: 'richtext+'`.
 *
 * ## The block group
 *
 * `block` means "may appear in an item body". It is not a convenience label for "is a block-level
 * node", and putting an interaction-INTERNAL node in it is a bug, not a widening.
 *
 * Every "what block goes here?" question ProseMirror answers reads the same thing: the FIRST
 * qualifying edge of the content expression it is standing in. `ContentMatch.defaultType` (behind
 * `createAndFill` and prosemirror-gapcursor's reachability guess) wants the first non-text type
 * with no required attrs; `defaultBlockAt` (behind `createParagraphNear`, which is in the base
 * Enter chain) wants the first *textblock*; `findWrapping` (behind `replaceRange`, so behind
 * typing) returns the shortest wrapping and breaks ties the same way. For a bare group reference
 * that ordering is whichever member registered first — an implementation detail of how the specs
 * happen to be assembled, and not something any host can steer.
 *
 * So a node in `block` is not merely *permitted* in an item body; it is a candidate for being put
 * there by the editor on its own initiative. `qtiGapText` was, and pressing Enter in an item body
 * inserted a gap-match chip: `<qti-gap-text/>` loose at item-body level, which is not valid QTI.
 *
 * These nodes therefore declare NO group and are reached only by being named in their parent's
 * content expression, which is also the only place they are legal:
 *
 *   qtiGapText                 <- qtiGapMatchInteraction
 *   qtiPromptParagraph         <- qtiPrompt
 *   qtiSimpleChoiceParagraph   <- qtiSimpleChoice
 *   qtiSimpleMatchSet          <- qtiMatchInteraction, qtiMatchInteractionTabular
 *   qtiSimpleAssociableChoice  <- qtiSimpleMatchSet
 *
 * `qtiPrompt`, `qtiSimpleChoice` and `qtiSimpleAssociableChoiceParagraph` already declared no
 * group, so this is the existing convention rather than a new one.
 *
 * Two things this does NOT fix, both worth knowing before relying on it:
 *
 *   - It narrows what is legal, so a document that already had one of these at item-body level
 *     becomes invalid rather than merely odd. Hosts that persist documents need a migration; the
 *     full-assessment app's compatibility ladder is where that lives.
 *   - It does not make `paragraph` win the lookups above. Pruning only promotes the next candidate
 *     — measured, `heading` — so a host that wants a specific answer must still say so, either in
 *     its `doc` content expression (`(paragraph | block)*`, the trick `defineQtiDoc` uses) or in a
 *     command. Pruning removes nodes that were never eligible; it does not choose between the ones
 *     that are.
 *
 * `imgSelectPoint` is the remaining node in the same position — `group: 'block qtiMedia'`, named by
 * `qtiSelectPointInteraction`. It is an atom, so it cannot win `defaultBlockAt`, but it can win
 * `defaultType`. Left as it is for now, deliberately, not overlooked.
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
