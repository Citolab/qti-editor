/**
 * The editor schema — one literal, top to bottom, readable.
 *
 * Each interaction package exports its NodeSpec (`attrs` + `parseDOM` + `toDOM`)
 * via `*NodeSpec`. This module spreads each one and restates `content` and
 * `group` inline so the entire document topology is visible in this file.
 *
 * To change where a node is allowed: edit its `content` or `group` here. The
 * package's NodeSpec is the source of truth for DOM serialization; this file is
 * the source of truth for topology.
 */

import { Schema } from 'prosemirror-model';
import { nodes as basicNodes, marks } from 'prosemirror-schema-basic';
import { orderedList, bulletList, listItem } from 'prosemirror-schema-list';
import { tableNodes } from 'prosemirror-tables';
import { defaultSettings, updateImageNode } from 'prosemirror-image-plugin';
import { qtiChoiceInteractionNodeSpec } from '@citolab/prose-qti/components/choice';
import { qtiExtendedTextInteractionNodeSpec } from '@citolab/prose-qti/components/extended-text';
import { qtiTextEntryInteractionNodeSpec } from '@citolab/prose-qti/components/text-entry';
import { qtiAssociateInteractionNodeSpec } from '@citolab/prose-qti/components/associate';
import { qtiGapMatchInteractionNodeSpec } from '@citolab/prose-qti/components/gap-match';
import { qtiHottextInteractionNodeSpec, qtiHottextNodeSpec } from '@citolab/prose-qti/components/hottext';
import {
  qtiInlineChoiceInteractionNodeSpec,
  qtiInlineChoiceNodeSpec
} from '@citolab/prose-qti/components/inline-choice';
import { qtiMatchInteractionNodeSpec, qtiMatchInteractionTabularNodeSpec } from '@citolab/prose-qti/components/match';
import { qtiOrderInteractionNodeSpec } from '@citolab/prose-qti/components/order';
import { qtiSelectPointInteractionNodeSpec, imgSelectPointNodeSpec } from '@citolab/prose-qti/components/select-point';
import { qtiRubricBlockNodeSpec } from '@citolab/prose-qti/components/rubric-block';
import {
  qtiPromptNodeSpec,
  qtiPromptParagraphNodeSpec,
  qtiSimpleChoiceNodeSpec,
  qtiSimpleChoiceParagraphNodeSpec,
  qtiSimpleAssociableChoiceNodeSpec,
  qtiSimpleAssociableChoiceParagraphNodeSpec,
  qtiSimpleMatchSetNodeSpec,
  qtiGapNodeSpec,
  qtiGapTextNodeSpec
} from '@citolab/prose-qti/components/shared';

import { qtiLayoutDivNodeSpec } from './components/qti-layout-div.js';

export const imagePluginSettings = {
  ...defaultSettings,
  isBlock: false,
  hasTitle: false,
  enableResize: false,
  defaultAlt: 'Image'
};

