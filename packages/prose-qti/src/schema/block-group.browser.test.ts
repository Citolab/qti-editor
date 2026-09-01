/**
 * `block` means "may appear in an item body", and nothing else may claim it.
 *
 * See "The block group" in create-qti-schema.ts for the mechanism. The short version: a node in
 * `block` is not merely permitted in an item body, it is a candidate for the editor putting one
 * there unprompted, because `defaultType`, `defaultBlockAt` and `findWrapping` all reach for the
 * first qualifying member of the group. `qtiGapText` was in the group, so pressing Enter in an item
 * body inserted a gap-match chip.
 *
 * The first test is the guard rail: the membership list, written out. Not derived — an attempt at
 * deriving it ("in `block` and named by some parent's content expression") reports `paragraph`,
 * `ordered_list` and `bullet_list`, because `list_item` names all three and they are item-body
 * content as well. Whether a node belongs in an item body is a judgment about the QTI format, so
 * the test records the judgment and fails on any drift. Adding a node to `block` means adding a
 * line here, which is the point: it is the one edit that makes the editor able to insert that node
 * into an item body on its own.
 */
import { describe, expect, test } from 'vitest';

import { createQtiSchema } from './create-qti-schema.js';

import type { Schema } from 'prosemirror-model';

const schema: Schema = createQtiSchema();

function groupsOf(name: string): string[] {
  return (schema.nodes[name].spec.group ?? '').split(/\s+/).filter(Boolean);
}

/**
 * Every node that may appear in an item body, and nothing else.
 *
 * Two entries at the bottom are arguably wrong and are listed deliberately rather than overlooked.
 * Both are `atom`s, so neither can win `defaultBlockAt` and neither reached the Enter path that
 * motivated pruning the five textblocks — but both can still win `defaultType`, which is what
 * `createAndFill` and prosemirror-gapcursor read.
 *
 *   imgSelectPoint  `block qtiMedia`, named by `qtiSelectPointInteraction`. No other home.
 *   qtiMediaStub    `block qtiMedia`. A placeholder that exists only so the `qtiMedia` group
 *                   resolves for `qtiSimpleAssociableChoice` when no real media node is
 *                   registered. Nothing should ever put one in an item body.
 *
 * In both cases `qtiMedia` is the membership that is load-bearing and `block` is the accident.
 */
const BLOCK_GROUP_MEMBERS = [
  // Prose and layout.
  'paragraph',
  'heading',
  'blockquote',
  'code_block',
  'horizontal_rule',
  'ordered_list',
  'bullet_list',
  'table',
  'qtiLayoutDiv',
  'qtiRubricBlock',
  // Interactions — the whole point of the group.
  'qtiChoiceInteraction',
  'qtiExtendedTextInteraction',
  'qtiGapMatchInteraction',
  'qtiHottextInteraction',
  'qtiMatchInteraction',
  'qtiMatchInteractionTabular',
  'qtiOrderInteraction',
  'qtiSelectPointInteraction',
  // See the note above — both are `block qtiMedia` where only `qtiMedia` is needed.
  'imgSelectPoint',
  'qtiMediaStub',
];

describe('the block group', () => {
  test('exactly these nodes may appear in an item body', () => {
    const actual = Object.keys(schema.nodes)
      .filter(name => groupsOf(name).includes('block'))
      .sort();

    expect(actual).toEqual([...BLOCK_GROUP_MEMBERS].sort());
  });

  test('the interaction-internal nodes carry no group at all', () => {
    for (const name of [
      'qtiGapText',
      'qtiPromptParagraph',
      'qtiSimpleChoiceParagraph',
      'qtiSimpleMatchSet',
      'qtiSimpleAssociableChoice',
      // Already groupless before this rule was written down; asserted so they stay that way.
      'qtiPrompt',
      'qtiSimpleChoice',
      'qtiSimpleAssociableChoiceParagraph',
    ]) {
      expect(groupsOf(name), `${name} should declare no group`).toEqual([]);
    }
  });

  test('the interactions themselves stay in the block group', () => {
    // The narrowing must not have caught the nodes that genuinely are item-body content.
    for (const name of [
      'qtiChoiceInteraction',
      'qtiMatchInteraction',
      'qtiMatchInteractionTabular',
      'qtiGapMatchInteraction',
      'qtiOrderInteraction',
      'qtiHottextInteraction',
      'qtiExtendedTextInteraction',
      'qtiSelectPointInteraction',
      'qtiRubricBlock',
      'qtiLayoutDiv',
    ]) {
      expect(groupsOf(name), `${name} is item-body content and must stay in 'block'`).toContain('block');
    }
  });

  test('every pruned node is still reachable inside its own parent', () => {
    // Losing the group must not have made any of them unbuildable — the parents name them, and this
    // asserts the naming actually resolves rather than trusting that it does.
    const parents: Record<string, string> = {
      qtiGapText: 'qtiGapMatchInteraction',
      qtiPromptParagraph: 'qtiPrompt',
      qtiSimpleChoiceParagraph: 'qtiSimpleChoice',
      qtiSimpleMatchSet: 'qtiMatchInteraction',
      qtiSimpleAssociableChoice: 'qtiSimpleMatchSet',
    };
    for (const [child, parent] of Object.entries(parents)) {
      const match = schema.nodes[parent].contentMatch.matchType(schema.nodes[child]);
      expect(match, `${parent} can no longer contain ${child}`).not.toBeNull();
    }
  });

  test('an item body no longer accepts a bare gap text', () => {
    // The bug this closes, stated as a document rather than as a schema property.
    const body = schema.nodes.qtiLayoutDiv;
    expect(body.contentMatch.matchType(schema.nodes.qtiGapText)).toBeNull();
    expect(body.contentMatch.matchType(schema.nodes.paragraph)).not.toBeNull();
  });
});
