/**
 * The editor schema — the package's, not a local restatement of it.
 *
 * This file used to spell out the whole topology: every interaction's NodeSpec imported one by one,
 * every `content` and `group` restated inline, 139 lines of it. The comment at the top said that
 * was the point — "the entire document topology is visible in this file" — and that reasoning was
 * sound while the package shipped only the pieces. It no longer does. `createQtiSchema()` composes
 * exactly this: the QTI basics, lists, tables with `richtext` cell content, and every registered
 * interaction, with `doc` carrying `identifier` and `title`.
 *
 * What the readability actually cost, since it was not free:
 *
 *   - A restated `content` silently WINS over the package's. `qtiGapMatchInteraction` was relaxed
 *     from `qtiGapText{2,}` to `qtiGapText+` in the package and this app kept the old rule, so
 *     deleting a chip from a two-chip pool left content the schema refused — and ProseMirror
 *     filled it back with a default `qti-gap-text`, identifier and all missing. The editor looked
 *     broken and the package was right the whole time.
 *   - The image node's `width`/`height` parse rule was rebuilt here on top of the plugin's spec.
 *     The package's image node has carried both since it was extended; the local copy was two
 *     answers to one question, and the one that could rot.
 *
 * Reading the topology is still possible, and now has one answer rather than two that can disagree:
 * `createQtiSchema` in @citolab/prose-qti/schema.
 *
 * ## The one thing still composed here
 *
 * `prosemirror-image-plugin` rewrites the `image` node spec to add its own node view and upload
 * placeholder handling. That is an editing-experience concern belonging to this app, not to the
 * document format, so it is applied as a last step over the package's schema rather than pushed
 * upstream.
 */

import { defaultSettings, updateImageNode } from 'prosemirror-image-plugin';
import { Schema } from 'prosemirror-model';
import { createQtiSchema } from '@citolab/prose-qti/schema';

export const imagePluginSettings = {
  ...defaultSettings,
  isBlock: false,
  hasTitle: false,
  enableResize: false,
  defaultAlt: 'Image'
};

const qtiSchema = createQtiSchema();

export const appSchema = new Schema({
  marks: qtiSchema.spec.marks,
  nodes: updateImageNode(qtiSchema.spec.nodes, imagePluginSettings)
});