const baseSchema = new Schema({
  marks,
  nodes: {
    // ── Core prose ────────────────────────────────────────────────────────
    doc:       { content: 'block+', attrs: { identifier: {}, title: {} } },
    paragraph: { ...basicNodes.paragraph, content: 'inline*', group: 'block richtext' },
    text:      basicNodes.text,
    image:     basicNodes.image,

    // ── Lists & tables ────────────────────────────────────────────────────
    ordered_list: { ...orderedList, content: 'list_item+', group: 'block richtext' },
    bullet_list:  { ...bulletList,  content: 'list_item+', group: 'block richtext' },
    list_item:    { ...listItem,    content: 'paragraph (paragraph | bullet_list | ordered_list)*' },
    ...tableNodes({ tableGroup: 'block richtext', cellContent: 'richtext+', cellAttributes: {} }),

    // ── Generic QTI container (non-interaction) ───────────────────────────
    qtiLayoutDiv:   { ...qtiLayoutDivNodeSpec,   content: 'block+', group: 'block' },
    qtiRubricBlock: { ...qtiRubricBlockNodeSpec },

    // ── QTI shared building blocks ────────────────────────────────────────
    qtiPrompt:                          { ...qtiPromptNodeSpec,                          content: 'qtiPromptParagraph' },
    qtiPromptParagraph:                 { ...qtiPromptParagraphNodeSpec,                 content: 'text*',              group: 'block' },
    qtiSimpleChoice:                    { ...qtiSimpleChoiceNodeSpec,                    content: 'qtiSimpleChoiceParagraph' },
    qtiSimpleChoiceParagraph:           { ...qtiSimpleChoiceParagraphNodeSpec,           content: 'text*',              group: 'block' },
    qtiSimpleAssociableChoice:          { ...qtiSimpleAssociableChoiceNodeSpec,          content: 'qtiSimpleAssociableChoiceParagraph | qtiMedia', group: 'block' },
    qtiSimpleAssociableChoiceParagraph: { ...qtiSimpleAssociableChoiceParagraphNodeSpec, content: 'inline*' },
    qtiSimpleMatchSet:                  { ...qtiSimpleMatchSetNodeSpec,                  content: 'qtiSimpleAssociableChoice+', group: 'block' },
    qtiGap:                             { ...qtiGapNodeSpec,                             group: 'inline', inline: true, atom: true },
    qtiGapText:                         { ...qtiGapTextNodeSpec,                         content: 'text*',              group: 'block' },

    // ── QTI block interactions ────────────────────────────────────────────
    qtiChoiceInteraction:       { ...qtiChoiceInteractionNodeSpec,       content: 'qtiPrompt qtiSimpleChoice+',              group: 'block' },
    qtiOrderInteraction:        { ...qtiOrderInteractionNodeSpec,        content: 'qtiPrompt? qtiSimpleChoice+',            group: 'block' },
    qtiMatchInteraction:        { ...qtiMatchInteractionNodeSpec,        content: 'qtiPrompt? qtiSimpleMatchSet{2}',        group: 'block' },
    qtiMatchInteractionTabular: { ...qtiMatchInteractionTabularNodeSpec, content: 'qtiPrompt? qtiSimpleMatchSet{2}',        group: 'block' },
    qtiAssociateInteraction:    { ...qtiAssociateInteractionNodeSpec,    content: 'qtiPrompt? qtiSimpleAssociableChoice+',  group: 'block' },
    qtiHottextInteraction:      { ...qtiHottextInteractionNodeSpec,      content: 'paragraph+',                              group: 'block' },
    qtiGapMatchInteraction:     { ...qtiGapMatchInteractionNodeSpec,     content: 'qtiPrompt? qtiGapText{2,} paragraph+',   group: 'block' },
    qtiExtendedTextInteraction: { ...qtiExtendedTextInteractionNodeSpec, content: 'qtiPrompt',                               group: 'block' },
    qtiSelectPointInteraction:  { ...qtiSelectPointInteractionNodeSpec,  content: 'qtiPrompt imgSelectPoint',                group: 'block' },

    // ── QTI inline interactions ───────────────────────────────────────────
    qtiInlineChoiceInteraction: { ...qtiInlineChoiceInteractionNodeSpec, content: 'qtiInlineChoice+', group: 'inline', inline: true },
    qtiTextEntryInteraction:    { ...qtiTextEntryInteractionNodeSpec },

    // ── Interaction-specific child nodes ──────────────────────────────────
    qtiHottext:        { ...qtiHottextNodeSpec,       content: 'text*', group: 'inline', inline: true },
    qtiInlineChoice:   { ...qtiInlineChoiceNodeSpec,  content: 'text*', group: 'inline', inline: true },
    imgSelectPoint:    { ...imgSelectPointNodeSpec,   group: 'block qtiMedia', atom: true }
  }
});

// Preserve the hand-aligned columns below — they make the topology readable
// at a glance. Without this directive, Prettier collapses the per-node
// alignment of `content` / `group` into a single column and the schema turns
// back into the dense, unreadable form it used to be.
// prettier-ignore
export const appSchema = new Schema({
  marks,
  nodes: updateImageNode(baseSchema.spec.nodes, imagePluginSettings)
});
